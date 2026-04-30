import { SettingsSection } from "@/components/settings/SettingsSection";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ops = [
  { date: "15/04/2026", vehicule: "DK-3456-GH", type: "Vidange", garage: "Auto Top", cout: 85000, statut: "Terminée" },
  { date: "22/04/2026", vehicule: "DK-1234-AB", type: "Pneus avant", garage: "TyrePro", cout: 240000, statut: "Terminée" },
  { date: "30/04/2026", vehicule: "DK-3456-GH", type: "Freinage complet", garage: "Auto Top", cout: 320000, statut: "En cours" },
  { date: "12/05/2026", vehicule: "DK-9012-EF", type: "Contrôle technique", garage: "CTAC", cout: 25000, statut: "Planifiée" },
];

export default function TransportMaintenance() {
  return (
    <SettingsSection
      title="Maintenance véhicules"
      description="Interventions, garages et coûts associés."
      icon={<Wrench className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle intervention</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Véhicule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Garage</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ops.map((o, i) => (
            <TableRow key={i}>
              <TableCell>{o.date}</TableCell>
              <TableCell className="font-mono text-xs">{o.vehicule}</TableCell>
              <TableCell className="font-medium">{o.type}</TableCell>
              <TableCell>{o.garage}</TableCell>
              <TableCell className="text-right">{o.cout.toLocaleString()} FCFA</TableCell>
              <TableCell>
                <Badge variant={o.statut === "Terminée" ? "default" : o.statut === "En cours" ? "destructive" : "secondary"}>
                  {o.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
