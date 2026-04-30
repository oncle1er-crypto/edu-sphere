import { SettingsSection } from "@/components/settings/SettingsSection";
import { Apple, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const regimes = [
  { eleve: "Diallo Aminata", classe: "3ème A", regime: "Sans porc", allergies: "—", criticite: "Faible" },
  { eleve: "Traoré Moussa", classe: "6ème B", regime: "Végétarien", allergies: "Arachide", criticite: "Élevée" },
  { eleve: "Koné Fatou", classe: "Tle S1", regime: "Standard", allergies: "Lactose", criticite: "Moyenne" },
  { eleve: "Camara Ibrahim", classe: "2nde C", regime: "Sans gluten", allergies: "Gluten", criticite: "Élevée" },
];

export default function CanteenDiets() {
  return (
    <SettingsSection
      title="Régimes alimentaires & allergies"
      description="Liste des restrictions à respecter en cuisine."
      icon={<Apple className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter une fiche</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Élève</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Régime</TableHead>
            <TableHead>Allergies</TableHead>
            <TableHead>Criticité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regimes.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.eleve}</TableCell>
              <TableCell>{r.classe}</TableCell>
              <TableCell>{r.regime}</TableCell>
              <TableCell>{r.allergies}</TableCell>
              <TableCell>
                <Badge variant={r.criticite === "Élevée" ? "destructive" : r.criticite === "Moyenne" ? "default" : "secondary"}>
                  {r.criticite}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
