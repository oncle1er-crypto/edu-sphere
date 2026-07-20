import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { ReportFilters, ALL_CLASSES, type ReportFiltersValue, formatPeriodeLabel } from "@/components/reports/ReportFilters";

const toCSV = (rows: Record<string, any>[]) => {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};
const downloadFile = (name: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export default function CanteenReports() {
  const { ecoleId } = useEcoleId();
  const [busy, setBusy] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFiltersValue>({ from: "", to: "", classe: ALL_CLASSES });
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("classes").select("nom").eq("ecole_id", ecoleId).order("nom").then(({ data }) => {
      setClasses(Array.from(new Set(((data ?? []) as any[]).map((c) => c.nom).filter(Boolean))));
    });
  }, [ecoleId]);

  const classeFilter = filters.classe && filters.classe !== ALL_CLASSES ? filters.classe : null;
  const monthDefault = useMemo(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);
  const dateFrom = filters.from || monthDefault;
  const dateTo = filters.to || null;
  const periodeLabel = formatPeriodeLabel(filters.from, filters.to, `Depuis le ${new Date(monthDefault).toLocaleDateString("fr-FR")}`);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast.error(e?.message ?? "Erreur export"); }
    finally { setBusy(null); }
  };

  const exportAbonnes = () => withBusy("abo", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("abonnements_cantine").select("regime, statut, montant_mensuel, eleves(nom, prenom, classes(nom))").eq("ecole_id", ecoleId);
    let rows = ((data ?? []) as any[]).map((r) => ({
      Eleve: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
      Classe: r.eleves?.classes?.nom ?? "",
      Regime: r.regime, Statut: r.statut, Montant_mensuel: r.montant_mensuel,
    }));
    if (classeFilter) rows = rows.filter((r) => r.Classe === classeFilter);
    if (rows.length === 0) { toast.info("Aucun abonné à exporter"); return; }
    downloadFile("abonnes-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const fetchFactures = async () => {
    let q = supabase.from("factures")
      .select("numero, libelle, montant, montant_paye, statut, date_emission, eleves(nom, prenom, classes(nom))")
      .eq("ecole_id", ecoleId!).eq("categorie", "cantine")
      .gte("date_emission", dateFrom);
    if (dateTo) q = q.lte("date_emission", dateTo);
    const { data } = await q;
    let rows = ((data ?? []) as any[]);
    if (classeFilter) rows = rows.filter((f) => f.eleves?.classes?.nom === classeFilter);
    return rows;
  };

  const exportFactures = () => withBusy("fac", async () => {
    if (!ecoleId) return;
    const raw = await fetchFactures();
    const rows = raw.map((f: any) => ({
      Numero: f.numero, Eleve: `${f.eleves?.nom ?? ""} ${f.eleves?.prenom ?? ""}`.trim(),
      Classe: f.eleves?.classes?.nom ?? "",
      Libelle: f.libelle, Montant: f.montant, Paye: f.montant_paye, Statut: f.statut, Date: f.date_emission,
    }));
    if (rows.length === 0) { toast.info("Aucune facture sur ces critères"); return; }
    downloadFile("factures-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportStock = () => withBusy("stock", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("stocks_cantine").select("*").eq("ecole_id", ecoleId);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) { toast.info("Stock vide"); return; }
    downloadFile("inventaire-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportMenus = () => withBusy("menu", async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("menus_cantine").select("*").eq("ecole_id", ecoleId);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) { toast.info("Aucun menu"); return; }
    downloadFile("menus-cantine.csv", "text/csv;charset=utf-8", toCSV(rows));
    toast.success("Export téléchargé");
  });

  const exportSynthese = () => withBusy("synth", async () => {
    if (!ecoleId) return;
    const rows = await fetchFactures();
    const facture = rows.reduce((s: number, r: any) => s + Number(r.montant || 0), 0);
    const encaisse = rows.reduce((s: number, r: any) => s + Number(r.montant_paye || 0), 0);
    downloadFile("synthese-cantine.csv", "text/csv;charset=utf-8",
      `Indicateur,Valeur\nPeriode,${periodeLabel}\nClasse,${classeFilter ?? "Toutes"}\nFactures émises,${rows.length}\nMontant facturé,${facture}\nMontant encaissé,${encaisse}\nImpayés,${facture - encaisse}\n`);
    toast.success("Synthèse téléchargée");
  });

  const items = [
    { key: "abo", title: "Liste des abonnés (CSV)", desc: "Export complet par formule.", onClick: exportAbonnes, hasFilter: true },
    { key: "fac", title: "Factures (CSV)", desc: "Factures cantine filtrées.", onClick: exportFactures, hasFilter: true },
    { key: "menu", title: "Menus (CSV)", desc: "Tous les menus enregistrés.", onClick: exportMenus, hasFilter: false },
    { key: "stock", title: "Inventaire stock (CSV)", desc: "État détaillé du stock cantine.", onClick: exportStock, hasFilter: false },
    { key: "synth", title: "Synthèse financière (CSV)", desc: "Recettes et impayés selon filtres.", onClick: exportSynthese, hasFilter: true },
    { key: "haccp", title: "Rapport HACCP", desc: "Nécessite un module HACCP dédié (à venir).", onClick: () => toast.info("Module HACCP non disponible"), disabled: true, hasFilter: false },
  ];

  return (
    <SettingsSection title="Rapports & exports" description="Documents disponibles au téléchargement." icon={<FileText className="h-5 w-5" />} hideSave>
      <div className="space-y-4">
        <ReportFilters value={filters} onChange={setFilters} classes={classes} periodeLabel={periodeLabel} />
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((e) => (
            <Card key={e.key}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{e.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                  {e.hasFilter && <p className="text-[10px] text-muted-foreground mt-1">Filtres appliqués</p>}
                  <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={e.onClick} disabled={e.disabled || busy === e.key}>
                    {busy === e.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Télécharger
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
