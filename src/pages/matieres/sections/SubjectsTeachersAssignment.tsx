import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { SUBJECTS } from "../data";

const AFFECTATIONS = [
  { matiere: "MATH", enseignants: ["M. Konaté", "Mme Diarra", "M. Bah"], classes: 8 },
  { matiere: "FR", enseignants: ["Mme Touré", "Mme Sangaré"], classes: 7 },
  { matiere: "ANG", enseignants: ["M. Sidibé", "Mme Coulibaly"], classes: 6 },
  { matiere: "HG", enseignants: ["M. Sangaré"], classes: 5 },
  { matiere: "SVT", enseignants: ["Mme Konaté"], classes: 4 },
  { matiere: "PC", enseignants: ["M. Bah"], classes: 4 },
  { matiere: "REL", enseignants: ["Père Joseph", "Sœur Marie"], classes: 10 },
  { matiere: "EPS", enseignants: ["M. Coulibaly"], classes: 12 },
  { matiere: "INFO", enseignants: ["M. Diabaté"], classes: 6 },
];

export default function SubjectsTeachersAssignment() {
  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Affectation des enseignants aux matières"
      description="Liez chaque matière à ses enseignants titulaires."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvelle affectation</Button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matière</TableHead>
              <TableHead>Enseignants titulaires</TableHead>
              <TableHead>Classes couvertes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {AFFECTATIONS.map((a) => {
              const sub = SUBJECTS.find((s) => s.code === a.matiere);
              return (
                <TableRow key={a.matiere}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${sub?.couleur}`} />
                      {sub?.nom}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {a.enseignants.map((e) => (
                        <Badge key={e} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{a.classes} classes</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
