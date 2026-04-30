import { SettingsSection } from "@/components/settings/SettingsSection";
import { DoorOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const rooms = [
  { code: "S01", type: "Standard", capacite: 35, occupation: 88, assignee: "6ème A" },
  { code: "S05", type: "Standard", capacite: 35, occupation: 92, assignee: "5ème B" },
  { code: "Lab1", type: "Laboratoire SVT", capacite: 24, occupation: 65, assignee: "Mutualisée" },
  { code: "Lab2", type: "Laboratoire Physique", capacite: 24, occupation: 70, assignee: "Mutualisée" },
  { code: "Gym", type: "Gymnase", capacite: 60, occupation: 80, assignee: "EPS" },
  { code: "Info1", type: "Salle informatique", capacite: 20, occupation: 55, assignee: "Mutualisée" },
];

export default function RoomAssignment() {
  return (
    <SettingsSection
      title="Affectation des salles"
      description="Vérifiez l'occupation et les attributions de chaque salle."
      icon={<DoorOpen className="h-5 w-5" />}
      hideSave
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Capacité</TableHead>
            <TableHead className="text-center">Occupation</TableHead>
            <TableHead>Assignée à</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((r) => (
            <TableRow key={r.code}>
              <TableCell className="font-bold">{r.code}</TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell className="text-center">{r.capacite}</TableCell>
              <TableCell className="text-center">
                <Badge variant={r.occupation > 85 ? "destructive" : r.occupation > 70 ? "default" : "secondary"}>
                  {r.occupation}%
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.assignee}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
