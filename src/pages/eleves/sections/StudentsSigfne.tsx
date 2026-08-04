import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, ShieldCheck, AlertTriangle, XCircle, Copy, Loader2, Settings2, Save, Upload } from "lucide-react";
import { SigfneImportDialog } from "./SigfneImportDialog";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type ConfRow = {
  ecole_id: string;
  eleve_id: string;
  matricule: string | null;
  matricule_national: string | null;
  nom: string;
  prenom: string;
  classe_id: string | null;
  classe: string | null;
  statut_sigfne: "non_verifie" | "conforme" | "anomalie" | "sans_matricule";
  diagnostic: string | null;
  doublon_matricule: boolean | null;
  lieu_naissance?: string | null;
  date_naissance?: string | null;
};

type Stats = {
  total: number;
  conformes: number;
  sans_matricule: number;
  anomalies: number;
  doublons: number;
  taux_conformite: number;
};

const statutBadge = (s: ConfRow["statut_sigfne"]) => {
  switch (s) {
    case "conforme":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Conforme</Badge>;
    case "anomalie":
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Anomalie</Badge>;
    case "sans_matricule":
      return <Badge variant="destructive">Sans matricule</Badge>;
    default:
      return <Badge variant="secondary">Non vérifié</Badge>;
  }
};

