import { SettingsSection } from "@/components/settings/SettingsSection";
import { Receipt, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const factures = [
  { num: "TRP-2026-0312", eleve: "Diallo Aminata", periode: "Mars 2026", montant: 18000, statut: "Payée" },
  { num: "TRP-2026-0313", eleve: "Traoré Moussa", periode: "T2 2026", montant: 48000, statut: "Payée" },
  { num: "TRP-2026-0314", eleve: "Koné Fatou", periode: "Mars 2026", montant: 18000, statut: "Impayée" },
  { num: "TRP-2026-0315", eleve: "Camara Ibrahim", periode: "Mars 2026", montant: 18000, statut: "Partielle" },
  { num: "TRP-2026-0316", eleve: "Bamba Aïcha", periode: "T2 2026", montant: 48000, statut: "Payée" },
];

export default function TransportBilling() {
  return (
    <SettingsSection
      title="Facturation transport"
      description="Factures émises pour les abonnements."
      icon={<Receipt className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exporter</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Facture</TableHead>
            <TableHead>Élève</TableHead>
            <TableHead>Période</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {factures.map((f) => (
            <TableRow key={f.num}>
              <TableCell className="font-mono text-xs">{f.num}</TableCell>
              <TableCell className="font-medium">{f.eleve}</TableCell>
              <TableCell>{f.periode}</TableCell>
              <TableCell className="text-right">{f.montant.toLocaleString()} FCFA</TableCell>
              <TableCell>
                <Badge variant={f.statut === "Payée" ? "default" : f.statut === "Partielle" ? "secondary" : "destructive"}>
                  {f.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
