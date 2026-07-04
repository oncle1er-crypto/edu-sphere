import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CalendarPlus, Coins, GraduationCap, Users2, Sparkles, CheckCircle2, Loader2, AlertTriangle, PlayCircle, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

type Annee = { id: string; libelle: string; debut: string; fin: string; decoupage: string; statut: string };
type BasculeRow = { etape: string; niveau: string; element: string; detail: string };

export default function SchoolsYearTransition() {
  const { ecoleId } = useEcoleId();
  const [annees, setAnnees] = useState<Annee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Step 1
  const [sourceId, setSourceId] = useState<string>("");
  const [libelle, setLibelle] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [decoupage, setDecoupage] = useState<"trimestre" | "semestre">("trimestre");
  const [targetId, setTargetId] = useState<string>("");

  // Step 2
  const [grilleMode, setGrilleMode] = useState<"reconduire" | "vide">("reconduire");

  // Step 4
  const [optEnsMat, setOptEnsMat] = useState(true);
  const [optCreneaux, setOptCreneaux] = useState(false);

  // Step 5
  const [optCantine, setOptCantine] = useState(true);
  const [optTransport, setOptTransport] = useState(true);

  // Step 3 — bascule
  const [basculeRows, setBasculeRows] = useState<BasculeRow[] | null>(null);
  const [basculeApplied, setBasculeApplied] = useState(false);
  const [confirmLib, setConfirmLib] = useState("");

  // Report
  const [report, setReport] = useState<Record<string, any>>({});

  const reload = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("annees_scolaires").select("*")
      .eq("ecole_id", ecoleId).order("debut", { ascending: false });
    setAnnees((data ?? []) as any);
    const active = (data ?? []).find((a: any) => a.statut === "active");
    if (active && !sourceId) setSourceId(active.id);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [ecoleId]);

  const source = useMemo(() => annees.find((a) => a.id === sourceId), [annees, sourceId]);
  const target = useMemo(() => annees.find((a) => a.id === targetId), [annees, targetId]);

  const bloquants = useMemo(
    () => (basculeRows ?? []).filter((r) => r.niveau === "bloquant"),
    [basculeRows],
  );
  const compteurs = useMemo(() => {
    const rows = basculeRows ?? [];
    const byEtape: Record<string, number> = {};
    for (const r of rows) byEtape[r.etape] = (byEtape[r.etape] ?? 0) + 1;
    return {
      total: rows.length,
      bloquants: bloquants.length,
      archivages: byEtape["archivage_parcours"] ?? 0,
      reinscriptions: byEtape["reinscription"] ?? 0,
      byEtape,
    };
  }, [basculeRows, bloquants]);

  // ---- Step 1: créer année ----
  const creerAnnee = async () => {
    if (!ecoleId || !libelle || !debut || !fin) {
      toast.error("Renseigne libellé, dates de début et fin"); return;
    }
    setBusy("creer");
    const { data, error } = await supabase
      .from("annees_scolaires")
      .insert({ ecole_id: ecoleId, libelle, debut, fin, decoupage, statut: "preparation" })
      .select().single();
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setTargetId(data.id);
    setReport((r) => ({ ...r, annee_creee: data.libelle }));
    toast.success(`Année ${data.libelle} créée`);
    await reload();
  };

  // ---- Step 2: grille ----
  const dupliquerGrille = async () => {
    if (!ecoleId || !sourceId || !targetId) return;
    setBusy("grille");
    const { data, error } = await supabase.rpc("dupliquer_grille_annee", {
      _ecole_id: ecoleId, _annee_source: sourceId, _annee_cible: targetId,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setReport((r) => ({ ...r, grille_lignes: data }));
    toast.success(`${data} ligne(s) de grille tarifaire dupliquée(s)`);
  };

  // ---- Step 3: bascule (simulation & application) ----
  const runBascule = async (dryRun: boolean) => {
    if (!ecoleId || !sourceId || !targetId) return;
    setBusy(dryRun ? "simuler" : "appliquer");
    const { data, error } = await (supabase.rpc as any)("cloturer_et_basculer_annee", {
      p_ecole_id: ecoleId,
      p_annee_source: sourceId,
      p_annee_cible: targetId,
      p_dry_run: dryRun,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as BasculeRow[];
    setBasculeRows(rows);
    if (!dryRun) {
      setBasculeApplied(true);
      setReport((r) => ({ ...r, bascule: { total: rows.length, bloquants: rows.filter(x => x.niveau === "bloquant").length } }));
      toast.success("Bascule appliquée : année source archivée, année cible activée");
      await reload();
    } else {
      const nb = rows.filter((r) => r.niveau === "bloquant").length;
      if (nb > 0) toast.warning(`${nb} bloquant(s) détecté(s) — corrige les décisions de fin d'année`);
      else toast.success("Simulation OK — aucun bloquant");
    }
  };

  // ---- Step 4: affectations ----
  const reconduire = async () => {
    if (!ecoleId || !sourceId || !targetId) return;
    setBusy("affect");
    const { data, error } = await supabase.rpc("reconduire_affectations_pedagogiques", {
      _ecole_id: ecoleId, _annee_source: sourceId, _annee_cible: targetId,
      _options: { enseignant_matieres: optEnsMat, creneaux: optCreneaux },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setReport((r) => ({ ...r, affectations: data }));
    toast.success("Affectations reconduites");
  };

  // ---- Step 5: abonnements ----
  const renouvelerAbos = async () => {
    if (!ecoleId || !sourceId || !targetId) return;
    const types: string[] = [];
    if (optCantine) types.push("cantine");
    if (optTransport) types.push("transport");
    if (types.length === 0) { toast.info("Sélectionne au moins un type"); return; }
    setBusy("abo");
    const { data, error } = await supabase.rpc("renouveler_abonnements", {
      _ecole_id: ecoleId, _annee_source: sourceId, _annee_cible: targetId, _types: types,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setReport((r) => ({ ...r, abonnements: data }));
    toast.success("Abonnements renouvelés");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const canApply = basculeRows !== null && bloquants.length === 0 && !basculeApplied && !!target && confirmLib.trim() === target.libelle;

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Sparkles className="h-5 w-5" />}
        title="Assistant — Clôture & ouverture d'année"
        description="Flux recommandé : (1) créer la nouvelle année, puis préparer la grille tarifaire (étape 2), les affectations pédagogiques (étape 4) et les abonnements de services (étape 5). L'étape 3 est l'action FINALE : elle clôture l'année source, réaffecte les élèves selon leurs décisions de fin d'année validées, archive la source et active la cible en une seule opération."
        hideSave
      >
        <FieldRow label="Année source (à clôturer)">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger><SelectValue placeholder="Choisir l'année source" /></SelectTrigger>
            <SelectContent>
              {annees.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.libelle} — {a.statut}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      {/* Étape 1 */}
      <SettingsSection
        icon={<CalendarPlus className="h-5 w-5" />}
        title="Étape 1 — Créer la nouvelle année"
        description="Définit le libellé, les dates et le découpage de la nouvelle année scolaire."
        hideSave
      >
        <FieldRow label="Libellé"><Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="2026 - 2027" /></FieldRow>
        <FieldRow label="Début"><Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></FieldRow>
        <FieldRow label="Fin"><Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></FieldRow>
        <FieldRow label="Découpage">
          <Select value={decoupage} onValueChange={(v: any) => setDecoupage(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="semestre">Semestre</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <div className="flex justify-end">
          <Button onClick={creerAnnee} disabled={busy === "creer"}>
            {busy === "creer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Créer l'année
          </Button>
        </div>
        {target && <Badge variant="secondary">Année cible : {target.libelle}</Badge>}
      </SettingsSection>

      {/* Étape 2 */}
      <SettingsSection
        icon={<Coins className="h-5 w-5" />}
        title="Étape 2 — Grille tarifaire"
        description="Reconduit la grille de tarifs scolaires de l'année source vers la nouvelle année."
        hideSave
      >
        <FieldRow label="Mode">
          <Select value={grilleMode} onValueChange={(v: any) => setGrilleMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reconduire">Reconduire à l'identique</SelectItem>
              <SelectItem value="vide">Repartir de zéro (configurer manuellement)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <div className="flex justify-end">
          <Button onClick={dupliquerGrille} disabled={busy === "grille" || !targetId || grilleMode === "vide"}>
            {busy === "grille" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            Dupliquer la grille
          </Button>
        </div>
        {report.grille_lignes != null && (
          <Badge variant="secondary">{report.grille_lignes} ligne(s) dupliquée(s)</Badge>
        )}
      </SettingsSection>

      {/* Étape 4 */}
      <SettingsSection
        icon={<GraduationCap className="h-5 w-5" />}
        title="Étape 4 — Affectations pédagogiques"
        description="Reconduit les affectations enseignants/matières et, en option, l'emploi du temps."
        hideSave
      >
        <FieldRow label="Enseignants ↔ matières/classes">
          <Checkbox checked={optEnsMat} onCheckedChange={(v) => setOptEnsMat(v === true)} />
        </FieldRow>
        <FieldRow label="Créneaux d'emploi du temps" hint="Recommandé : laisser décoché et régénérer avec l'assistant EDT.">
          <Checkbox checked={optCreneaux} onCheckedChange={(v) => setOptCreneaux(v === true)} />
        </FieldRow>
        <div className="flex justify-end">
          <Button onClick={reconduire} disabled={busy === "affect" || !targetId}>
            {busy === "affect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            Reconduire
          </Button>
        </div>
        {report.affectations && (
          <div className="text-sm">
            <Badge variant="secondary">{report.affectations.enseignant_matieres} affectation(s) enseignants</Badge>{" "}
            <Badge variant="outline">{report.affectations.creneaux} créneau(x)</Badge>
          </div>
        )}
      </SettingsSection>

      {/* Étape 5 */}
      <SettingsSection
        icon={<Sparkles className="h-5 w-5" />}
        title="Étape 5 — Renouvellement des services"
        description="Reconduit les abonnements cantine et transport actifs vers la nouvelle année."
        hideSave
      >
        <FieldRow label="Abonnements cantine">
          <Checkbox checked={optCantine} onCheckedChange={(v) => setOptCantine(v === true)} />
        </FieldRow>
        <FieldRow label="Abonnements transport">
          <Checkbox checked={optTransport} onCheckedChange={(v) => setOptTransport(v === true)} />
        </FieldRow>
        <div className="flex justify-end">
          <Button onClick={renouvelerAbos} disabled={busy === "abo" || !targetId}>
            {busy === "abo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Renouveler
          </Button>
        </div>
        {report.abonnements && (
          <div className="text-sm">
            <Badge variant="secondary">{report.abonnements.cantine} cantine</Badge>{" "}
            <Badge variant="outline">{report.abonnements.transport} transport</Badge>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pour les <strong>cartes scolaires</strong>, utilise la page Cartes → Renouvellement de masse.
        </p>
      </SettingsSection>

      {/* Étape 3 — Clôture & bascule (ACTION FINALE) */}
      <SettingsSection
        icon={<Users2 className="h-5 w-5" />}
        title="Étape 3 — Clôture & bascule des élèves (action finale)"
        description="Réaffecte les élèves selon leurs décisions de fin d'année validées, archive l'année source et active l'année cible. Toujours simuler avant d'appliquer."
        hideSave
      >
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p>
            Chaque élève actif de l'année source doit avoir une <strong>décision de fin d'année validée</strong> (statut <code>valide</code> ou <code>verrouille</code>).
            Sans cela, la bascule est bloquée.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => runBascule(true)}
            disabled={busy === "simuler" || !sourceId || !targetId || basculeApplied}
          >
            {busy === "simuler" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Simuler la bascule
          </Button>
        </div>

        {basculeRows && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant={bloquants.length > 0 ? "destructive" : "secondary"}>
                {compteurs.bloquants} bloquant(s)
              </Badge>
              <Badge variant="outline">{compteurs.archivages} archivage(s)</Badge>
              <Badge variant="outline">{compteurs.reinscriptions} réinscription(s)</Badge>
              <Badge variant="outline">{compteurs.total} ligne(s) au total</Badge>
            </div>

            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Étape</TableHead>
                    <TableHead className="w-24">Niveau</TableHead>
                    <TableHead>Élément</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...basculeRows]
                    .sort((a, b) => (a.etape.localeCompare(b.etape)) || (a.niveau.localeCompare(b.niveau)))
                    .map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.etape}</TableCell>
                        <TableCell>
                          <Badge variant={r.niveau === "bloquant" ? "destructive" : "secondary"}>
                            {r.niveau}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.element}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                      </TableRow>
                    ))}
                  {basculeRows.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">Aucune ligne retournée.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {bloquants.length > 0 ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Bascule impossible : {bloquants.length} élément(s) bloquant(s).</p>
                    <p className="text-muted-foreground">
                      Chaque élève actif doit avoir une décision de fin d'année VALIDÉE. Rends-toi sur la page dédiée pour saisir et valider les décisions manquantes.
                    </p>
                  </div>
                </div>
                <div>
                  <Button asChild variant="destructive" size="sm">
                    <Link to="/examens/fin-annee">
                      Ouvrir Examens → Fin d'année <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : basculeApplied ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p>Bascule appliquée. L'année source est archivée et l'année cible est active.</p>
              </div>
            ) : target ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  Action irréversible. Saisis exactement <strong>{target.libelle}</strong> pour confirmer.
                </div>
                <FieldRow label="Confirmation">
                  <Input value={confirmLib} onChange={(e) => setConfirmLib(e.target.value)} placeholder={target.libelle} />
                </FieldRow>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => runBascule(false)}
                    disabled={busy === "appliquer" || !canApply}
                  >
                    {busy === "appliquer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Appliquer la bascule définitive
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </SettingsSection>

      {/* Étape 6 — Récapitulatif */}
      <SettingsSection
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Étape 6 — Récapitulatif"
        description="L'activation de l'année cible et l'archivage de l'année source sont effectués automatiquement par la bascule de l'étape 3. Ce panneau récapitule l'état actuel."
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs uppercase">Année source</div>
            <div className="font-medium">{source?.libelle ?? "—"}</div>
            <Badge variant={source?.statut === "archivee" ? "secondary" : "outline"} className="mt-1">
              {source?.statut ?? "—"}
            </Badge>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs uppercase">Année cible</div>
            <div className="font-medium">{target?.libelle ?? "—"}</div>
            <Badge variant={target?.statut === "active" ? "default" : "outline"} className="mt-1">
              {target?.statut ?? "—"}
            </Badge>
          </div>
        </div>
        {Object.keys(report).length > 0 && (
          <>
            <Separator />
            <div className="text-xs space-y-1 font-mono">
              <div className="text-muted-foreground">Récapitulatif :</div>
              <pre className="bg-muted/30 p-2 rounded">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
