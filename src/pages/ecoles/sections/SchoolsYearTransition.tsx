import { useEffect, useMemo, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarPlus, Coins, GraduationCap, Users2, Sparkles, CheckCircle2, Loader2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

type Annee = { id: string; libelle: string; debut: string; fin: string; decoupage: string; statut: string };

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

  // ---- Step 3: promotion ----
  const promouvoir = async () => {
    if (!ecoleId || !sourceId || !targetId) return;
    setBusy("promotion");
    const { data, error } = await supabase.rpc("promouvoir_eleves_annee", {
      _ecole_id: ecoleId, _annee_source: sourceId, _annee_cible: targetId,
      _mapping: {}, _mode: "auto",
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setReport((r) => ({ ...r, promotion: data }));
    toast.success(`${(data as any)?.promus ?? 0} élève(s) promu(s)`);
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

  // ---- Step 6: activation ----
  const [confirmLib, setConfirmLib] = useState("");
  const activer = async () => {
    if (!ecoleId || !targetId || !target) return;
    if (confirmLib.trim() !== target.libelle) {
      toast.error("Le libellé saisi ne correspond pas"); return;
    }
    setBusy("activer");
    const { error } = await supabase.rpc("activer_annee_scolaire", {
      _ecole_id: ecoleId, _annee_id: targetId,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Année ${target.libelle} activée`);
    await reload();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Sparkles className="h-5 w-5" />}
        title="Assistant — Clôture & ouverture d'année"
        description="Guide pas-à-pas pour clôturer l'année en cours et préparer la suivante sans rien casser."
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

      {/* Étape 3 */}
      <SettingsSection
        icon={<Users2 className="h-5 w-5" />}
        title="Étape 3 — Promotion des élèves"
        description="Crée les fiches élèves dans la nouvelle année au statut « pré-inscrit », en conservant la classe (à ajuster ensuite par classe supérieure)."
        hideSave
      >
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p>Les élèves <strong>exclus</strong> ou <strong>transférés</strong> sont ignorés. L'historique est consigné dans <code>parcours_scolaire</code>.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={promouvoir} disabled={busy === "promotion" || !targetId}>
            {busy === "promotion" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
            Promouvoir les élèves
          </Button>
        </div>
        {report.promotion && (
          <div className="text-sm">
            <Badge variant="secondary">{report.promotion.promus} promu(s)</Badge>{" "}
            <Badge variant="outline">{report.promotion.ignores} ignoré(s)</Badge>
          </div>
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

      {/* Étape 6 */}
      <SettingsSection
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Étape 6 — Activation"
        description="Verrouille l'ancienne année et bascule la nouvelle en active. Action irréversible côté UI."
        hideSave
      >
        {target ? (
          <>
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Saisis exactement <strong>{target.libelle}</strong> pour confirmer.
            </div>
            <FieldRow label="Confirmation">
              <Input value={confirmLib} onChange={(e) => setConfirmLib(e.target.value)} placeholder={target.libelle} />
            </FieldRow>
            <div className="flex justify-end">
              <Button variant="destructive" onClick={activer} disabled={busy === "activer" || confirmLib !== target.libelle}>
                {busy === "activer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Activer {target.libelle}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Crée d'abord la nouvelle année à l'étape 1.</p>
        )}
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
