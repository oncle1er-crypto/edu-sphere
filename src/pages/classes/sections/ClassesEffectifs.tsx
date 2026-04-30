import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap } from "lucide-react";

const data = [
  { classe: "PS A", effectif: 22, cap: 25, garcons: 12, filles: 10 },
  { classe: "CP A", effectif: 35, cap: 35, garcons: 18, filles: 17 },
  { classe: "CM2", effectif: 32, cap: 35, garcons: 16, filles: 16 },
  { classe: "6ème A", effectif: 38, cap: 40, garcons: 20, filles: 18 },
  { classe: "6ème B", effectif: 35, cap: 40, garcons: 17, filles: 18 },
  { classe: "3ème A", effectif: 36, cap: 40, garcons: 19, filles: 17 },
  { classe: "2nde C", effectif: 28, cap: 35, garcons: 13, filles: 15 },
  { classe: "1ère L", effectif: 24, cap: 30, garcons: 8, filles: 16 },
  { classe: "Tle S1", effectif: 28, cap: 30, garcons: 16, filles: 12 },
];

export default function ClassesEffectifs() {
  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Effectifs par classe"
      description="Répartition garçons / filles et taux de remplissage."
      hideSave
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead>Garçons</TableHead>
              <TableHead>Filles</TableHead>
              <TableHead className="min-w-[180px]">Remplissage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => {
              const pct = Math.round((d.effectif / d.cap) * 100);
              return (
                <TableRow key={d.classe}>
                  <TableCell><Badge>{d.classe}</Badge></TableCell>
                  <TableCell className="font-semibold">{d.effectif} / {d.cap}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-blue-500/15 text-blue-700">{d.garcons}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="bg-pink-500/15 text-pink-700">{d.filles}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-semibold w-10">{pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
