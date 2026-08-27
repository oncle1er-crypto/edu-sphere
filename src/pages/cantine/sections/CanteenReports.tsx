import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { ReportFilters, ALL_CLASSES, type ReportFiltersValue, formatPeriodeLabel } from "@/components/reports/ReportFilters";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { sortByEleve } from "@/lib/sortEleves";
import { usePermissions } from "@/hooks/usePermissions";

export default function CanteenReports() {
  const { ecoleId } = useEcoleId();
  const { keepClasse } = useNiveauFilters();
  const ecole = useEcoleInfo();
  const { can } = usePermissions();
  const [filters, setFilters] = useState<ReportFiltersValue>({ from: "", to: "", classe: ALL_CLASSES });
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("classes").select("id, nom").eq("ecole_id", ecoleId).order("nom").then(({ data }) => {
      setClasses(Array.from(new Set(((data ?? []) as any[]).filter((c) => keepClasse(c.id)).map((c) => c.nom).filter(Boolean))));
    });
  }, [ecoleId, keepClasse]);

  const classeFilter = filters.classe && filters.classe !== ALL_CLASSES ? filters.classe : null;
  const monthDefault = useMemo(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }, []);
  const dateFrom = filters.from || monthDefault;
  const dateTo = filters.to || null;
  const periodeLabel = formatPeriodeLabel(filters.from, filters.to, `Depuis le ${new Date(monthDefault).toLocaleDateString("fr-FR")}`);
  const sousTitre = `Période : ${periodeLabel}${classeFilter ? ` · Classe : ${classeFilter}` : ""}`;

  const fetchFactures = async () => {
    let q = supabase.from("factures")
      .select("numero, libelle, montant, montant_paye, statut, date_emission, eleves(nom, prenom, classe_id, classes(nom))")
      .eq("ecole_id", ecoleId!).eq("categorie", "cantine")
      .neq("statut", "annulee")
      .gte("date_emission", dateFrom);
    if (dateTo) q = q.lte("date_emission", dateTo);
    const { data, error } = await q;
    if (error) throw error;
    let rows = sortByEleve(((data ?? []) as any[]).filter((f) => keepClasse(f.eleves?.classe_id)), (r) => ({ nom: r.eleves?.nom, prenom: r.eleves?.prenom }));
    if (classeFilter) rows = rows.filter((f) => f.eleves?.classes?.nom === classeFilter);
    return rows;
  };

  const items = [
    {
      key: "abo", title: "Liste des abonnés", desc: "Export complet par formule.", hasFilter: true, filename: "abonnes-cantine",
      columns: ["Élève", "Classe", "Régime", "Statut", "Montant mensuel"],
      getRows: async () => {
        const { data, error } = await supabase.from("abonnements_cantine")
          .select("regime, statut, montant_mensuel, eleves(nom, prenom, classe_id, classes(nom))")
          .eq("ecole_id", ecoleId!);
        if (error) throw error;
        let rows = sortByEleve(((data ?? []) as any[]).filter((r) => keepClasse(r.eleves?.classe_id)), (r) => ({ nom: r.eleves?.nom, prenom: r.eleves?.prenom })).map((r) => ({
          eleve: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
          classe: r.eleves?.classes?.nom ?? "",
          regime: r.regime, statut: r.statut, montant: r.montant_mensuel,
        }));
        if (classeFilter) rows = rows.filter((r) => r.classe === classeFilter);
        return rows.map((r) => [r.eleve, r.classe, r.regime, r.statut, r.montant]);
      },
    },
    {
      key: "fac", title: "Factures", desc: "Factures cantine filtrées.", hasFilter: true, filename: "factures-cantine",
      columns: ["Numéro", "Élève", "Classe", "Libellé", "Montant", "Payé", "Statut", "Date"],
      getRows: async () => {
        const rows = await fetchFactures();
        return rows.map((f: any) => [
          f.numero, `${f.eleves?.nom ?? ""} ${f.eleves?.prenom ?? ""}`.trim(),
          f.eleves?.classes?.nom ?? "", f.libelle, f.montant, f.montant_paye, f.statut, f.date_emission,
        ]);
      },
    },
    {
      key: "menu", title: "Menus", desc: "Tous les menus enregistrés.", hasFilter: false, filename: "menus-cantine",
      columns: ["Date", "Repas", "Description"],
      getRows: async () => {
        const { data, error } = await supabase.from("menus_cantine").select("date_menu, repas, description").eq("ecole_id", ecoleId!).order("date_menu");
        if (error) throw error;
        return (data ?? []).map((r) => [r.date_menu, r.repas, r.description ?? ""]);
      },
    },
    {
      key: "stock", title: "Inventaire stock", desc: "État détaillé du stock cantine.", hasFilter: false, filename: "inventaire-cantine",
      columns: ["Produit", "Quantité", "Unité", "Seuil alerte", "État"],
      getRows: async () => {
        const { data, error } = await supabase.from("stocks_cantine").select("produit, quantite, unite, seuil_alerte").eq("ecole_id", ecoleId!).order("produit");
        if (error) throw error;
        return (data ?? []).map((r) => [r.produit, r.quantite, r.unite ?? "", r.seuil_alerte ?? "", Number(r.quantite) <= Number(r.seuil_alerte ?? 0) ? "Alerte" : "Normal"]);
      },
    },
    {
      key: "synth", title: "Synthèse financière", desc: "Recettes et impayés selon filtres.", hasFilter: true, filename: "synthese-cantine",
      columns: ["Indicateur", "Valeur"],
      getRows: async () => {
        const rows = await fetchFactures();
        const facture = rows.reduce((s: number, r: any) => s + Number(r.montant || 0), 0);
        const encaisse = rows.reduce((s: number, r: any) => s + Number(r.montant_paye || 0), 0);
        return [
          ["Période", periodeLabel],
          ["Classe", classeFilter ?? "Toutes"],
          ["Factures émises", rows.length],
          ["Montant facturé", facture],
          ["Payé sur ces factures", encaisse],
          ["Solde restant sur ces factures", Math.max(0, facture - encaisse)],
        ];
      },
    },
  ];

  return (
    <SettingsSection title="Rapports & exports" description="CSV · Excel · PDF." icon={<FileText className="h-5 w-5" />} hideSave>
      <div className="space-y-4">
        <ReportFilters value={filters} onChange={setFilters} classes={classes} periodeLabel={periodeLabel} />
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((e) => (
            <Card key={e.key}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">{e.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                  {e.hasFilter && <p className="text-[10px] text-muted-foreground mt-1">Filtres appliqués</p>}
                </div>
                <ReportExportButtons
                  title={e.title}
                  filename={e.filename}
                  columns={e.columns}
                  getRows={e.getRows}
                  ecole={ecole}
                  sousTitre={e.hasFilter ? sousTitre : undefined}
                  disabled={!ecoleId || !can("cantine", "export")}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
