import { SettingsSection } from "@/components/settings/SettingsSection";
import { Receipt, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const factures = [
  { num: "CTN-2026-0421", eleve: "Diallo Aminata", periode: "Mars 2026", montant: 12000, statut: "Payée" },
  { num: "CTN-2026-0422", eleve: "Traoré Moussa", periode: "T2 2026", montant: 30000, statut: "Payée" },
  { num: "CTN-2026-0423", eleve: "Koné Fatou", periode: "Mars 2026", montant: 12000, statut: "Impayée" },
  { num: "CTN-2026-0424", eleve: "Camara Ibrahim", periode: "Mars 2026", montant: 6000, statut: "Partielle" },
  { num: "CTN-2026-0425", eleve: "Bamba Aïcha", periode: "Mars 2026", montant: 12000, statut: "Payée" },
];

export default function CanteenBilling() {
  return (
    <SettingsSection
      title="Facturation cantine"
      description="Génération et suivi des factures de restauration."
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
