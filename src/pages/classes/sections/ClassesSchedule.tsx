import { useState, useEffect } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEmploiDuTemps } from "@/hooks/useEmploiDuTemps";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HEURES = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const COULEURS = [
  "bg-blue-500/15 border-blue-500/30 text-blue-700",
  "bg-rose-500/15 border-rose-500/30 text-rose-700",
  "bg-amber-500/15 border-amber-500/30 text-amber-700",
  "bg-violet-500/15 border-violet-500/30 text-violet-700",
  "bg-emerald-500/15 border-emerald-500/30 text-emerald-700",
  "bg-cyan-500/15 border-cyan-500/30 text-cyan-700",
  "bg-orange-500/15 border-orange-500/30 text-orange-700",
  "bg-pink-500/15 border-pink-500/30 text-pink-700",
];

export default function ClassesSchedule() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading: classesLoading } = useClasses(activeAnnee.id);
  const { creneaux, loading: creneauxLoading, fetchCreneaux } = useEmploiDuTemps();
  const [selectedClasseId, setSelectedClasseId] = useState("");

  useEffect(() => {
    if (classes.length > 0 && !selectedClasseId) {
      setSelectedClasseId(classes[0].id);
    }
  }, [classes, selectedClasseId]);

  useEffect(() => {
    if (selectedClasseId) {
      fetchCreneaux(selectedClasseId);
    }
  }, [selectedClasseId, fetchCreneaux]);

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build color map by matiere
  const matiereColors = new Map<string, string>();
  let colorIdx = 0;
  creneaux.forEach((c) => {
    if (c.matiere_nom && !matiereColors.has(c.matiere_nom)) {
      matiereColors.set(c.matiere_nom, COULEURS[colorIdx % COULEURS.length]);
      colorIdx++;
    }
  });

  return (
    <SettingsSection
      icon={<CalendarRange className="h-5 w-5" />}
      title="Emploi du temps de classe"
      description="Planning hebdomadaire pour une classe sélectionnée."
      hideSave
    >
      <div className="flex items-center gap-3">
        <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {creneauxLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {creneaux.length === 0 && !creneauxLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun créneau configuré pour cette classe. Configurez l'emploi du temps dans le module dédié.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-semibold">Heure</th>
                {JOURS.map((j) => (
                  <th key={j} className="text-left p-2 font-semibold min-w-[120px]">{j}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEURES.map((h) => {
                const hourCreneaux = JOURS.map((_, ji) =>
                  creneaux.find(
                    (c) => c.jour === ji + 1 && c.heure_debut <= h && c.heure_fin > h
                  )
                );
                const hasAny = hourCreneaux.some(Boolean);
                if (!hasAny && !["07:00", "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].includes(h)) return null;
                return (
                  <tr key={h} className="border-t">
                    <td className="p-2 text-xs text-muted-foreground font-mono">{h}</td>
                    {JOURS.map((_, ji) => {
                      const c = hourCreneaux[ji];
                      // Only render block on start hour
                      const isStart = c && c.heure_debut === h;
                      if (c && !isStart) return <td key={ji} />;
                      return (
                        <td key={ji} className="p-1.5 align-top">
                          {isStart ? (
                            <div className={`rounded-md border px-2 py-1.5 ${matiereColors.get(c.matiere_nom ?? "") ?? ""}`}>
                              <p className="text-xs font-bold">{c.matiere_nom}</p>
                              <p className="text-[11px] opacity-80">{c.enseignant_nom || ""}</p>
                              <p className="text-[10px] opacity-70">{c.salle || ""}</p>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsSection>
  );
}
