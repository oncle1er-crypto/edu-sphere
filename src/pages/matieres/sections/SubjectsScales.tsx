import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { SUBJECTS } from "../data";

export default function SubjectsScales() {
  return (
    <SettingsSection
      icon={<Scale className="h-5 w-5" />}
      title="Barèmes & coefficients"
      description="Échelle de notation conforme au standard MENA (Côte d'Ivoire) et coefficients par matière."
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matière</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-center">Note sur</TableHead>
              <TableHead className="text-center">Coefficient</TableHead>
              <TableHead className="text-center">Note de passage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBJECTS.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.couleur}`} />
                    {s.nom}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{s.categorie}</Badge></TableCell>
                <TableCell className="text-center">
                  <Input type="number" defaultValue={s.noteSur} className="w-16 mx-auto h-8 text-center" />
                </TableCell>
                <TableCell className="text-center">
                  <Input type="number" defaultValue={s.coef} className="w-16 mx-auto h-8 text-center" />
                </TableCell>
                <TableCell className="text-center">
                  <Input type="number" defaultValue={s.noteSur === 20 ? 10 : 5} className="w-16 mx-auto h-8 text-center" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
