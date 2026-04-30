import { SettingsSection } from "@/components/settings/SettingsSection";
import { BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const data = [
  { matiere: "Mathématiques", classe: "6ème", heures: 5, coef: 4 },
  { matiere: "Français", classe: "6ème", heures: 5, coef: 4 },
  { matiere: "Anglais", classe: "6ème", heures: 3, coef: 2 },
  { matiere: "SVT", classe: "6ème", heures: 2, coef: 2 },
  { matiere: "Histoire-Géo", classe: "6ème", heures: 3, coef: 3 },
  { matiere: "EPS", classe: "6ème", heures: 2, coef: 1 },
  { matiere: "Mathématiques", classe: "Terminale S", heures: 8, coef: 7 },
  { matiere: "Physique-Chimie", classe: "Terminale S", heures: 6, coef: 6 },
];

export default function SubjectsVolumes() {
  return (
    <SettingsSection
      title="Matières & volumes horaires"
      description="Définissez les heures hebdomadaires par matière et par classe."
      icon={<BookOpen className="h-5 w-5" />}
      hideSave
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matière</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead className="text-center">Heures / semaine</TableHead>
            <TableHead className="text-center">Coefficient</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.matiere}</TableCell>
              <TableCell>{r.classe}</TableCell>
              <TableCell className="text-center">{r.heures}h</TableCell>
              <TableCell className="text-center">{r.coef}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