export default function StudentsSigfne() {
  const { ecoleId, loading: loadingEcole } = useEcoleId();
  const { activeAnnee, loading: loadingAnnee } = useAcademicPeriod();
  const { isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<ConfRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState<string>("all");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [importOpen, setImportOpen] = useState(false);

  const computeStats = (list: ConfRow[]): Stats => {
    const total = list.length;
    const conformes = list.filter((r) => r.statut_sigfne === "conforme").length;
    const sans_matricule = list.filter((r) => r.statut_sigfne === "sans_matricule").length;
    const anomalies = list.filter((r) => r.statut_sigfne === "anomalie").length;
    const doublons = list.filter((r) => !!r.doublon_matricule).length;
    const taux_conformite = total > 0 ? (conformes / total) * 100 : 0;
    return { total, conformes, sans_matricule, anomalies, doublons, taux_conformite };
  };

  const fetchAll = useCallback(async () => {
    if (!ecoleId || !activeAnnee.id) return;
    setLoading(true);
    const [vRes, eRes] = await Promise.all([
      (supabase as any).from("v_conformite_sigfne").select("*").eq("ecole_id", ecoleId).eq("annee_id", activeAnnee.id).order("classe").order("nom"),
      supabase.from("eleves").select("id,lieu_naissance,date_naissance").eq("ecole_id", ecoleId).eq("annee_id", activeAnnee.id),
    ]);
    if (vRes.error) toast.error("Erreur chargement conformité: " + vRes.messageErreurBase(error));
    const extra = new Map<string, { lieu_naissance: string | null; date_naissance: string | null }>();
    (eRes.data ?? []).forEach((e: any) => extra.set(e.id, { lieu_naissance: e.lieu_naissance, date_naissance: e.date_naissance }));
    const merged: ConfRow[] = (vRes.data ?? []).map((r: any) => ({ ...r, ...(extra.get(r.eleve_id) ?? {}) }));
    setRows(merged);
    setStats(computeStats(merged));
    setLoading(false);
  }, [ecoleId, activeAnnee.id]);

  useEffect(() => { if (!loadingAnnee) fetchAll(); }, [fetchAll, loadingAnnee]);

  const classes = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => { if (r.classe_id && r.classe) set.set(r.classe_id, r.classe); });
    return Array.from(set.entries()).map(([id, nom]) => ({ id, nom }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classeFilter !== "all" && r.classe_id !== classeFilter) return false;
      if (statutFilter !== "all" && r.statut_sigfne !== statutFilter) return false;
      if (q && !(`${r.nom} ${r.prenom}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, classeFilter, statutFilter]);

  const saveField = async (eleveId: string, field: "matricule_national" | "lieu_naissance" | "date_naissance", value: string) => {
    if (!ecoleId || !activeAnnee.id) return;
    setSavingId(eleveId + field);
    const { error } = await supabase.from("eleves").update({ [field]: value || null } as any).eq("id", eleveId);
    setSavingId(null);
    if (error) { toast.error("Erreur: " + messageErreurBase(error)); return; }
    // Re-fetch just this row
    const vRes = await (supabase as any).from("v_conformite_sigfne").select("*").eq("ecole_id", ecoleId).eq("annee_id", activeAnnee.id).eq("eleve_id", eleveId).maybeSingle();
    setRows((prev) => {
      const next = prev.map((r) => r.eleve_id === eleveId
        ? { ...r, ...(vRes.data ?? {}), lieu_naissance: r.lieu_naissance, date_naissance: r.date_naissance, [field]: value || null }
        : r);
      setStats(computeStats(next));
      return next;
    });
    toast.success("Enregistré");
  };

  const focusNext = (currentEleveId: string) => {
    const ids = filtered.map((r) => r.eleve_id);
    const idx = ids.indexOf(currentEleveId);
    const nextId = ids[idx + 1];
    if (nextId) setTimeout(() => inputRefs.current[nextId]?.focus(), 0);
  };

  const handleExport = async () => {
    if (!ecoleId || !activeAnnee.id) return;
    const nonConformes = (stats?.total ?? 0) - (stats?.conformes ?? 0);
    if (nonConformes > 0) toast.warning(`${nonConformes} élève(s) non conforme(s) seront exclus de l'export.`);
    const { data, error } = await (supabase as any).from("v_export_sigfne_eleves").select("*").eq("ecole_id", ecoleId).eq("annee_id", activeAnnee.id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    const cols = ["MATRICULE","NOM","PRENOMS","DATE_NAISSANCE","LIEU_NAISSANCE","SEXE","NATIONALITE","CLASSE"];
    const escape = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(";")];
    (data ?? []).forEach((row: any) => lines.push(cols.map((c) => escape(row[c])).join(";")));
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url; a.download = `export_sigfne_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${(data ?? []).length} élève(s) exporté(s)`);
  };

  if (loadingEcole) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold font-display">Conformité SIGFNE</h2>
          <p className="text-sm text-muted-foreground">Contrôle et mise en conformité des matricules nationaux pour l'export SIGFNE.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> Importer (CSV)</Button>
          <Button onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Exporter (CSV)</Button>
        </div>
      </div>

      <SigfneImportDialog open={importOpen} onOpenChange={setImportOpen} ecoleId={ecoleId} onImported={fetchAll} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatMini title="Taux de conformité" value={stats ? `${Math.round(stats.taux_conformite * 100) / 100}%` : "—"} tone="primary" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatMini title="Conformes" value={stats?.conformes ?? "—"} tone="success" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatMini title="Sans matricule" value={stats?.sans_matricule ?? "—"} tone="destructive" icon={<XCircle className="h-4 w-4" />} />
        <StatMini title="Anomalies" value={stats?.anomalies ?? "—"} tone="warning" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatMini title="Doublons" value={stats?.doublons ?? "—"} tone="destructive" icon={<Copy className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <CardTitle className="text-base font-display">Élèves ({filtered.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Rechercher nom…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
              <Select value={classeFilter} onValueChange={setClasseFilter}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes classes</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statutFilter} onValueChange={setStatutFilter}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Diagnostic" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous diagnostics</SelectItem>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="anomalie">Anomalie</SelectItem>
                  <SelectItem value="sans_matricule">Sans matricule</SelectItem>
                  <SelectItem value="non_verifie">Non vérifié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Matricule national</TableHead>
                  <TableHead>Compléments</TableHead>
                  <TableHead>Diagnostic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const diag = (r.diagnostic ?? "").toLowerCase();
                  const needsLieu = diag.includes("lieu");
                  const needsDate = diag.includes("naissance") && diag.includes("date");
                  return (
                    <TableRow key={r.eleve_id}>
                      <TableCell className="font-medium">{r.nom}</TableCell>
                      <TableCell>{r.prenom}</TableCell>
                      <TableCell>{r.classe ?? "—"}</TableCell>
                      <TableCell>
                        <Input
                          ref={(el) => { inputRefs.current[r.eleve_id] = el; }}
                          defaultValue={r.matricule_national ?? ""}
                          className="h-8 w-44"
                          placeholder="Matricule…"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (r.matricule_national ?? "")) saveField(r.eleve_id, "matricule_national", v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Tab") {
                              e.preventDefault();
                              const v = (e.target as HTMLInputElement).value.trim();
                              if (v !== (r.matricule_national ?? "")) saveField(r.eleve_id, "matricule_national", v).then(() => focusNext(r.eleve_id));
                              else focusNext(r.eleve_id);
                            }
                          }}
                        />
                        {savingId === r.eleve_id + "matricule_national" && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {needsLieu && (
                            <Input
                              defaultValue={r.lieu_naissance ?? ""}
                              className="h-7 w-40"
                              placeholder="Lieu naissance"
                              onBlur={(e) => { const v = e.target.value.trim(); if (v !== (r.lieu_naissance ?? "")) saveField(r.eleve_id, "lieu_naissance", v); }}
                            />
                          )}
                          {needsDate && (
                            <Input
                              type="date"
                              defaultValue={r.date_naissance ?? ""}
                              className="h-7 w-40"
                              onBlur={(e) => { const v = e.target.value; if (v !== (r.date_naissance ?? "")) saveField(r.eleve_id, "date_naissance", v); }}
                            />
                          )}
                          {!needsLieu && !needsDate && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {statutBadge(r.statut_sigfne)}
                          {r.doublon_matricule && <Badge variant="destructive" className="w-fit">Doublon</Badge>}
                          {r.diagnostic && <span className="text-xs text-muted-foreground">{r.diagnostic}</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun élève</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && <SigfneParamsPanel ecoleId={ecoleId} />}
    </div>
  );
}

function StatMini({ title, value, tone, icon }: { title: string; value: any; tone: "primary" | "success" | "warning" | "destructive"; icon: React.ReactNode }) {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold font-display">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-full grid place-items-center ${toneCls}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function SigfneParamsPanel({ ecoleId }: { ecoleId: string | null }) {
  const [codeEtab, setCodeEtab] = useState("");
  const [drena, setDrena] = useState("");
  const [regex, setRegex] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      const { data } = await (supabase as any).from("parametres_sigfne").select("*").eq("ecole_id", ecoleId).maybeSingle();
      if (data) {
        setCodeEtab(data.code_etablissement ?? "");
        setDrena(data.drena ?? "");
        setRegex(data.regex_matricule ?? "");
      }
      setLoading(false);
    })();
  }, [ecoleId]);

  const handleSave = async () => {
    if (!ecoleId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("parametres_sigfne").upsert({
      ecole_id: ecoleId, code_etablissement: codeEtab, drena, regex_matricule: regex,
    }, { onConflict: "ecole_id" });
    setSaving(false);
    if (error) toast.error(messageErreurBase(error)); else toast.success("Paramètres enregistrés");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2"><Settings2 className="h-4 w-4" /> Paramètres SIGFNE</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Code établissement</Label><Input value={codeEtab} onChange={(e) => setCodeEtab(e.target.value)} /></div>
            <div className="space-y-1"><Label>DRENA</Label><Input value={drena} onChange={(e) => setDrena(e.target.value)} /></div>
            <div className="space-y-1"><Label>Regex matricule</Label><Input value={regex} onChange={(e) => setRegex(e.target.value)} placeholder="^[0-9]{10}$" /></div>
            <div className="md:col-span-3">
              <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
