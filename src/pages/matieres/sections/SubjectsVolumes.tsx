import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { SUBJECTS } from "../data";

const CYCLES: Array<"Maternelle" | "Primaire" | "Collège" | "Lycée"> = ["Maternelle", "Primaire", "Collège", "Lycée"];

const VOLUMES: Record<string, Record<string, number>> = {
  MATH: { Primaire: 5, Collège: 4, Lycée: 5 },
  FR: { Primaire: 8, Collège: 5, Lycée: 4 },
  ANG: { Primaire: 2, Collège: 4, Lycée: 3 },
  HG: { Collège: 3, Lycée: 4 },
  SVT: { Collège: 2, Lycée: 3 },
  PC: { Collège: 3, Lycée: 4 },
  PHILO: { Lycée: 4 },
  EPS: { Primaire: 2, Collège: 2, Lycée: 2 },
  REL: { Maternelle: 1, Primaire: 1, Collège: 1, Lycée: 1 },
  ECM: { Primaire: 1, Collège: 1 },
  ART: { Maternelle: 3, Primaire: 2, Collège: 1 },
  INFO: { Collège: 1, Lycée: 2 },
  ESP: { Collège: 2, Lycée: 3 },
  EVEIL: { Maternelle: 6 },
};

export default function SubjectsVolumes() {
  return (
    <SettingsSection
      icon={<Clock className="h-5 w-5" />}
      title="Volumes horaires hebdomadaires"
      description="Heures d'enseignement par matière et par cycle (modifiable)."
      hideSave
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">Matière</TableHead>
              {CYCLES.map((c) => (
                <TableHead key={c} className="text-center">{c}</TableHead>
              ))}
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBJECTS.map((s) => {
              const vols = VOLUMES[s.code] || {};
              const total = Object.values(vols).reduce((a, b) => a + b, 0);
              return (
                <TableRow key={s.id}>
                  <TableCell className="sticky left-0 bg-card font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.couleur}`} />
                      {s.nom}
                    </div>
                  </TableCell>
                  {CYCLES.map((c) => (
                    <TableCell key={c} className="text-center">
                      {s.cycles.includes(c) ? (
                        <Input
                          type="number"
                          defaultValue={vols[c] || 0}
                          className="w-16 mx-auto h-8 text-center"
                        />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold">{total} h</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
