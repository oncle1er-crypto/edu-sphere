import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { nom: "M. Diop", role: "Prof. Maths", arrivee: "07h52", depart: "16h05", statut: "Présent" },
  { nom: "Mme Sarr", role: "Prof. Français", arrivee: "—", depart: "—", statut: "Absent" },
  { nom: "M. Fall", role: "Prof. SVT", arrivee: "08h10", depart: "—", statut: "Retard" },
  { nom: "Mme Ndoye", role: "Surveillante", arrivee: "07h45", depart: "17h00", statut: "Présent" },
];

export default function StaffAttendance() {
  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Présence du personnel"
      description="Suivi quotidien des arrivées et départs des enseignants et personnel administratif."
    >
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personnel</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Départ</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.nom}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{r.arrivee}</TableCell>
                <TableCell>{r.depart}</TableCell>
                <TableCell>
                  <Badge className={
                    r.statut === "Présent" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                    : r.statut === "Absent" ? "bg-red-500/15 text-red-700 hover:bg-red-500/15"
                    : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"
                  }>{r.statut}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
