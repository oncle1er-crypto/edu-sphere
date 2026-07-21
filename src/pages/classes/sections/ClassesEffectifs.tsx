import { useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import ApplyScolariteButton from "../components/ApplyScolariteButton";

export default function ClassesEffectifs() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading } = useClasses(activeAnnee.id);
  const { eleves } = useEleves(activeAnnee.id);

  const sexByClasse = useMemo(() => {
    const map = new Map<string, { f: number; g: number }>();
    eleves.forEach((e) => {
      if (!e.classe_id) return;
      const entry = map.get(e.classe_id) ?? { f: 0, g: 0 };
      const sx = String(e.sexe ?? "").toUpperCase();
      if (sx === "F") entry.f++; else if (sx === "M" || sx === "G") entry.g++;
      map.set(e.classe_id, entry);
    });
    return map;
  }, [eleves]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  const alertBadge = (pct: number, cap: number) => {
    if (cap === 0) return null;
    if (pct > 100) return <Badge className="bg-rose-500/15 text-rose-700 text-[10px]">Sur-effectif</Badge>;
    if (pct > 90) return <Badge className="bg-amber-500/15 text-amber-700 text-[10px]">Presque plein</Badge>;
    if (pct < 50) return <Badge className="bg-slate-500/15 text-slate-700 text-[10px]">Sous-effectif</Badge>;
    return null;
  };

  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title={`Effectifs par classe (${classes.length})`}
      description="Effectifs, répartition filles/garçons et taux de remplissage."
      hideSave
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead className="text-center">Filles</TableHead>
              <TableHead className="text-center">Garçons</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead className="min-w-[200px]">Remplissage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((c) => {
              const cap = c.capacite ?? 0;
              const eff = c.effectif ?? 0;
              const pct = cap > 0 ? Math.round((eff / cap) * 100) : 0;
              const sx = sexByClasse.get(c.id) ?? { f: 0, g: 0 };
              const barColor =
                pct > 100 ? "[&>div]:bg-rose-500" :
                pct > 90 ? "[&>div]:bg-amber-500" :
                pct < 50 ? "[&>div]:bg-slate-400" : "";
              return (
                <TableRow key={c.id}>
                  <TableCell><Badge>{c.nom}</Badge></TableCell>
                  <TableCell className="text-sm">{c.cycle_nom || "—"}</TableCell>
                  <TableCell className="text-center font-semibold text-pink-600">{sx.f}</TableCell>
                  <TableCell className="text-center font-semibold text-blue-600">{sx.g}</TableCell>
                  <TableCell className="font-semibold">{eff} / {cap || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(pct, 100)} className={`h-2 flex-1 ${barColor}`} />
                      <span className="text-xs font-semibold w-10">{pct}%</span>
                      {alertBadge(pct, cap)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ApplyScolariteButton classeId={c.id} classeNom={c.nom} />
                  </TableCell>
                </TableRow>
              );
            })}
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
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
