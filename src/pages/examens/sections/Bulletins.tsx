import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_BULLETIN } from "@/components/help";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GraduationCap, Download, Loader2, FileDown, Eye, Printer, AlertTriangle, CheckCircle2,
  Send, Pencil, Lock, LockOpen,
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";
import {
  generateBulletinPDF,
  type BulletinSubjectRow,
  type BulletinData,
} from "@/lib/generateBulletinPDF";
import {
  appreciationMatiere, appreciationGenerale, mentionPrincipale, decisionAuto, categorieBulletin,
} from "@/lib/bulletinHelpers";
import { useBulletinScolariteStatus } from "@/hooks/useBulletinScolariteStatus";
import { BulletinSendDialog } from "@/components/bulletins/BulletinSendDialog";
import { BulletinOverrideDialog } from "@/components/bulletins/BulletinOverrideDialog";

interface BulletinRow {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  moyenne: number;
  rang: number;
  totalEleves: number;
  mention: string;
  warnings: string[];
}

interface Periode { id: string; nom: string; statut: string; }

const mentionTone: Record<string, string> = {
  "Félicitations": "bg-accent/15 text-primary",
  "Encouragements": "bg-primary/15 text-primary",
  "Tableau d'honneur": "bg-blue-500/15 text-blue-600",
  "Résultat satisfaisant": "bg-orange-500/15 text-orange-600",
  "Doit redoubler d'efforts": "bg-destructive/15 text-destructive",
};

