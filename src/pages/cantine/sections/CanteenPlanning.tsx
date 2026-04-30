import { SettingsSection } from "@/components/settings/SettingsSection";
import { CalendarDays } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const planning = [
  { date: "29/04", service: "Déjeuner", horaire: "12h00 - 13h00", cible: "Maternelle", repas: 85, statut: "Confirmé" },
  { date: "29/04", service: "Déjeuner", horaire: "13h00 - 14h00", cible: "Primaire + Collège", repas: 240, statut: "Confirmé" },
  { date: "30/04", service: "Goûter", horaire: "16h00 - 16h30", cible: "Maternelle", repas: 60, statut: "Confirmé" },
  { date: "30/04", service: "Déjeuner", horaire: "12h00 - 14h00", cible: "Tous", repas: 318, statut: "Planifié" },
  { date: "02/05", service: "Déjeuner", horaire: "12h00 - 14h00", cible: "Tous", repas: 295, statut: "Planifié" },
];

export default function CanteenPlanning() {
  return (
    <SettingsSection
      title="Planning des repas"
      description="Services par jour, horaires et estimation des repas."
      icon={<CalendarDays className="h-5 w-5" />}
      hideSave
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Horaire</TableHead>
            <TableHead>Cible</TableHead>
            <TableHead className="text-center">Repas prévus</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planning.map((p, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{p.date}</TableCell>
              <TableCell>{p.service}</TableCell>
              <TableCell>{p.horaire}</TableCell>
              <TableCell>{p.cible}</TableCell>
              <TableCell className="text-center">{p.repas}</TableCell>
              <TableCell><Badge variant={p.statut === "Confirmé" ? "default" : "secondary"}>{p.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
