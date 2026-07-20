import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVacancesData } from "../hooks/useVacances";
import { Printer, FileSpreadsheet, FileText as FileTextIcon } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportFilters, ALL_CLASSES, type ReportFiltersValue, formatPeriodeLabel } from "@/components/reports/ReportFilters";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

function exportExcel(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
function exportPDF(title: string, columns: string[], rows: any[][], sousTitre?: string) {
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text(title, 14, 15);
  if (sousTitre) { doc.setFontSize(9); doc.text(sousTitre, 14, 22); }
  autoTable(doc, { head: [columns], body: rows, startY: sousTitre ? 26 : 20, styles: { fontSize: 8 } });
  doc.save(`${title}.pdf`);
}

export default function VacancesRapports() {
  const { classes, eleves, paiements, enseignants, honoraires } = useVacancesData();
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

  const rapports = useMemo(() => ({
    inscrits: filteredEleves.map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Sexe: e.sexe ?? "", Classe: classeNomById(e.classe_id), Contact: e.contact_parent ?? "", "Inscrit le": e.date_inscription, Statut: e.statut_paiement })),
    payes: filteredEleves.filter((e) => e.statut_paiement === "paye").map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Classe: classeNomById(e.classe_id), Contact: e.contact_parent ?? "" })),
    nonPayes: filteredEleves.filter((e) => e.statut_paiement !== "paye").map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Classe: classeNomById(e.classe_id), Contact: e.contact_parent ?? "", Statut: e.statut_paiement })),
    maitres: enseignants.map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Téléphone: e.telephone ?? "", Classe: classeNomById(e.classe_id ?? ""), Matière: e.matiere ?? "", "Honoraire prévu": Number(e.honoraire_prevu) })),
  }), [filteredEleves, enseignants, classes]);

  const financier = useMemo(() => {
    const encaisse = paiements.reduce((s, p) => s + Number(p.montant_paye), 0);
    const honTot = honoraires.reduce((s, h) => s + Number(h.montant), 0);
    return { encaisse, honTot, net: encaisse - honTot };
  }, [paiements, honoraires]);

  const rapportsList = [
    { titre: "Liste complète des élèves inscrits", data: rapports.inscrits, key: "inscrits", filtered: true },
    { titre: "Élèves ayant payé", data: rapports.payes, key: "payes", filtered: true },
    { titre: "Élèves non payés", data: rapports.nonPayes, key: "non-payes", filtered: true },
    { titre: "Liste des maîtres", data: rapports.maitres, key: "maitres", filtered: false },
  ];

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold">Rapports</h2><p className="text-sm text-muted-foreground">Impression et export des données.</p></div>

      <ReportFilters value={filters} onChange={setFilters} classes={classesNames} periodeLabel={periodeLabel} />

      {rapportsList.map((r) => (
        <Card key={r.key} className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">{r.titre}</p>
              <p className="text-xs text-muted-foreground">{r.data.length} ligne{r.data.length > 1 ? "s" : ""}{r.filtered ? " · filtres appliqués" : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimer</Button>
              <Button size="sm" variant="outline" onClick={() => exportExcel(r.data, r.key)}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" onClick={() => exportPDF(r.titre, Object.keys(r.data[0] ?? { Vide: "" }), r.data.map(Object.values), r.filtered ? `Période : ${periodeLabel}` : undefined)}><FileTextIcon className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </CardContent>
        </Card>
      ))}

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
