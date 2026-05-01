import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import { SUBJECTS } from "../data";

const CLASSES = ["CP A", "CM2", "6ème A", "6ème B", "3ème A", "2nde C", "1ère L", "Tle S1"];

export default function SubjectsClassesAssignment() {
  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title="Affectation des matières aux classes"
      description="Définissez quelles matières sont enseignées dans chaque classe."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvelle affectation</Button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">Matière</TableHead>
              {CLASSES.map((c) => (
                <TableHead key={c} className="text-center text-xs">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBJECTS.slice(0, 10).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="sticky left-0 bg-card font-medium">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.couleur}`} />
                    {s.nom}
                  </div>
                </TableCell>
                {CLASSES.map((c) => {
                  const cycle = c.startsWith("CP") || c.startsWith("CM") ? "Primaire"
                    : c.startsWith("6") || c.startsWith("3") ? "Collège"
                    : "Lycée";
                  const ok = s.cycles.includes(cycle as never);
                  return (
                    <TableCell key={c} className="text-center">
                      {ok ? <Badge variant="secondary">✓</Badge> : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
