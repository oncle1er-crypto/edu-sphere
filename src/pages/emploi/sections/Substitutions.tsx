import { SettingsSection } from "@/components/settings/SettingsSection";
import { Repeat, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const subs = [
  { date: "29/04/2026", absent: "Mme Sow", remplacant: "Mme Ndour", classe: "5ème A", matiere: "Français", statut: "Confirmé" },
  { date: "30/04/2026", absent: "M. Diop", remplacant: "M. Camara", classe: "Term S", matiere: "Maths", statut: "En attente" },
  { date: "02/05/2026", absent: "M. Ba", remplacant: "—", classe: "4ème B", matiere: "Anglais", statut: "À pourvoir" },
];

export default function Substitutions() {
  return (
    <SettingsSection
      title="Remplacements"
      description="Suivi des absences profs et affectation des remplaçants."
      icon={<Repeat className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouveau remplacement</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>Remplaçant</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((s, i) => (
            <TableRow key={i}>
              <TableCell>{s.date}</TableCell>
              <TableCell className="font-medium">{s.absent}</TableCell>
              <TableCell>{s.remplacant}</TableCell>
              <TableCell>{s.classe}</TableCell>
              <TableCell>{s.matiere}</TableCell>
              <TableCell>
                <Badge variant={s.statut === "Confirmé" ? "default" : s.statut === "En attente" ? "secondary" : "destructive"}>
                  {s.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
