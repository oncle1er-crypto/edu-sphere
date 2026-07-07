import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVacancesData } from "../hooks/useVacances";
import { Printer, FileSpreadsheet, FileText as FileTextIcon } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

function exportExcel(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
function exportPDF(title: string, columns: string[], rows: any[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text(title, 14, 15);
  autoTable(doc, { head: [columns], body: rows, startY: 20, styles: { fontSize: 8 } });
  doc.save(`${title}.pdf`);
}

export default function VacancesRapports() {
  const { classes, eleves, paiements, enseignants, honoraires } = useVacancesData();

  const rapports = useMemo(() => {
    const classeNom = (id: string) => classes.find(c => c.id === id)?.nom ?? "—";
    return {
      inscrits: eleves.map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Sexe: e.sexe ?? "", Classe: classeNom(e.classe_id), Contact: e.contact_parent ?? "", "Inscrit le": e.date_inscription, Statut: e.statut_paiement })),
      payes: eleves.filter(e => e.statut_paiement === "paye").map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Classe: classeNom(e.classe_id), Contact: e.contact_parent ?? "" })),
      nonPayes: eleves.filter(e => e.statut_paiement !== "paye").map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Classe: classeNom(e.classe_id), Contact: e.contact_parent ?? "", Statut: e.statut_paiement })),
      maitres: enseignants.map((e) => ({ Nom: e.nom, Prénoms: e.prenom, Téléphone: e.telephone ?? "", Classe: classeNom(e.classe_id ?? ""), Matière: e.matiere ?? "", "Honoraire prévu": Number(e.honoraire_prevu) })),
    };
  }, [classes, eleves, enseignants]);

  const financier = useMemo(() => {
    const encaisse = paiements.reduce((s, p) => s + Number(p.montant_paye), 0);
    const honTot = honoraires.reduce((s, h) => s + Number(h.montant), 0);
    return { encaisse, honTot, net: encaisse - honTot };
  }, [paiements, honoraires]);

  const rapportsList = [
    { titre: "Liste complète des élèves inscrits", data: rapports.inscrits, key: "inscrits" },
    { titre: "Élèves ayant payé", data: rapports.payes, key: "payes" },
    { titre: "Élèves non payés", data: rapports.nonPayes, key: "non-payes" },
    { titre: "Liste des maîtres", data: rapports.maitres, key: "maitres" },
  ];

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold">Rapports</h2><p className="text-sm text-muted-foreground">Impression et export des données.</p></div>

      {rapportsList.map((r) => (
        <Card key={r.key} className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">{r.titre}</p>
              <p className="text-xs text-muted-foreground">{r.data.length} ligne{r.data.length > 1 ? "s" : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimer</Button>
              <Button size="sm" variant="outline" onClick={() => exportExcel(r.data, r.key)}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" onClick={() => exportPDF(r.titre, Object.keys(r.data[0] ?? { Vide: "" }), r.data.map(Object.values))}><FileTextIcon className="h-4 w-4 mr-1" /> PDF</Button>
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
