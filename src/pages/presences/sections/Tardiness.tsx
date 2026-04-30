import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { date: "2026-04-30", name: "Sékou Keita", classe: "5ème B", heure: "08h12", retard: "12 min", recidive: 4 },
  { date: "2026-04-30", name: "Aïcha Touré", classe: "3ème A", heure: "08h25", retard: "25 min", recidive: 1 },
  { date: "2026-04-29", name: "Ousmane Ndiaye", classe: "6ème A", heure: "08h08", retard: "8 min", recidive: 7 },
  { date: "2026-04-29", name: "Mariama Cissé", classe: "4ème C", heure: "08h17", retard: "17 min", recidive: 2 },
];

export default function Tardiness() {
  return (
    <SettingsSection
      icon={<CalendarClock className="h-5 w-5" />}
      title="Retards des élèves"
      description="Suivi des retards quotidiens et détection des récidives."
    >
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Retard</TableHead>
              <TableHead>Récidive</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{r.date}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.classe}</TableCell>
                <TableCell>{r.heure}</TableCell>
                <TableCell>{r.retard}</TableCell>
                <TableCell>
                  <Badge className={r.recidive >= 5 ? "bg-red-500/15 text-red-700 hover:bg-red-500/15" : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"}>
                    {r.recidive}× ce mois
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
