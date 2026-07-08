import { useSyncExternalStore } from "react";

export type ReportJobStatus = "queued" | "running" | "done" | "error";

export interface ReportJob {
  id: string;
  label: string;
  status: ReportJobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  run: () => Promise<void>;
}

type Listener = () => void;

const jobs: ReportJob[] = [];
const listeners = new Set<Listener>();
let running = false;

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return jobs;
}

async function tick() {
  if (running) return;
  const next = jobs.find((j) => j.status === "queued");
  if (!next) return;
  running = true;
  next.status = "running";
  next.startedAt = Date.now();
  emit();
  try {
    await next.run();
    next.status = "done";
  } catch (e: any) {
    next.status = "error";
    next.error = e?.message ?? String(e);
  } finally {
    next.finishedAt = Date.now();
    running = false;
    emit();
    // schedule next micro-task so UI paints between jobs
    setTimeout(tick, 50);
  }
}

export function enqueueReport(label: string, run: () => Promise<void>): string {
  const id = crypto.randomUUID();
  jobs.push({ id, label, status: "queued", createdAt: Date.now(), run });
  emit();
  setTimeout(tick, 0);
  return id;
}

export function clearFinishedJobs() {
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (jobs[i].status === "done" || jobs[i].status === "error") jobs.splice(i, 1);
  }
  emit();
}

export function removeJob(id: string) {
  const i = jobs.findIndex((j) => j.id === id);
  if (i >= 0 && jobs[i].status !== "running") {
    jobs.splice(i, 1);
    emit();
  }
}

export function useReportQueue(): ReportJob[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
