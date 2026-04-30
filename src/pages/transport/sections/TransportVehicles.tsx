import { SettingsSection } from "@/components/settings/SettingsSection";
import { Bus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const vehicules = [
  { immat: "DK-1234-AB", marque: "Toyota Coaster", places: 30, ligne: "A", controle: "12/2026", statut: "En service" },
  { immat: "DK-5678-CD", marque: "Mercedes Sprinter", places: 22, ligne: "B", controle: "08/2026", statut: "En service" },
  { immat: "DK-9012-EF", marque: "Toyota Hiace", places: 18, ligne: "C", controle: "06/2026", statut: "En service" },
  { immat: "DK-3456-GH", marque: "Iveco Daily", places: 25, ligne: "D", controle: "04/2026", statut: "Maintenance" },
  { immat: "DK-7890-IJ", marque: "Toyota Coaster", places: 30, ligne: "—", controle: "11/2026", statut: "Réserve" },
];

export default function TransportVehicles() {
  return (
    <SettingsSection
      title="Véhicules"
      description="Flotte de bus et minibus de l'établissement."
      icon={<Bus className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter un véhicule</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Immatriculation</TableHead>
            <TableHead>Marque / Modèle</TableHead>
            <TableHead className="text-center">Places</TableHead>
            <TableHead className="text-center">Ligne</TableHead>
            <TableHead>Contrôle technique</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicules.map((v) => (
            <TableRow key={v.immat}>
              <TableCell className="font-mono text-xs">{v.immat}</TableCell>
              <TableCell className="font-medium">{v.marque}</TableCell>
              <TableCell className="text-center">{v.places}</TableCell>
              <TableCell className="text-center">{v.ligne}</TableCell>
              <TableCell className="text-muted-foreground">{v.controle}</TableCell>
              <TableCell>
                <Badge variant={v.statut === "En service" ? "default" : v.statut === "Maintenance" ? "destructive" : "secondary"}>
                  {v.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
