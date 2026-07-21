import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useVacancesData } from "../hooks/useVacances";
import { ReportFilters, ALL_CLASSES, type ReportFiltersValue, formatPeriodeLabel } from "@/components/reports/ReportFilters";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesRapports() {
  const { classes, eleves, paiements, enseignants, honoraires } = useVacancesData();
  const ecole = useEcoleInfo();
  const [filters, setFilters] = useState<ReportFiltersValue>({ from: "", to: "", classe: ALL_CLASSES });

  const classesNames = useMemo(() => classes.map((c) => c.nom).filter(Boolean), [classes]);
  const classeNomById = (id: string) => classes.find((c) => c.id === id)?.nom ?? "—";

  const filteredEleves = useMemo(() => {
    const from = filters.from ? new Date(filters.from + "T00:00:00") : null;
    const to = filters.to ? new Date(filters.to + "T23:59:59") : null;
    const classeFilter = filters.classe && filters.classe !== ALL_CLASSES ? filters.classe : null;
    return eleves.filter((e) => {
      if (classeFilter && classeNomById(e.classe_id) !== classeFilter) return false;
      if (from || to) {
        const d = e.date_inscription ? new Date(e.date_inscription) : null;
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [eleves, classes, filters]);

  const periodeLabel = formatPeriodeLabel(filters.from, filters.to, "Toute la période");
  const sousTitre = `Période : ${periodeLabel}${filters.classe && filters.classe !== ALL_CLASSES ? ` · Classe : ${filters.classe}` : ""}`;

  const financier = useMemo(() => {
    const encaisse = paiements.reduce((s, p) => s + Number(p.montant_paye), 0);
    const honTot = honoraires.reduce((s, h) => s + Number(h.montant), 0);
    return { encaisse, honTot, net: encaisse - honTot };
  }, [paiements, honoraires]);

  const rapportsList = [
    {
      key: "inscrits", titre: "Liste complète des élèves inscrits", filtered: true,
      columns: ["Nom", "Prénoms", "Sexe", "Classe", "Contact", "Inscrit le", "Statut"],
      getRows: () => filteredEleves.map((e) => [e.nom, e.prenom, e.sexe ?? "", classeNomById(e.classe_id), e.contact_parent ?? "", e.date_inscription ?? "", e.statut_paiement]),
    },
    {
      key: "payes", titre: "Élèves ayant payé", filtered: true,
      columns: ["Nom", "Prénoms", "Classe", "Contact"],
      getRows: () => filteredEleves.filter((e) => e.statut_paiement === "paye").map((e) => [e.nom, e.prenom, classeNomById(e.classe_id), e.contact_parent ?? ""]),
    },
    {
      key: "non-payes", titre: "Élèves non payés", filtered: true,
      columns: ["Nom", "Prénoms", "Classe", "Contact", "Statut"],
      getRows: () => filteredEleves.filter((e) => e.statut_paiement !== "paye").map((e) => [e.nom, e.prenom, classeNomById(e.classe_id), e.contact_parent ?? "", e.statut_paiement]),
    },
    {
      key: "maitres", titre: "Liste des maîtres", filtered: false,
      columns: ["Nom", "Prénoms", "Téléphone", "Classe", "Matière", "Honoraire prévu"],
      getRows: () => enseignants.map((e) => [e.nom, e.prenom, e.telephone ?? "", classeNomById(e.classe_id ?? ""), e.matiere ?? "", Number(e.honoraire_prevu)]),
    },
  ];

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold">Rapports</h2><p className="text-sm text-muted-foreground">Exports CSV · Excel · PDF.</p></div>

      <ReportFilters value={filters} onChange={setFilters} classes={classesNames} periodeLabel={periodeLabel} />

      {rapportsList.map((r) => {
        const rows = r.getRows();
        return (
          <Card key={r.key} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold">{r.titre}</p>
                <p className="text-xs text-muted-foreground">{rows.length} ligne{rows.length > 1 ? "s" : ""}{r.filtered ? " · filtres appliqués" : ""}</p>
              </div>
              <ReportExportButtons
                title={r.titre}
                filename={r.key}
                columns={r.columns}
                getRows={() => rows}
                ecole={ecole}
                sousTitre={r.filtered ? sousTitre : undefined}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">Résumé financier global</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total encaissé (élèves)</p><p className="text-xl font-bold text-emerald-600 mt-1">{fmt(financier.encaisse)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total honoraires payés</p><p className="text-xl font-bold text-destructive mt-1">{fmt(financier.honTot)}</p></div>
            <div className="rounded-lg border p-3 bg-primary/5"><p className="text-xs text-muted-foreground">Résultat net</p><p className={`text-xl font-bold mt-1 ${financier.net >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(financier.net)}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