export default function Bulletins() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { classes } = useClasses();
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [rows, setRows] = useState<BulletinRow[]>([]);
  const [classWarnings, setClassWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [previewRow, setPreviewRow] = useState<BulletinRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ---- Audit / overrides / verrouillage / envoi
  type AuditRow = {
    id: string; eleve_id: string; locked: boolean; version: number;
    appreciation_generale: string | null; decision_conseil: string | null; decision_detail: string | null;
    sent_at: string | null;
  };
  const [auditMap, setAuditMap] = useState<Record<string, AuditRow>>({});
  const [overrideRow, setOverrideRow] = useState<BulletinRow | null>(null);
  const [sendRow, setSendRow] = useState<BulletinRow | null>(null);
  const [sendPdfBlob, setSendPdfBlob] = useState<Blob | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);

  const eleveIds = useMemo(() => rows.map((r) => r.eleve_id), [rows]);
  const { statusMap: scolariteStatus } = useBulletinScolariteStatus(ecoleId, eleveIds);

  // Charge la dernière version d'audit par élève pour la période/classe
  const refreshAudit = useCallback(async () => {
    if (!ecoleId || !selectedClasse || !selectedPeriode || eleveIds.length === 0) {
      setAuditMap({}); return;
    }
    const { data } = await supabase
      .from("bulletins_audit")
      .select("id, eleve_id, locked, version, appreciation_generale, decision_conseil, decision_detail, sent_at")
      .eq("ecole_id", ecoleId)
      .eq("periode_id", selectedPeriode)
      .eq("classe_id", selectedClasse)
      .in("eleve_id", eleveIds)
      .order("version", { ascending: false });
    const map: Record<string, AuditRow> = {};
    for (const r of (data ?? []) as AuditRow[]) {
      if (!map[r.eleve_id]) map[r.eleve_id] = r; // garde la plus récente version
    }
    setAuditMap(map);
  }, [ecoleId, selectedClasse, selectedPeriode, eleveIds.join("|")]); // eslint-disable-line

  useEffect(() => { refreshAudit(); }, [refreshAudit]);


  // Charger périodes de l'année active
  useEffect(() => {
    (async () => {
      if (!ecoleId || !anneeId) return;
      const { data } = await supabase
        .from("periodes")
        .select("id, nom, statut")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId)
        .order("debut");
      const list = (data ?? []) as Periode[];
      setPeriodes(list);
      // pré-sélection : période active sinon première
      if (list.length && !selectedPeriode) {
        const active = list.find((p) => p.statut === "active") ?? list[0];
        setSelectedPeriode(active.id);
      }
    })();
  }, [ecoleId, anneeId]); // eslint-disable-line

  const periodeNom = useMemo(
    () => periodes.find((p) => p.id === selectedPeriode)?.nom ?? "Trimestre",
    [periodes, selectedPeriode]
  );

  // Calcul moyennes + rangs pour la classe + trimestre
  const computeBulletins = useCallback(async () => {
    if (!ecoleId || !selectedClasse || !selectedPeriode) return;
    setLoading(true);
    setClassWarnings([]);

    // Toutes les notes de la classe pour la période
    const { data: notesData } = await supabase
      .from("notes")
      .select("note, absent, eleve_id, eleves!inner(nom, prenom, matricule, classe_id), evaluations!inner(coefficient, matiere_id, periode_id, classe_id)")
      .eq("ecole_id", ecoleId)
      .eq("eleves.classe_id", selectedClasse)
      .eq("evaluations.classe_id", selectedClasse)
      .eq("evaluations.periode_id", selectedPeriode);

    // Liste élèves de la classe
    const { data: elevesClasse } = await supabase
      .from("eleves")
      .select("id, nom, prenom, matricule")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse)
      .order("nom");

    // Matières affectées à la classe
    const { data: classeMat } = await supabase
      .from("classe_matieres")
      .select("matiere_id, matieres(nom, coefficient)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse);

    const expectedMatieres = new Set<string>((classeMat ?? []).map((m: any) => m.matiere_id));

    const warnings: string[] = [];
    if (!notesData || notesData.length === 0) {
      warnings.push("Aucune note saisie pour cette période et cette classe.");
    }
    if (expectedMatieres.size === 0) {
      warnings.push("Aucune matière n'est rattachée à cette classe.");
    }
    setClassWarnings(warnings);

    // Agrégation par élève
    type Agg = { sum: number; coefSum: number; matieres: Set<string>; rawCoefByMat: Map<string, number>; sumByMat: Map<string, number> };
    const map = new Map<string, Agg>();
    for (const n of (notesData ?? []) as any[]) {
      if (n.absent) continue;
      if (n.note === null || n.note === undefined) continue;
      const eid = n.eleve_id;
      const note = Number(n.note);
      const coef = Number(n.evaluations?.coefficient ?? 1);
      const mid = n.evaluations?.matiere_id;
      if (!map.has(eid)) {
        map.set(eid, { sum: 0, coefSum: 0, matieres: new Set(), rawCoefByMat: new Map(), sumByMat: new Map() });
      }
      const a = map.get(eid)!;
      a.sum += note * coef;
      a.coefSum += coef;
      if (mid) {
        a.matieres.add(mid);
        a.sumByMat.set(mid, (a.sumByMat.get(mid) ?? 0) + note * coef);
        a.rawCoefByMat.set(mid, (a.rawCoefByMat.get(mid) ?? 0) + coef);
      }
    }

    const list: BulletinRow[] = (elevesClasse ?? []).map((e: any) => {
      const a = map.get(e.id);
      const moy = a && a.coefSum > 0 ? a.sum / a.coefSum : 0;
      const w: string[] = [];
      if (!a) w.push("Aucune note");
      else {
        const missing = [...expectedMatieres].filter((m) => !a.matieres.has(m)).length;
        if (missing > 0) w.push(`${missing} matière(s) sans note`);
      }
      return {
        eleve_id: e.id, nom: e.nom, prenom: e.prenom, matricule: e.matricule,
        moyenne: moy, rang: 0, totalEleves: elevesClasse?.length ?? 0,
        mention: mentionPrincipale(moy), warnings: w,
      };
    });

    list.sort((a, b) => b.moyenne - a.moyenne);
    list.forEach((r, i) => { r.rang = i + 1; });
    setRows(list);
    setLoading(false);
  }, [ecoleId, selectedClasse, selectedPeriode]);

  useEffect(() => { computeBulletins(); }, [computeBulletins]);

  // Construction PDF pour un élève
  const buildPDFForStudent = async (row: BulletinRow): Promise<ReturnType<typeof generateBulletinPDF> | null> => {
    if (!ecoleId || !selectedClasse || !selectedPeriode) return null;

    // École complète
    const { data: ecole } = await supabase
      .from("ecoles")
      .select("nom, devise, adresse, telephone, email, code, logo_url, directeur")
      .eq("id", ecoleId).single();

    // Élève complet
    const { data: eleve } = await supabase
      .from("eleves")
      .select("date_naissance, lieu_naissance, nationalite, sexe, photo_url")
      .eq("id", row.eleve_id).single();

    const classeObj = classes.find((c) => c.id === selectedClasse);
    const className = classeObj?.nom ?? "—";

    const { data: annee } = await supabase
      .from("annees_scolaires").select("libelle").eq("id", anneeId ?? "").maybeSingle();

    // Effectif classe
    const { count: effectifClasse } = await supabase
      .from("eleves").select("id", { count: "exact", head: true })
      .eq("ecole_id", ecoleId).eq("classe_id", selectedClasse);

    // Notes de l'élève pour la période
    const { data: studentNotes } = await supabase
      .from("notes")
      .select("note, absent, evaluations!inner(matiere_id, coefficient, periode_id, classe_id, enseignant_id, matieres(nom, categorie, coefficient), enseignants(nom, prenom))")
      .eq("ecole_id", ecoleId)
      .eq("eleve_id", row.eleve_id)
      .eq("evaluations.periode_id", selectedPeriode)
      .eq("evaluations.classe_id", selectedClasse);

    // Notes classe pour moyennes & rangs par matière
    const { data: allClassNotes } = await supabase
      .from("notes")
      .select("note, absent, eleve_id, evaluations!inner(matiere_id, coefficient, periode_id, classe_id)")
      .eq("ecole_id", ecoleId)
      .eq("evaluations.periode_id", selectedPeriode)
      .eq("evaluations.classe_id", selectedClasse);

    // Moy par matière (classe) + moy/élève/matière pour rangs
    const classByMat = new Map<string, number[]>();
    const studentMatByEleve = new Map<string, Map<string, { sum: number; coef: number }>>();
    for (const n of (allClassNotes ?? []) as any[]) {
      if (n.absent) continue;
      if (n.note === null) continue;
      const mid = n.evaluations?.matiere_id;
      const coef = Number(n.evaluations?.coefficient ?? 1);
      if (!mid) continue;
      if (!classByMat.has(mid)) classByMat.set(mid, []);
      classByMat.get(mid)!.push(Number(n.note));
      const eid = n.eleve_id;
      if (!studentMatByEleve.has(eid)) studentMatByEleve.set(eid, new Map());
      const inner = studentMatByEleve.get(eid)!;
      if (!inner.has(mid)) inner.set(mid, { sum: 0, coef: 0 });
      const o = inner.get(mid)!;
      o.sum += Number(n.note) * coef; o.coef += coef;
    }

    // Agrégation pour l'élève courant
    const matAgg = new Map<string, { nom: string; categorie: string | null; sumNotes: number; sumCoef: number; prof: string }>();
    for (const n of (studentNotes ?? []) as any[]) {
      if (n.absent) continue;
      if (n.note === null) continue;
      const ev = n.evaluations;
      const mid = ev?.matiere_id;
      const mnom = ev?.matieres?.nom ?? "Matière";
      const mcat = ev?.matieres?.categorie ?? null;
      const coefEval = Number(ev?.coefficient ?? 1);
      const prof = ev?.enseignants ? `${ev.enseignants.nom ?? ""} ${ev.enseignants.prenom ?? ""}`.trim() : "";
      if (!matAgg.has(mid)) matAgg.set(mid, { nom: mnom, categorie: mcat, sumNotes: 0, sumCoef: 0, prof });
      const e = matAgg.get(mid)!;
      e.sumNotes += Number(n.note) * coefEval;
      e.sumCoef += coefEval;
      if (!e.prof && prof) e.prof = prof;
    }

    // Construction des lignes en utilisant le coefficient officiel de la matière
    const coefByMat = new Map<string, number>();
    {
      const { data: cmat } = await supabase
        .from("classe_matieres")
        .select("matiere_id, matieres(coefficient)")
        .eq("ecole_id", ecoleId).eq("classe_id", selectedClasse);
      for (const c of (cmat ?? []) as any[]) {
        coefByMat.set(c.matiere_id, Number(c.matieres?.coefficient ?? 1));
      }
    }

    const matieres: BulletinSubjectRow[] = Array.from(matAgg.entries()).map(([mid, v]) => {
      const moy = v.sumCoef > 0 ? v.sumNotes / v.sumCoef : null;
      const coef = coefByMat.get(mid) ?? 1;
      const classNotes = classByMat.get(mid) ?? [];
      const moyClasse = classNotes.length > 0 ? classNotes.reduce((a, b) => a + b, 0) / classNotes.length : null;

      // Rang matière de l'élève
      let rangMat: string | null = null;
      if (moy !== null) {
        const ranking = Array.from(studentMatByEleve.entries())
          .map(([eid, mmap]) => {
            const o = mmap.get(mid);
            return { eid, m: o && o.coef > 0 ? o.sum / o.coef : -1 };
          })
          .filter((x) => x.m >= 0)
          .sort((a, b) => b.m - a.m);
        const idx = ranking.findIndex((x) => x.eid === row.eleve_id);
        if (idx >= 0) rangMat = idx === 0 ? "1er" : `${idx + 1}e`;
      }

      return {
        matiere: v.nom,
        categorie: v.categorie,
        note: moy,
        coefficient: coef,
        moyenne_classe: moyClasse,
        rang_matiere: rangMat,
        appreciation: appreciationMatiere(moy),
        professeur: v.prof ? v.prof.toUpperCase() : "-",
      };
    });

    // Statistiques classe
    const allMoy = rows.map((r) => r.moyenne).filter((m) => m > 0);
    const moyClasse = allMoy.length ? allMoy.reduce((a, b) => a + b, 0) / allMoy.length : 0;
    const moyMax = allMoy.length ? Math.max(...allMoy) : 0;
    const moyMin = allMoy.length ? Math.min(...allMoy) : 0;
    const tauxReussite = allMoy.length ? (allMoy.filter((m) => m >= 10).length / allMoy.length) * 100 : 0;

    // Absences/retards de l'élève pour la période
    const periodeObj = periodes.find((p) => p.id === selectedPeriode);
    let assiduite = { heures_absence: 0, absences_justifiees: 0, absences_non_justifiees: 0, retards: 0 };
    if (periodeObj) {
      const { data: presQuery } = await supabase
        .from("presences")
        .select("statut")
        .eq("ecole_id", ecoleId).eq("eleve_id", row.eleve_id);
      const list = (presQuery ?? []) as any[];
      assiduite.absences_justifiees = list.filter((p) => p.statut === "absent_justifie").length;
      assiduite.absences_non_justifiees = list.filter((p) => p.statut === "absent" || p.statut === "absent_non_justifie").length;
      assiduite.retards = list.filter((p) => p.statut === "retard").length;
      assiduite.heures_absence = assiduite.absences_justifiees + assiduite.absences_non_justifiees;
    }

    const moy = row.moyenne;
    const decisions = {
      appreciation_generale: appreciationGenerale(moy),
      tableau_honneur: moy >= 12,
      encouragements: moy >= 14,
      felicitations: moy >= 16,
      avertissement_travail: moy < 8 && moy > 0,
      avertissement_conduite: false,
      blame_travail: false,
      blame_conduite: false,
      decision: decisionAuto(moy),
      decision_detail: moy >= 10 ? "Passe en classe superieure" : "À reconsiderer en fin d'annee",
    };

    const verification = `BULLETIN|${row.matricule}|${className}|${periodeNom}|${(annee?.libelle ?? "")}|${moy.toFixed(2)}|${row.rang}`;

    const data: BulletinData = {
      ecole: {
        nom: ecole?.nom ?? "ETABLISSEMENT",
        devise: ecole?.devise ?? "",
        adresse: ecole?.adresse ?? "",
        telephone: ecole?.telephone ?? "",
        email: ecole?.email ?? "",
        code: ecole?.code ?? "",
        logo_url: ecole?.logo_url ?? null,
        direction_regionale: "Direction Regionale d'Abidjan",
      },
      eleve: {
        nom: row.nom, prenom: row.prenom, matricule: row.matricule,
        date_naissance: eleve?.date_naissance ?? "",
        lieu_naissance: eleve?.lieu_naissance ?? "",
        nationalite: eleve?.nationalite ?? "Ivoirienne",
        sexe: eleve?.sexe ?? "",
        photo_url: eleve?.photo_url ?? null,
        redoublant: false,
        regime: "Externe",
      },
      classe: className,
      effectif_classe: effectifClasse ?? 0,
      annee: annee?.libelle ?? "",
      periode: periodeNom,
      matieres,
      moyenne_generale: moy,
      rang: row.rang,
      total_eleves: row.totalEleves,
      mention: row.mention,
      assiduite,
      resultats_classe: {
        moyenne_classe: moyClasse,
        moyenne_max: moyMax,
        moyenne_min: moyMin,
        taux_reussite: tauxReussite,
      },
      decisions,
      signataires: {
        professeur_principal: "—",
        chef_etablissement: ecole?.directeur ?? "—",
      },
      verification_code: verification,
    };

    return generateBulletinPDF(data);
  };

  const handleDownloadPDF = async (row: BulletinRow) => {
    setGeneratingId(row.eleve_id);
    try {
      const doc = await buildPDFForStudent(row);
      if (doc) {
        doc.save(`Bulletin_${row.nom}_${row.prenom}.pdf`);
        toast.success(`Bulletin de ${row.nom} ${row.prenom} téléchargé.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du bulletin.");
    } finally { setGeneratingId(null); }
  };

  const handlePreview = async (row: BulletinRow) => {
    setPreviewRow(row); setPreviewLoading(true); setPreviewUrl(null);
    try {
      const doc = await buildPDFForStudent(row);
      if (doc) setPreviewUrl(doc.output("dataurlstring"));
    } catch (err) {
      console.error(err);
      toast.error("Aperçu impossible.");
    } finally { setPreviewLoading(false); }
  };

  const handlePrint = async (row: BulletinRow) => {
    const doc = await buildPDFForStudent(row);
    if (!doc) return;
    const blobUrl = doc.output("bloburl");
    const w = window.open(blobUrl, "_blank");
    if (w) setTimeout(() => w.print(), 800);
  };

  const handleDownloadAll = async () => {
    setGeneratingAll(true);
    try {
      for (const row of rows) {
        const doc = await buildPDFForStudent(row);
        if (doc) doc.save(`Bulletin_${row.nom}_${row.prenom}.pdf`);
      }
      toast.success(`${rows.length} bulletin(s) téléchargé(s).`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération des bulletins.");
    } finally { setGeneratingAll(false); }
  };

  const totalWarnings = rows.reduce((acc, r) => acc + r.warnings.length, 0);

  return (
    <SettingsSection
      icon={<GraduationCap className='h-5 w-5' />}
      title="Bulletins de notes trimestriels"
      description="Génération officielle des bulletins par classe et trimestre."
    >
      <HelpBanner storageKey="exams-bulletins" title="Générer les bulletins">
        Sélectionnez une classe et un trimestre pour visualiser les moyennes, classements et mentions.
        Téléchargez le bulletin PDF individuel ou la liasse complète de la classe.
      </HelpBanner>
      <StatusLegend title="Statuts d'un bulletin" items={STATUTS_BULLETIN} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <Label className="text-xs">Trimestre</Label>
          <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un trimestre" /></SelectTrigger>
            <SelectContent>
              {periodes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Classe</Label>
          <Select value={selectedClasse} onValueChange={setSelectedClasse}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          {rows.length > 0 && (
            <Button variant="default" className="w-full gap-2" disabled={generatingAll} onClick={handleDownloadAll}>
              {generatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Télécharger toute la classe ({rows.length})
            </Button>
          )}
        </div>
      </div>

      {(classWarnings.length > 0 || totalWarnings > 0) && rows.length > 0 && (
        <Alert variant="default" className="mb-4 border-orange-500/50">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle>Contrôles avant impression</AlertTitle>
          <AlertDescription>
            <ul className="ml-4 list-disc text-sm">
              {classWarnings.map((w, i) => (<li key={i}>{w}</li>))}
              {totalWarnings > 0 && (
                <li>{totalWarnings} avertissement(s) sur les élèves ci-dessous.</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && classWarnings.length === 0 && totalWarnings === 0 && (
        <Alert className="mb-4 border-primary/40 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Données complètes</AlertTitle>
          <AlertDescription>Tous les élèves de la classe ont des notes saisies pour cette période.</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !selectedClasse || !selectedPeriode ? (
        <p className="text-center text-muted-foreground py-8">Sélectionnez un trimestre et une classe.</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Aucun élève dans cette classe.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rang</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Mention</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.eleve_id}>
                  <TableCell className="font-semibold">{b.rang}</TableCell>
                  <TableCell className="font-mono text-xs">{b.matricule}</TableCell>
                  <TableCell className="font-medium">{b.nom} {b.prenom}</TableCell>
                  <TableCell className="font-bold text-primary">{b.moyenne.toFixed(2).replace(".", ",")}</TableCell>
                  <TableCell>
                    <Badge className={mentionTone[b.mention] || ""} variant="secondary">{b.mention}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.warnings.length === 0 ? (
                      <Badge variant="outline" className="border-primary/40 text-primary">OK</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />{b.warnings.join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePreview(b)} title="Aperçu">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrint(b)} title="Imprimer">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={generatingId === b.eleve_id} onClick={() => handleDownloadPDF(b)} title="Télécharger PDF">
                        {generatingId === b.eleve_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog aperçu PDF */}
      <Dialog open={!!previewRow} onOpenChange={(o) => { if (!o) { setPreviewRow(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Aperçu — {previewRow?.nom} {previewRow?.prenom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border bg-muted/30">
            {previewLoading || !previewUrl ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <iframe src={previewUrl} className="h-full w-full" title="Aperçu bulletin" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
