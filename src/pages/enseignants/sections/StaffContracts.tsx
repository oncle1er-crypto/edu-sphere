import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Plus, Download } from "lucide-react";

const contrats = [
  { id: "CTR-2025-001", membre: "Sidibé Amadou", type: "CDI", debut: "01/09/2020", fin: "—", salaire: "320 000", classes: ["3ème A", "3ème B", "Tle S1"] },
  { id: "CTR-2025-002", membre: "Touré Fatoumata", type: "CDI", debut: "15/09/2018", fin: "—", salaire: "350 000", classes: ["6ème A", "6ème B", "5ème A", "5ème B"] },
  { id: "CTR-2025-007", membre: "Diarra Mamadou", type: "Vacataire", debut: "10/10/2025", fin: "30/06/2026", salaire: "180 000", classes: ["2nde A", "1ère S"] },
  { id: "CTR-2025-009", membre: "Sanogo Aïssata", type: "CDD", debut: "01/09/2025", fin: "30/06/2026", salaire: "260 000", classes: ["4ème A", "4ème B", "4ème C"] },
];

export default function StaffContracts() {
  return (
    <SettingsSection
      icon={<FileSignature className="h-5 w-5" />}
      title="Contrats & affectations"
      description="Suivi des contrats actifs et des classes attribuées."
      hideSave
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Exporter</Button>
        <Button size="sm"><Plus className="h-4 w-4" />Nouveau contrat</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Contrat</TableHead>
              <TableHead>Membre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Salaire (FCFA)</TableHead>
              <TableHead>Classes affectées</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contrats.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                <TableCell className="font-medium">{c.membre}</TableCell>
                <TableCell><Badge>{c.type}</Badge></TableCell>
                <TableCell className="text-sm">{c.debut}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.fin}</TableCell>
                <TableCell className="font-semibold">{c.salaire}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.classes.map((cl) => <Badge key={cl} variant="secondary" className="text-[10px]">{cl}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
