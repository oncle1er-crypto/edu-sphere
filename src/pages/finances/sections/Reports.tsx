import { useMemo, useState } from "react";
import { BarChart3, Download, FileText, Eye, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceData, fcfa } from "@/pages/finances/useFinanceData";
import { useDepenses } from "@/hooks/useDepenses";
import { useTresorerie } from "@/hooks/useTresorerie";
import { useBudget } from "@/hooks/useBudget";
import { useBulletinsPaie } from "@/hooks/useBulletinsPaie";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useClasses } from "@/hooks/useClasses";
import { ReportFilters, ALL_CLASSES, formatPeriodeLabel, type ReportFiltersValue } from "@/components/reports/ReportFilters";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { Users } from "lucide-react";
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

function buildRecouvrementData(data: ReturnType<typeof useFinanceData>["data"]): RecouvrementData {
  const classeMap = new Map<string, { effectif: number; du: number; paye: number }>();
  for (const e of data) {
    const c = e.classe;
    if (!classeMap.has(c)) classeMap.set(c, { effectif: 0, du: 0, paye: 0 });
    const entry = classeMap.get(c)!;
    entry.effectif++;
    entry.du += e.fraisAnnuel;
    // Dû couvert = encaissement + remises/bourses/prises en charge.
    entry.paye += (e.totalEncaisse ?? 0) + (e.totalRemises ?? 0);
  }
  return {
    lignes: Array.from(classeMap.entries())
      .map(([classe, v]) => ({ classe, effectif: v.effectif, montant_du: v.du, montant_paye: v.paye }))
      .sort((a, b) => a.classe.localeCompare(b.classe)),
  };
}

type ReportId = "compte_resultat" | "flux_tresorerie" | "recouvrement" | "impayes" | "masse_salariale" | "budget_execution" | "remises";

