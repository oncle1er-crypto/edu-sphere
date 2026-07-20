import { useMemo, useState } from "react";
import { BarChart3, Download, FileText, Eye, Loader2, Filter, X } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData, fcfa } from "@/pages/finances/useFinanceData";
import { useDepenses } from "@/hooks/useDepenses";
import { useTresorerie } from "@/hooks/useTresorerie";
import { useBudget } from "@/hooks/useBudget";
import { useBulletinsPaie } from "@/hooks/useBulletinsPaie";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import {
  generateCompteResultat,
  generateFluxTresorerie,
  generateRecouvrement,
  generateMasseSalariale,
  generateAnalyseImpayes,
  generateBudgetExecution,
  generateRemisesAccordees,
  type CompteResultatData,
  type FluxTresorerieData,
  type RecouvrementData,
  type MasseSalarialeData,
  type AnalyseImpayesData,
  type BudgetExecutionData,
  type RemisesData,
} from "@/lib/generateFinanceReports";
import { toast } from "sonner";

const ECOLE_NOM = "Complexe Scolaire La Providence de Don Orione";

// ── Helper: group finance data by classe ──
function buildRecouvrementData(data: ReturnType<typeof useFinanceData>["data"]): RecouvrementData {
  const classeMap = new Map<string, { effectif: number; du: number; paye: number }>();
  for (const e of data) {
    const c = e.classe;
    if (!classeMap.has(c)) classeMap.set(c, { effectif: 0, du: 0, paye: 0 });
    const entry = classeMap.get(c)!;
    entry.effectif++;
    entry.du += e.fraisAnnuel;
    entry.paye += e.totalPaye;
  }
  return {
    lignes: Array.from(classeMap.entries())
      .map(([classe, v]) => ({ classe, effectif: v.effectif, montant_du: v.du, montant_paye: v.paye }))
      .sort((a, b) => a.classe.localeCompare(b.classe)),
  };
}

type ReportId = "compte_resultat" | "flux_tresorerie" | "recouvrement" | "impayes" | "masse_salariale" | "budget_execution" | "remises";

interface ReportDef {
  id: ReportId;
  title: string;
  description: string;
}

const REPORTS: ReportDef[] = [
  { id: "compte_resultat", title: "Compte de résultat", description: "Recettes vs charges sur la période" },
  { id: "flux_tresorerie", title: "Flux de trésorerie", description: "Soldes et mouvements des comptes" },
  { id: "recouvrement", title: "Recouvrement scolarité", description: "Taux de paiement par classe" },
  { id: "impayes", title: "Analyse des impayés", description: "Vieillissement de la créance" },
  { id: "remises", title: "Remises accordées", description: "Élèves bénéficiaires, montant, parent" },
  { id: "masse_salariale", title: "Masse salariale", description: "Détail des salaires versés" },
  { id: "budget_execution", title: "Exécution budgétaire", description: "Prévu vs réalisé" },
];

