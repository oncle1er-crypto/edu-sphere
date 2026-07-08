import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reportRegistry, type ReportType } from "@/lib/reports/registry";

export interface ReportJob {
  id: string;
  ecole_id: string;
  user_id: string;
  type: ReportType;
  label: string;
  params: Record<string, any>;
  status: "queued" | "running" | "done" | "error";
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

type Listener = () => void;
let jobs: ReportJob[] = [];
const listeners = new Set<Listener>();
let running = false;
let started = false;
let currentUserId: string | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function emit() { for (const l of listeners) l(); }
function subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return jobs; }

async function loadJobs() {
  if (!currentUserId) return;
  const { data } = await supabase
    .from("report_jobs")
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: true })
    .limit(200);
  jobs = (data ?? []) as ReportJob[];
  emit();
}

async function requeueOrphans() {
  if (!currentUserId) return;
  await supabase
    .from("report_jobs")
    .update({ status: "queued", started_at: null })
    .eq("user_id", currentUserId)
    .eq("status", "running");
}

async function processNext() {
  if (running || !currentUserId) return;
  const { data } = await supabase
    .from("report_jobs")
    .select("*")
    .eq("user_id", currentUserId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  const job = (data?.[0] as ReportJob | undefined) ?? null;
  if (!job) return;
  running = true;

  await supabase
    .from("report_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", job.id);
  await loadJobs();

  try {
    const runner = reportRegistry[job.type];
    if (!runner) throw new Error(`Type de rapport inconnu : ${job.type}`);
    await runner(job.ecole_id, job.params);
    await supabase
      .from("report_jobs")
      .update({ status: "done", finished_at: new Date().toISOString(), error: null })
      .eq("id", job.id);
  } catch (e: any) {
    await supabase
      .from("report_jobs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: e?.message ?? String(e) })
      .eq("id", job.id);
  } finally {
    running = false;
    await loadJobs();
    setTimeout(processNext, 100);
  }
}

export async function enqueueReport(input: {
  ecoleId: string;
  type: ReportType;
  label: string;
  params: Record<string, any>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Non authentifié");
  const { error } = await supabase.from("report_jobs").insert({
    ecole_id: input.ecoleId,
    user_id: uid,
    type: input.type,
    label: input.label,
    params: input.params,
    status: "queued",
  });
  if (error) throw error;
  await loadJobs();
  processNext();
}

export async function removeJob(id: string) {
  await supabase.from("report_jobs").delete().eq("id", id).neq("status", "running");
  await loadJobs();
}

export async function clearFinishedJobs() {
  if (!currentUserId) return;
  await supabase
    .from("report_jobs")
    .delete()
    .eq("user_id", currentUserId)
    .in("status", ["done", "error"]);
  await loadJobs();
}

async function startWorker() {
  if (started) return;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  started = true;
  currentUserId = uid;
  await requeueOrphans();
  await loadJobs();

  realtimeChannel = supabase
    .channel(`report_jobs_${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "report_jobs", filter: `user_id=eq.${uid}` },
      () => {
        loadJobs();
        processNext();
      },
    )
    .subscribe();

  processNext();
}

export function useReportQueue(): ReportJob[] {
  useEffect(() => { startWorker(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
