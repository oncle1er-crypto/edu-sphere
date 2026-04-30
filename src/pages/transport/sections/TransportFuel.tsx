import { SettingsSection } from "@/components/settings/SettingsSection";
import { Fuel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const pleins = [
  { date: "28/04/2026", vehicule: "DK-1234-AB", litres: 80, prix: 750, total: 60000, km: 124800 },
  { date: "27/04/2026", vehicule: "DK-5678-CD", litres: 65, prix: 750, total: 48750, km: 98750 },
  { date: "26/04/2026", vehicule: "DK-9012-EF", litres: 75, prix: 750, total: 56250, km: 112400 },
  { date: "25/04/2026", vehicule: "DK-3456-GH", litres: 70, prix: 750, total: 52500, km: 87600 },
];

export default function TransportFuel() {
  return (
    <SettingsSection
      title="Carburant"
      description="Suivi des pleins et de la consommation."
      icon={<Fuel className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouveau plein</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Véhicule</TableHead>
            <TableHead className="text-center">Litres</TableHead>
            <TableHead className="text-right">Prix / L</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Km</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pleins.map((p, i) => (
            <TableRow key={i}>
              <TableCell>{p.date}</TableCell>
              <TableCell className="font-mono text-xs">{p.vehicule}</TableCell>
              <TableCell className="text-center">{p.litres} L</TableCell>
              <TableCell className="text-right">{p.prix} FCFA</TableCell>
              <TableCell className="text-right font-medium">{p.total.toLocaleString()} FCFA</TableCell>
              <TableCell className="text-right text-muted-foreground">{p.km.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="bg-muted/40 rounded-lg p-3 text-sm">
        Consommation moyenne flotte : <strong>22 L / 100 km</strong> · Coût mensuel : <strong>485 000 FCFA</strong>
      </div>
    </SettingsSection>
  );
}