export default function Reports() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const scopedAnneeId = periodLoading ? "" : (activeAnnee?.id ?? "");
  const dateRange = periodLoading || !activeAnnee ? undefined : { from: activeAnnee.debut, to: activeAnnee.fin };
  const { data: financeData, loading: finLoading } = useFinanceData(scopedAnneeId);
  const { depenses, loading: depLoading } = useDepenses(dateRange);
  const { comptes, mouvements, loading: tresLoading } = useTresorerie();
  const { lignes: budgetLignes, loading: budLoading } = useBudget();
  const { bulletins, loading: paieLoading } = useBulletinsPaie();

  const [preview, setPreview] = useState<ReportId | null>(null);
  const [remiseFrom, setRemiseFrom] = useState<string>("");
  const [remiseTo, setRemiseTo] = useState<string>("");
  const [remiseClasse, setRemiseClasse] = useState<string>("__all__");

  const classesList = useMemo(() => {
    const s = new Set<string>();
    financeData.forEach((e) => e.classe && s.add(e.classe));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [financeData]);

  const remisesFilterActive = !!(remiseFrom || remiseTo || (remiseClasse && remiseClasse !== "__all__"));
  const remisesPeriodeLabel = (() => {
    if (!remiseFrom && !remiseTo) return periode;
    const fmt = (s: string) => new Date(s).toLocaleDateString("fr-FR");
    if (remiseFrom && remiseTo) return `${fmt(remiseFrom)} → ${fmt(remiseTo)}`;
    if (remiseFrom) return `Depuis le ${fmt(remiseFrom)}`;
    return `Jusqu'au ${fmt(remiseTo)}`;
  })();

  const loading = finLoading || depLoading || tresLoading || budLoading || paieLoading;
  const now = new Date();
  const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const periode = `${moisNoms[now.getMonth()]} ${now.getFullYear()}`;

  // ── Data builders ──
  const getCompteResultat = (): CompteResultatData => {
    const recouv = buildRecouvrementData(financeData);
    const totalScolarite = recouv.lignes.reduce((s, l) => s + l.montant_paye, 0);
    const recettes = [{ libelle: "Scolarité encaissée", montant: totalScolarite }];

    const catMap = new Map<string, number>();
    for (const d of depenses) {
      const cat = d.categorie || "Autres";
      catMap.set(cat, (catMap.get(cat) || 0) + d.montant);
    }
    const totalSalaires = bulletins.filter((b) => b.statut === "paye").reduce((s, b) => s + b.net_a_payer, 0);
    if (totalSalaires > 0) catMap.set("Masse salariale", (catMap.get("Masse salariale") || 0) + totalSalaires);

    const depensesList = Array.from(catMap.entries()).map(([libelle, montant]) => ({ libelle, montant })).sort((a, b) => b.montant - a.montant);
    return { recettes, depenses: depensesList };
  };

  const getFluxTresorerie = (): FluxTresorerieData => ({
    comptes: comptes.map((c) => ({ nom: c.nom, solde: c.solde })),
    mouvements: mouvements.slice(0, 50).map((m) => ({
      date: new Date(m.date_mouvement).toLocaleDateString("fr-FR"),
      libelle: m.libelle,
      type: m.type,
      montant: m.montant,
      compte: m.compte_nom || "—",
    })),
  });

  const getImpayes = (): AnalyseImpayesData => ({
    lignes: financeData
      .filter((e) => e.resteDu > 0)
      .map((e) => ({
        nom: e.nom,
        prenom: e.prenom,
        classe: e.classe,
        montant_du: e.fraisAnnuel,
        paye: e.totalPaye,
        jours_retard: e.joursRetard,
      })),
  });

  const getRemises = (): RemisesData => ({
    lignes: financeData
      .filter((e) => (e.totalRemises ?? 0) > 0)
      .map((e) => {
        const remisePaiements = (e.paiements ?? []).filter((p) => p.kind === "remise");
        const motif = remisePaiements
          .map((p) => p.motif)
          .filter(Boolean)
          .join(" ; ");
        return {
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          classe: e.classe,
          parent: e.parent,
          telephone: e.telephone,
          montant: e.totalRemises ?? 0,
          motif,
        };
      }),
  });

  const getMasseSalariale = (): MasseSalarialeData => ({
    mois: periode,
    lignes: bulletins.map((b) => ({
      nom: b.enseignant_nom || "—",
      fonction: b.enseignant_fonction || "Enseignant",
      brut: b.salaire_brut,
      retenues: b.retenues,
      net: b.net_a_payer,
    })),
  });

  const getBudgetExecution = (): BudgetExecutionData => ({
    recettes: budgetLignes.filter((l) => l.type === "recette").map((l) => ({ libelle: l.libelle, prevu: l.montant_prevu, realise: l.montant_realise })),
    depenses: budgetLignes.filter((l) => l.type === "depense").map((l) => ({ libelle: l.libelle, prevu: l.montant_prevu, realise: l.montant_realise })),
  });

  // ── PDF generation ──
  const handleDownload = async (id: ReportId) => {
    try {
      // Best-effort lookup of the current school for logo + branding on the PDF
      const { supabase } = await import("@/integrations/supabase/client");
      let meta: any = { nom: ECOLE_NOM, devise: "Foi, Savoir, Excellence" };
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("ecole_id")
            .eq("user_id", uid)
            .limit(1)
            .maybeSingle();
          const eid = (roleRow as any)?.ecole_id;
          if (eid) {
            const { data: ecole } = await supabase
              .from("ecoles")
              .select("nom, devise, logo_url, adresse, telephone, email")
              .eq("id", eid)
              .maybeSingle();
            if (ecole) {
              meta = {
                nom: (ecole as any).nom || ECOLE_NOM,
                devise: (ecole as any).devise || "Foi, Savoir, Excellence",
                logoUrl: (ecole as any).logo_url,
                adresse: (ecole as any).adresse,
                telephone: (ecole as any).telephone,
                email: (ecole as any).email,
              };
            }
          }
        }
      } catch {
        // fall back to default meta
      }

      switch (id) {
        case "compte_resultat": await generateCompteResultat(meta, periode, getCompteResultat()); break;
        case "flux_tresorerie": await generateFluxTresorerie(meta, periode, getFluxTresorerie()); break;
        case "recouvrement": await generateRecouvrement(meta, periode, buildRecouvrementData(financeData)); break;
        case "impayes": await generateAnalyseImpayes(meta, getImpayes()); break;
        case "masse_salariale": await generateMasseSalariale(meta, periode, getMasseSalariale()); break;
        case "budget_execution": await generateBudgetExecution(meta, periode, getBudgetExecution()); break;
        case "remises": await generateRemisesAccordees(meta, periode, getRemises()); break;
      }
      toast.success("PDF généré avec succès");
    } catch (e) {
      toast.error("Erreur lors de la génération du PDF");
      console.error(e);
    }
  };

  // ── Preview tables ──
  const renderPreview = () => {
    if (!preview) return null;
    switch (preview) {
      case "compte_resultat": {
        const d = getCompteResultat();
        const totalR = d.recettes.reduce((s, r) => s + r.montant, 0);
        const totalD = d.depenses.reduce((s, r) => s + r.montant, 0);
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-primary">Recettes</h3>
            <Table><TableHeader><TableRow><TableHead>Libellé</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>{d.recettes.map((r, i) => <TableRow key={i}><TableCell>{r.libelle}</TableCell><TableCell className="text-right">{fcfa(r.montant)}</TableCell></TableRow>)}
                <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right">{fcfa(totalR)}</TableCell></TableRow>
              </TableBody></Table>
            <h3 className="font-bold text-sm text-primary">Dépenses</h3>
            <Table><TableHeader><TableRow><TableHead>Catégorie</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>{d.depenses.map((r, i) => <TableRow key={i}><TableCell>{r.libelle}</TableCell><TableCell className="text-right">{fcfa(r.montant)}</TableCell></TableRow>)}
                <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right">{fcfa(totalD)}</TableCell></TableRow>
              </TableBody></Table>
            <div className={`text-lg font-bold ${totalR - totalD >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              Résultat net : {fcfa(totalR - totalD)}
            </div>
          </div>
        );
      }
      case "recouvrement": {
        const d = buildRecouvrementData(financeData);
        return (
          <Table><TableHeader><TableRow><TableHead>Classe</TableHead><TableHead>Effectif</TableHead><TableHead className="text-right">Dû</TableHead><TableHead className="text-right">Payé</TableHead><TableHead className="text-right">Taux</TableHead></TableRow></TableHeader>
            <TableBody>{d.lignes.map((l, i) => <TableRow key={i}><TableCell>{l.classe}</TableCell><TableCell>{l.effectif}</TableCell><TableCell className="text-right">{fcfa(l.montant_du)}</TableCell><TableCell className="text-right">{fcfa(l.montant_paye)}</TableCell><TableCell className="text-right">{l.montant_du > 0 ? ((l.montant_paye / l.montant_du) * 100).toFixed(1) + "%" : "—"}</TableCell></TableRow>)}
            </TableBody></Table>
        );
      }
      case "impayes": {
        const d = getImpayes();
        return (
          <Table><TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Classe</TableHead><TableHead className="text-right">Reste</TableHead><TableHead className="text-right">Retard</TableHead></TableRow></TableHeader>
            <TableBody>{d.lignes.sort((a, b) => b.jours_retard - a.jours_retard).slice(0, 30).map((l, i) => <TableRow key={i}><TableCell>{l.nom} {l.prenom}</TableCell><TableCell>{l.classe}</TableCell><TableCell className="text-right">{fcfa(l.montant_du - l.paye)}</TableCell><TableCell className="text-right">{l.jours_retard}j</TableCell></TableRow>)}
            </TableBody></Table>
        );
      }
      case "remises": {
        const d = getRemises();
        const total = d.lignes.reduce((s, l) => s + l.montant, 0);
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Classe</TableHead><TableHead>Parent</TableHead><TableHead>Téléphone</TableHead><TableHead className="text-right">Remise</TableHead></TableRow></TableHeader>
            <TableBody>
              {d.lignes.sort((a, b) => a.classe.localeCompare(b.classe)).map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.nom} {l.prenom}</TableCell>
                  <TableCell>{l.classe}</TableCell>
                  <TableCell>{l.parent}</TableCell>
                  <TableCell>{l.telephone}</TableCell>
                  <TableCell className="text-right">{fcfa(l.montant)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell colSpan={4}>Total — {d.lignes.length} élève(s)</TableCell>
                <TableCell className="text-right">{fcfa(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );
      }
      case "flux_tresorerie": {
        const d = getFluxTresorerie();
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-primary">Soldes des comptes</h3>
            <Table><TableHeader><TableRow><TableHead>Compte</TableHead><TableHead className="text-right">Solde</TableHead></TableRow></TableHeader>
              <TableBody>{d.comptes.map((c, i) => <TableRow key={i}><TableCell>{c.nom}</TableCell><TableCell className="text-right">{fcfa(c.solde)}</TableCell></TableRow>)}
              </TableBody></Table>
            <h3 className="font-bold text-sm text-primary">Derniers mouvements</h3>
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Libellé</TableHead><TableHead className="text-right">Montant</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
              <TableBody>{d.mouvements.slice(0, 15).map((m, i) => <TableRow key={i}><TableCell>{m.date}</TableCell><TableCell>{m.libelle}</TableCell><TableCell className="text-right">{fcfa(m.montant)}</TableCell><TableCell>{m.type === "entree" ? "↑ Entrée" : "↓ Sortie"}</TableCell></TableRow>)}
              </TableBody></Table>
          </div>
        );
      }
      case "masse_salariale": {
        const d = getMasseSalariale();
        return (
          <Table><TableHeader><TableRow><TableHead>Enseignant</TableHead><TableHead className="text-right">Brut</TableHead><TableHead className="text-right">Retenues</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
            <TableBody>{d.lignes.map((l, i) => <TableRow key={i}><TableCell>{l.nom}</TableCell><TableCell className="text-right">{fcfa(l.brut)}</TableCell><TableCell className="text-right">{fcfa(l.retenues)}</TableCell><TableCell className="text-right">{fcfa(l.net)}</TableCell></TableRow>)}
            </TableBody></Table>
        );
      }
      case "budget_execution": {
        const d = getBudgetExecution();
        const all = [...d.recettes.map((r) => ({ ...r, type: "Recette" })), ...d.depenses.map((r) => ({ ...r, type: "Dépense" }))];
        return (
          <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Libellé</TableHead><TableHead className="text-right">Prévu</TableHead><TableHead className="text-right">Réalisé</TableHead><TableHead className="text-right">Taux</TableHead></TableRow></TableHeader>
            <TableBody>{all.map((l, i) => <TableRow key={i}><TableCell>{l.type}</TableCell><TableCell>{l.libelle}</TableCell><TableCell className="text-right">{fcfa(l.prevu)}</TableCell><TableCell className="text-right">{fcfa(l.realise)}</TableCell><TableCell className="text-right">{l.prevu > 0 ? ((l.realise / l.prevu) * 100).toFixed(1) + "%" : "—"}</TableCell></TableRow>)}
            </TableBody></Table>
        );
      }
    }
  };

  return (
    <>
      <SettingsSection
        title="Rapports financiers"
        description="Visualisez et exportez vos rapports comptables en PDF."
        icon={<BarChart3 className="h-5 w-5" />}
        hideSave
      >
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORTS.map((r) => (
              <Card key={r.id} className="border hover:shadow-[var(--shadow-card)] transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold font-display text-primary">{r.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Période : {periode}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setPreview(r.id)}>
                      <Eye className="h-4 w-4" />Visualiser
                    </Button>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleDownload(r.id)}>
                      <Download className="h-4 w-4" />PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SettingsSection>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{REPORTS.find((r) => r.id === preview)?.title}</DialogTitle>
          </DialogHeader>
          {renderPreview()}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => preview && handleDownload(preview)} className="gap-2">
              <Download className="h-4 w-4" />Télécharger PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
