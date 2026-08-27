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

export default function TransportReports() {
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
      .eq("ecole_id", ecoleId!).eq("categorie", "transport")
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
      key: "abo", title: "Liste des abonnés", desc: "Export par ligne et statut.", hasFilter: true, filename: "abonnes-transport",
      columns: ["Élève", "Classe", "Ligne", "Statut"],
      getRows: async () => {
        const { data, error } = await supabase.from("abonnements_transport")
          .select("statut, lignes_transport(nom), eleves(nom, prenom, classe_id, classes(nom))").eq("ecole_id", ecoleId!);
        if (error) throw error;
        let rows = sortByEleve(((data ?? []) as any[]).filter((r) => keepClasse(r.eleves?.classe_id)), (r) => ({ nom: r.eleves?.nom, prenom: r.eleves?.prenom })).map((r) => ({
          eleve: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
          classe: r.eleves?.classes?.nom ?? "",
          ligne: r.lignes_transport?.nom ?? "", statut: r.statut,
        }));
        if (classeFilter) rows = rows.filter((r) => r.classe === classeFilter);
        return rows.map((r) => [r.eleve, r.classe, r.ligne, r.statut]);
      },
    },
    {
      key: "fac", title: "Factures", desc: "Factures transport filtrées.", hasFilter: true, filename: "factures-transport",
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
      key: "carb", title: "Consommation carburant", desc: "Détail des pleins par véhicule.", hasFilter: true, filename: "carburant",
      columns: ["Date", "Véhicule", "Litres", "Prix/L", "Montant", "Km"],
      getRows: async () => {
        let q = supabase.from("transport_carburant" as any)
          .select("date_plein, litres, prix_litre, montant, km_compteur, vehicules(immatriculation)")
          .eq("ecole_id", ecoleId!).gte("date_plein", dateFrom);
        if (dateTo) q = q.lte("date_plein", dateTo);
        const { data, error } = await q;
        if (error) throw error;
        return ((data as any) ?? []).map((r: any) => [r.date_plein, r.vehicules?.immatriculation ?? "", r.litres, r.prix_litre, r.montant, r.km_compteur]);
      },
    },
    {
      key: "main", title: "Maintenance", desc: "Historique des entretiens.", hasFilter: true, filename: "maintenance",
      columns: ["Date", "Véhicule", "Type", "Coût", "Garage", "Prochaine échéance"],
      getRows: async () => {
        let q = supabase.from("transport_maintenance" as any)
          .select("date_operation, type, cout, garage, prochaine_echeance_date, vehicules(immatriculation)")
          .eq("ecole_id", ecoleId!).gte("date_operation", dateFrom);
        if (dateTo) q = q.lte("date_operation", dateTo);
        const { data, error } = await q;
        if (error) throw error;
        return ((data as any) ?? []).map((r: any) => [r.date_operation, r.vehicules?.immatriculation ?? "", r.type, r.cout, r.garage, r.prochaine_echeance_date]);
      },
    },
    {
      key: "synth", title: "Synthèse financière", desc: "Facturation et charges opérationnelles partielles.", hasFilter: true, filename: "synthese-transport",
      columns: ["Indicateur", "Valeur"],
      getRows: async () => {
        let carbQ = supabase.from("transport_carburant" as any).select("montant").eq("ecole_id", ecoleId!).gte("date_plein", dateFrom);
        if (dateTo) carbQ = carbQ.lte("date_plein", dateTo);
        let mainQ = supabase.from("transport_maintenance" as any).select("cout").eq("ecole_id", ecoleId!).gte("date_operation", dateFrom);
        if (dateTo) mainQ = mainQ.lte("date_operation", dateTo);
        const [fac, carb, maint] = await Promise.all([fetchFactures(), carbQ, mainQ]);
        if ((carb as any).error) throw (carb as any).error;
        if ((maint as any).error) throw (maint as any).error;
        const facture = fac.reduce((s: number, r: any) => s + Number(r.montant || 0), 0);
        const encaisse = fac.reduce((s: number, r: any) => s + Number(r.montant_paye || 0), 0);
        const carbTotal = (((carb as any).data ?? []) as any[]).reduce((s, r) => s + Number(r.montant || 0), 0);
        const mainTotal = (((maint as any).data ?? []) as any[]).reduce((s, r) => s + Number(r.cout || 0), 0);
        return [
          ["Période", periodeLabel],
          ["Classe", classeFilter ?? "Toutes"],
          ["Montant facturé", facture],
          ["Payé sur ces factures", encaisse],
          ["Solde restant sur ces factures", Math.max(0, facture - encaisse)],
          ["Carburant", carbTotal],
          ["Maintenance", mainTotal],
          ["Solde opérationnel partiel", encaisse - carbTotal - mainTotal],
          ["Note", "Hors salaires, assurances, amortissements et autres charges"],
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
                  disabled={!ecoleId || !can("transport", "export")}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
