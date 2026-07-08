import { useEffect, useState, useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, CalendarDays, AlertTriangle, Users, DoorOpen, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Creneau {
  classe_id: string;
  enseignant_id: string | null;
  salle: string | null;
  salle_id: string | null;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  classes?: { nom: string } | null;
}


const overlaps = (aD: string, aF: string, bD: string, bF: string) => aD < bF && bD < aF;
const minutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function TimetableDashboard() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId || !anneeId) return;
    (async () => {
      setLoading(true);
      const [crRes, clRes] = await Promise.all([
        supabase
          .from("creneaux_emploi_temps" as any)
          .select("classe_id, enseignant_id, salle, salle_id, jour, heure_debut, heure_fin, classes(nom)")
          .eq("ecole_id", ecoleId)
          .eq("annee_id", anneeId),

        supabase
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("ecole_id", ecoleId)
          .eq("annee_id", anneeId),
      ]);
      if (crRes.error) console.error(crRes.error);
      setCreneaux(((crRes.data as any[]) ?? []) as Creneau[]);
      setTotalClasses(clRes.count ?? 0);
      setLoading(false);
    })();
  }, [ecoleId, anneeId]);

  const stats = useMemo(() => {
    const classesPlanifiees = new Set(creneaux.map((c) => c.classe_id)).size;
    const enseignantsAssignes = new Set(creneaux.map((c) => c.enseignant_id).filter(Boolean)).size;
    const sallesOccupees = new Set(creneaux.map((c) => c.salle).filter((s) => s && s.trim())).size;

    let conflits = 0;
    for (let i = 0; i < creneaux.length; i++) {
      for (let j = i + 1; j < creneaux.length; j++) {
        const a = creneaux[i], b = creneaux[j];
        if (a.jour !== b.jour) continue;
        if (!overlaps(a.heure_debut, a.heure_fin, b.heure_debut, b.heure_fin)) continue;
        if (a.classe_id === b.classe_id) conflits++;
        else if (a.enseignant_id && a.enseignant_id === b.enseignant_id) conflits++;
        else if (a.salle && b.salle && a.salle === b.salle) conflits++;
      }
    }

    const byDay: Record<number, number> = {};
    creneaux.forEach((c) => {
      byDay[c.jour] = (byDay[c.jour] ?? 0) + (minutes(c.heure_fin) - minutes(c.heure_debut));
    });
    const maxMin = Math.max(1, ...Object.values(byDay));
    const days = [1, 2, 3, 4, 5].map((d) => [JOURS[d], Math.round(((byDay[d] ?? 0) / maxMin) * 100)] as [string, number]);

    return { classesPlanifiees, enseignantsAssignes, sallesOccupees, conflits, days };
  }, [creneaux]);

  const kpis = [
    { label: "Classes planifiées", value: `${stats.classesPlanifiees} / ${totalClasses}`, icon: CalendarDays },
    { label: "Enseignants assignés", value: String(stats.enseignantsAssignes), icon: Users },
    { label: "Salles utilisées", value: String(stats.sallesOccupees), icon: DoorOpen },
    { label: "Conflits détectés", value: String(stats.conflits), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Tableau de bord — Emploi du temps"
        description="Vue d'ensemble de la planification hebdomadaire."
        icon={<LayoutDashboard className="h-5 w-5" />}
        hideSave
      >
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} index={i} />
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Charge horaire par jour (relative)</h3>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-2">
                  {stats.days.map(([d, v]) => (
                    <div key={d}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{d}</span><span className="font-semibold">{v}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Couverture des classes</h3>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : totalClasses === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune classe pour l'année en cours.</p>
              ) : stats.classesPlanifiees === totalClasses ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Toutes les classes ont au moins un créneau planifié.
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  {totalClasses - stats.classesPlanifiees} classe(s) sans aucun créneau planifié.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SettingsSection>
    </div>
  );
}