interface ReportDef { id: ReportId; title: string; description: string; }

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
  const { data: financeData, loading: finLoading } = useFinanceData(scopedAnneeId);

  const [filters, setFilters] = useState<ReportFiltersValue>({ from: "", to: "", classe: ALL_CLASSES });

  const effectiveRange = useMemo(() => {
    if (filters.from || filters.to) {
      return { from: filters.from || activeAnnee?.debut, to: filters.to || activeAnnee?.fin };
    }
    return periodLoading || !activeAnnee ? undefined : { from: activeAnnee.debut, to: activeAnnee.fin };
  }, [filters.from, filters.to, activeAnnee, periodLoading]);

  const { depenses, loading: depLoading } = useDepenses(effectiveRange);
  const { comptes, mouvements, loading: tresLoading } = useTresorerie();
  const { lignes: budgetLignes, loading: budLoading } = useBudget();
  const { bulletins, loading: paieLoading } = useBulletinsPaie();

  const [preview, setPreview] = useState<ReportId | null>(null);

  // Liste des classes : union entre les classes de l'année (useClasses) et
  // celles présentes dans les données financières, afin que le filtre reste
  // utilisable même si financeData n'est pas encore chargé.
  const { classes: classesAnnee } = useClasses(activeAnnee?.id);
  const classesList = useMemo(() => {
    const s = new Set<string>();
    classesAnnee.forEach((c) => c.nom && s.add(c.nom));
    financeData.forEach((e) => e.classe && s.add(e.classe));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [classesAnnee, financeData]);

  const scopedFinance = useMemo(() => {
    if (!filters.classe || filters.classe === ALL_CLASSES) return financeData;
    return financeData.filter((e) => e.classe === filters.classe);
  }, [financeData, filters.classe]);

  const ecoleInfo = useEcoleInfo();
  const loading = finLoading || depLoading || tresLoading || budLoading || paieLoading;
  const now = new Date();
  const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const defaultPeriode = `${moisNoms[now.getMonth()]} ${now.getFullYear()}`;
  const periode = formatPeriodeLabel(filters.from, filters.to, defaultPeriode);


  // ── Data builders ──
  const getCompteResultat = (): CompteResultatData => {
    // Recettes = cash uniquement. Les remises/bourses ne sont pas des encaissements
    // et ne doivent pas gonfler le résultat net.
    // `financeData` est déjà restreint au niveau actif (voir useFinanceData).
    const totalScolarite = financeData.reduce((s, e) => s + (e.totalEncaisse ?? 0), 0);
    const recettes = [{ libelle: "Scolarité encaissée", montant: totalScolarite }];

    // Charges : dépenses du niveau à 100 %, charges communes au prorata
    // (ratio = 1 en vue « Tous les niveaux » → aucun double comptage).
    const catMap = new Map<string, number>();
    for (const d of depenses) {
      const commun = !d.cycle_id;
      const cat = (d.categorie || "Autres") + (commun && !isGlobal ? " (quote-part commune)" : "");
      const montant = commun ? d.montant * ratio : d.montant;
      catMap.set(cat, (catMap.get(cat) || 0) + montant);
    }
    const totalSalaires = bulletins
      .filter((b) => b.statut === "paye")
      .reduce((s, b) => {
        const cycleId = (b as any).cycle_id as string | null | undefined;
        if (!cycleId) return s + b.net_a_payer * ratio; // salaire commun → prorata
        if (!matchesCycle(cycleId)) return s;
        return s + b.net_a_payer;
      }, 0);
    if (totalSalaires > 0) catMap.set("Masse salariale", (catMap.get("Masse salariale") || 0) + totalSalaires);

    const depensesList = Array.from(catMap.entries())
      .map(([libelle, montant]) => ({ libelle, montant: Math.round(montant) }))
      .sort((a, b) => b.montant - a.montant);
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
    lignes: scopedFinance
      .filter((e) => e.resteDu > 0)
      .map((e) => ({
        nom: e.nom,
        prenom: e.prenom,
        classe: e.classe,
        montant_du: e.fraisAnnuel,
        // Dû couvert (encaissement + remises) pour que « reste » = fraisAnnuel - paye.
        paye: (e.totalEncaisse ?? 0) + (e.totalRemises ?? 0),
        jours_retard: e.joursRetard,
      })),
  });

  const getRemises = (): RemisesData => {
    const from = filters.from ? new Date(filters.from + "T00:00:00") : null;
    const to = filters.to ? new Date(filters.to + "T23:59:59") : null;
    return {
      lignes: scopedFinance
        .map((e) => {
          const remisePaiements = (e.paiements ?? []).filter((p) => {
            if (p.kind !== "remise") return false;
            if (!from && !to) return true;
            const d = p.date ? new Date(p.date) : null;
            if (!d) return false;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
          });
          const montant = remisePaiements.reduce((s, p) => s + (p.montant ?? 0), 0);
          const motif = remisePaiements.map((p) => p.motif).filter(Boolean).join(" ; ");
          return {
            matricule: e.matricule,
            nom: e.nom,
            prenom: e.prenom,
            classe: e.classe,
            parent: e.parent,
            telephone: e.telephone,
            montant,
            motif,
          };
        })
        .filter((l) => l.montant > 0),
    };
  };


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
        case "recouvrement": await generateRecouvrement(meta, periode, buildRecouvrementData(scopedFinance)); break;
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


  // ── Tabular data for CSV / Excel ──
  const buildTable = (id: ReportId): { columns: string[]; rows: (string | number)[][] } => {
    switch (id) {
      case "compte_resultat": {
        const d = getCompteResultat();
        const rows: (string | number)[][] = [];
        d.recettes.forEach((r) => rows.push(["Recette", r.libelle, r.montant]));
        d.depenses.forEach((r) => rows.push(["Dépense", r.libelle, r.montant]));
        return { columns: ["Type", "Libellé", "Montant"], rows };
      }
      case "flux_tresorerie": {
        const d = getFluxTresorerie();
        const rows: (string | number)[][] = [];
        d.comptes.forEach((c) => rows.push(["Solde", "", c.nom, "", c.solde, ""]));
        d.mouvements.forEach((m) => rows.push(["Mouvement", m.date, m.libelle, m.compte, m.montant, m.type]));
        return { columns: ["Section", "Date", "Libellé", "Compte", "Montant", "Type"], rows };
      }
      case "recouvrement": {
        const d = buildRecouvrementData(scopedFinance);
        return {
          columns: ["Classe", "Effectif", "Dû", "Payé", "Taux (%)"],
          rows: d.lignes.map((l) => [l.classe, l.effectif, l.montant_du, l.montant_paye, l.montant_du > 0 ? Number(((l.montant_paye / l.montant_du) * 100).toFixed(1)) : 0]),
        };
      }
      case "impayes": {
        const d = getImpayes();
        return {
          columns: ["Nom", "Prénom", "Classe", "Dû", "Payé", "Reste", "Jours retard"],
          rows: d.lignes.map((l) => [l.nom, l.prenom, l.classe, l.montant_du, l.paye, l.montant_du - l.paye, l.jours_retard]),
        };
      }
      case "remises": {
        const d = getRemises();
        return {
          columns: ["Matricule", "Nom", "Prénom", "Classe", "Parent", "Téléphone", "Montant remise", "Motif"],
          rows: d.lignes.map((l) => [l.matricule, l.nom, l.prenom, l.classe, l.parent, l.telephone, l.montant, l.motif ?? ""]),
        };
      }
      case "masse_salariale": {
        const d = getMasseSalariale();
        return {
          columns: ["Nom", "Fonction", "Brut", "Retenues", "Net"],
          rows: d.lignes.map((l) => [l.nom, l.fonction, l.brut, l.retenues, l.net]),
        };
      }
      case "budget_execution": {
        const d = getBudgetExecution();
        const rows: (string | number)[][] = [];
        d.recettes.forEach((l) => rows.push(["Recette", l.libelle, l.prevu, l.realise, l.prevu > 0 ? Number(((l.realise / l.prevu) * 100).toFixed(1)) : 0]));
        d.depenses.forEach((l) => rows.push(["Dépense", l.libelle, l.prevu, l.realise, l.prevu > 0 ? Number(((l.realise / l.prevu) * 100).toFixed(1)) : 0]));
        return { columns: ["Type", "Libellé", "Prévu", "Réalisé", "Taux (%)"], rows };
      }
    }
  };

  const handleDownloadCsv = (id: ReportId) => {
    try {
      const { columns, rows } = buildTable(id);
      const csv = [columns, ...rows].map((r) => r.map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")).join("\n");
      const title = REPORTS.find((r) => r.id === id)?.title ?? id;
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${title}.csv`; a.click();
      toast.success("CSV généré");
    } catch (e) { toast.error("Erreur CSV"); console.error(e); }
  };

  const handleDownloadXlsx = (id: ReportId) => {
    try {
      const { columns, rows } = buildTable(id);
      const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Données");
      const title = REPORTS.find((r) => r.id === id)?.title ?? id;
      XLSX.writeFile(wb, `${title}.xlsx`);
      toast.success("Excel généré");
    } catch (e) { toast.error("Erreur Excel"); console.error(e); }
  };

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
        const d = buildRecouvrementData(scopedFinance);
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
          <div className="space-y-4">

            {d.lignes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">Aucune remise sur ces critères.</div>
            ) : (
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
            )}
          </div>
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
          <div className="space-y-4">
            <ReportFilters
              value={filters}
              onChange={setFilters}
              classes={classesList}
              periodeLabel={periode}
            />
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
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setPreview(r.id)}>
                        <Eye className="h-4 w-4" />Visualiser
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadCsv(r.id)}>
                        <Download className="h-4 w-4" />CSV
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadXlsx(r.id)}>
                        <FileSpreadsheet className="h-4 w-4" />Excel
                      </Button>
                      <Button size="sm" className="gap-1" onClick={() => handleDownload(r.id)}>
                        <FileText className="h-4 w-4" />PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ────── Listes par classe ────── */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-primary">Listes par classe</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Exports (CSV · Excel · PDF) — filtrés selon la classe et la période choisies ci-dessus.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const suffix = filters.classe && filters.classe !== ALL_CLASSES ? ` — ${filters.classe}` : "";
                  const sousTitre = `Période : ${periode}${suffix ? ` · Classe : ${filters.classe}` : ""}`;
                  const groupByClasse = <T extends { classe: string }>(arr: T[]) =>
                    arr.slice().sort((a, b) => a.classe.localeCompare(b.classe) || 0);

                  const listes: Array<{
                    key: string;
                    titre: string;
                    desc: string;
                    filename: string;
                    columns: string[];
                    getRows: () => (string | number)[][];
                  }> = [
                    {
                      key: "eleves_ayant_paye",
                      titre: `Élèves ayant fait au moins un versement${suffix}`,
                      desc: "Liste par classe, avec parent, téléphone et montant déjà encaissé.",
                      filename: `eleves_ayant_paye${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Matricule", "Nom", "Prénom", "Parent", "Téléphone", "Payé", "Reste"],
                      getRows: () =>
                        groupByClasse(scopedFinance)
                          .filter((e) => (e.totalEncaisse ?? 0) > 0)
                          .map((e) => [e.classe, e.matricule, e.nom, e.prenom, e.parent, e.telephone, e.totalEncaisse ?? 0, e.resteDu]),
                    },
                    {
                      key: "liste_eleves_classe",
                      titre: `Liste des élèves par classe${suffix}`,
                      desc: "Annuaire complet avec coordonnées parent.",
                      filename: `liste_eleves_par_classe${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Matricule", "Nom", "Prénom", "Parent", "Téléphone"],
                      getRows: () =>
                        groupByClasse(scopedFinance).map((e) => [e.classe, e.matricule, e.nom, e.prenom, e.parent, e.telephone]),
                    },
                    {
                      key: "eleves_a_jour",
                      titre: `Élèves à jour (sans reste à payer)${suffix}`,
                      desc: "Élèves dont la scolarité est intégralement couverte.",
                      filename: `eleves_a_jour${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Matricule", "Nom", "Prénom", "Parent", "Téléphone", "Payé"],
                      getRows: () =>
                        groupByClasse(scopedFinance)
                          .filter((e) => e.resteDu <= 0)
                          .map((e) => [e.classe, e.matricule, e.nom, e.prenom, e.parent, e.telephone, e.totalEncaisse ?? 0]),
                    },
                    {
                      key: "eleves_impayes",
                      titre: `Élèves n'ayant rien versé${suffix}`,
                      desc: "Liste par classe des élèves sans aucun encaissement.",
                      filename: `eleves_sans_versement${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Matricule", "Nom", "Prénom", "Parent", "Téléphone", "Dû", "Jours retard"],
                      getRows: () =>
                        groupByClasse(scopedFinance)
                          .filter((e) => (e.totalEncaisse ?? 0) === 0)
                          .map((e) => [e.classe, e.matricule, e.nom, e.prenom, e.parent, e.telephone, e.fraisAnnuel, e.joursRetard]),
                    },
                    {
                      key: "synthese_classe",
                      titre: "Synthèse financière par classe",
                      desc: "Effectif, dû, encaissé, reste, taux de recouvrement.",
                      filename: "synthese_financiere_classes",
                      columns: ["Classe", "Effectif", "Dû", "Encaissé", "Remises", "Reste", "Taux (%)"],
                      getRows: () => {
                        const map = new Map<string, { effectif: number; du: number; enc: number; rem: number; reste: number }>();
                        for (const e of scopedFinance) {
                          const c = e.classe;
                          if (!map.has(c)) map.set(c, { effectif: 0, du: 0, enc: 0, rem: 0, reste: 0 });
                          const v = map.get(c)!;
                          v.effectif++;
                          v.du += e.fraisAnnuel;
                          v.enc += e.totalEncaisse ?? 0;
                          v.rem += e.totalRemises ?? 0;
                          v.reste += e.resteDu;
                        }
                        return Array.from(map.entries())
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([c, v]) => [c, v.effectif, v.du, v.enc, v.rem, v.reste, v.du > 0 ? Number((((v.enc + v.rem) / v.du) * 100).toFixed(1)) : 0]);
                      },
                    },
                    {
                      key: "detail_paiements",
                      titre: `Détail des versements par élève${suffix}`,
                      desc: "Historique de chaque encaissement (date, mode, montant).",
                      filename: `detail_versements${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Matricule", "Nom", "Prénom", "Date", "Mode", "Référence", "Montant"],
                      getRows: () => {
                        const from = filters.from ? new Date(filters.from + "T00:00:00") : null;
                        const to = filters.to ? new Date(filters.to + "T23:59:59") : null;
                        const rows: (string | number)[][] = [];
                        for (const e of groupByClasse(scopedFinance)) {
                          for (const p of e.paiements ?? []) {
                            if (p.kind !== "encaissement") continue;
                            const d = p.date ? new Date(p.date) : null;
                            if (from && d && d < from) continue;
                            if (to && d && d > to) continue;
                            rows.push([
                              e.classe, e.matricule, e.nom, e.prenom,
                              d ? d.toLocaleDateString("fr-FR") : "",
                              (p as any).mode ?? "—",
                              (p as any).reference ?? "",
                              p.montant ?? 0,
                            ]);
                          }
                        }
                        return rows;
                      },
                    },
                    {
                      key: "contacts_parents",
                      titre: `Contacts parents par classe${suffix}`,
                      desc: "Annuaire téléphonique pour relances / communications.",
                      filename: `contacts_parents${suffix.replace(/\s|—/g, "_")}`,
                      columns: ["Classe", "Élève", "Parent", "Téléphone", "Reste dû"],
                      getRows: () =>
                        groupByClasse(scopedFinance).map((e) => [
                          e.classe,
                          `${e.nom} ${e.prenom}`,
                          e.parent,
                          e.telephone,
                          e.resteDu,
                        ]),
                    },
                  ];

                  return listes.map((l) => (
                    <Card key={l.key} className="border hover:shadow-[var(--shadow-card)] transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold font-display text-primary">{l.titre}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{l.desc}</p>
                            <p className="text-xs text-muted-foreground mt-1">Période : {periode}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ReportExportButtons
                            title={l.titre}
                            filename={l.filename}
                            columns={l.columns}
                            getRows={l.getRows}
                            sousTitre={sousTitre}
                            ecole={ecoleInfo}
                            orientation={l.columns.length > 6 ? "landscape" : "portrait"}
                            pdfGroupBy={
                              l.key !== "synthese_classe" && l.columns[0] === "Classe"
                                ? { columnIndex: 0, label: "Classe" }
                                : undefined
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

      </SettingsSection>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{REPORTS.find((r) => r.id === preview)?.title}</DialogTitle>
          </DialogHeader>
          {renderPreview()}
          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => preview && handleDownloadCsv(preview)} className="gap-2">
              <Download className="h-4 w-4" />CSV
            </Button>
            <Button variant="outline" onClick={() => preview && handleDownloadXlsx(preview)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />Excel
            </Button>
            <Button onClick={() => preview && handleDownload(preview)} className="gap-2">
              <FileText className="h-4 w-4" />PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
