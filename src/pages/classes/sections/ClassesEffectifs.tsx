import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";

export default function ClassesEffectifs() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading } = useClasses(activeAnnee.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title={`Effectifs par classe (${classes.length})`}
      description="Effectifs et taux de remplissage par classe."
      hideSave
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead className="min-w-[180px]">Remplissage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((c) => {
              const cap = c.capacite ?? 0;
              const eff = c.effectif ?? 0;
              const pct = cap > 0 ? Math.round((eff / cap) * 100) : 0;
              return (
                <TableRow key={c.id}>
                  <TableCell><Badge>{c.nom}</Badge></TableCell>
                  <TableCell className="text-sm">{c.cycle_nom || "—"}</TableCell>
                  <TableCell className="font-semibold">{eff} / {cap || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-semibold w-10">{pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  Aucune classe trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
