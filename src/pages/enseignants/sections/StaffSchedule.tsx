import { useEffect, useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useEnseignants } from "@/hooks/useEnseignants";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Creneau {
  id: string;
  jour: number; // 1..6
  heure_debut: string; // HH:MM(:SS)
  heure_fin: string;
  matiere_nom: string | null;
  matiere_couleur: string | null;
  classe_nom: string | null;
  salle_code: string | null;
}

const toMin = (h: string) => {
  const [hh, mm] = h.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm ?? "0", 10);
};
const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
const frDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function StaffSchedule() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { enseignants, loading: loadingEnseignants } = useEnseignants();

  const [enseignantId, setEnseignantId] = useState<string>("");
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));

  // Présélection du premier enseignant
  useEffect(() => {
    if (!enseignantId && enseignants.length > 0) {
      setEnseignantId(enseignants[0].id);
    }
  }, [enseignants, enseignantId]);

  useEffect(() => {
    if (!ecoleId || !anneeId || !enseignantId) {
      setCreneaux([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("creneaux_emploi_temps")
      .select(
        "id, jour, heure_debut, heure_fin, matieres(nom, couleur), classes(nom), salles(code), salle"
      )
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId)
      .eq("enseignant_id", enseignantId)
      .order("jour")
      .order("heure_debut")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          setCreneaux([]);
        } else {
          setCreneaux(
            (data ?? []).map((r: any) => ({
              id: r.id,
              jour: r.jour,
              heure_debut: r.heure_debut,
              heure_fin: r.heure_fin,
              matiere_nom: r.matieres?.nom ?? null,
              matiere_couleur: r.matieres?.couleur ?? null,
              classe_nom: r.classes?.nom ?? null,
              salle_code: r.salles?.code ?? r.salle ?? null,
            }))
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ecoleId, anneeId, enseignantId]);

  // Bornes horaires dynamiques d'après les créneaux (fallback 08:00-17:00)
  const { hours, totalMinutes } = useMemo(() => {
    if (creneaux.length === 0) {
      const h: string[] = [];
      for (let m = 8 * 60; m < 17 * 60; m += 60) h.push(fmt(m));
      return { hours: h, totalMinutes: 0 };
    }
    const min = Math.min(...creneaux.map((c) => toMin(c.heure_debut)));
    const max = Math.max(...creneaux.map((c) => toMin(c.heure_fin)));
    const startHour = Math.floor(min / 60);
    const endHour = Math.ceil(max / 60);
    const h: string[] = [];
    for (let hr = startHour; hr < endHour; hr++) h.push(fmt(hr * 60));
    const total = creneaux.reduce((s, c) => s + (toMin(c.heure_fin) - toMin(c.heure_debut)), 0);
    return { hours: h, totalMinutes: total };
  }, [creneaux]);

  const currentTeacher = enseignants.find((e) => e.id === enseignantId);
  const teacherLabel = currentTeacher
    ? `${currentTeacher.nom} ${currentTeacher.prenom ?? ""}`.trim() +
      (currentTeacher.specialite ? ` — ${currentTeacher.specialite}` : "")
    : "";

  // Grille : pour chaque (jour, heure), trouve le créneau qui commence à cette heure
  const grid = useMemo(() => {
    const m = new Map<string, Creneau>();
    for (const c of creneaux) {
      const hourKey = `${c.jour}-${fmt(Math.floor(toMin(c.heure_debut) / 60) * 60)}`;
      m.set(hourKey, c);
    }
    return m;
  }, [creneaux]);

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  return (
    <SettingsSection
      icon={<CalendarCheck className="h-5 w-5" />}
      title="Emploi du temps enseignant"
      description="Visualisez les cours d'un professeur sur la semaine."
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Select value={enseignantId} onValueChange={setEnseignantId} disabled={loadingEnseignants}>
            <SelectTrigger className="md:w-80">
              <SelectValue placeholder={loadingEnseignants ? "Chargement…" : "Sélectionner un enseignant"} />
            </SelectTrigger>
            <SelectContent>
              {enseignants.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom} {e.prenom}
                  {e.specialite ? ` — ${e.specialite}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => shiftWeek(-1)} aria-label="Semaine précédente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="font-medium">
              Semaine du {frDate(weekStart)}
            </Badge>
            <Button size="icon" variant="ghost" onClick={() => shiftWeek(1)} aria-label="Semaine suivante">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Aujourd'hui
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalMinutes > 0 && (
            <Badge variant="outline">
              {Math.round((totalMinutes / 60) * 10) / 10} h / semaine
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimer
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : enseignants.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Aucun enseignant enregistré. Ajoutez-en dans l'onglet <span className="font-medium">Personnel</span>.
        </div>
      ) : creneaux.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Aucun créneau planifié pour <span className="font-medium">{teacherLabel || "cet enseignant"}</span>.
          <br />
          Créez-les depuis le module <span className="font-medium">Emploi du temps</span>.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-semibold w-20">Heure</th>
                {JOURS.map((j) => (
                  <th key={j} className="text-left p-2 font-semibold min-w-[130px]">
                    {j}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h} className="border-t">
                  <td className="p-2 text-xs text-muted-foreground font-mono">{h}</td>
                  {JOURS.map((_, idx) => {
                    const c = grid.get(`${idx + 1}-${h}`);
                    if (!c) return <td key={idx} className="p-1.5" />;
                    const color = c.matiere_couleur ?? undefined;
                    return (
                      <td key={idx} className="p-1.5 align-top">
                        <div
                          className="rounded-md border px-2 py-1.5"
                          style={
                            color
                              ? {
                                  backgroundColor: `${color}22`,
                                  borderColor: `${color}66`,
                                }
                              : undefined
                          }
                        >
                          <p className="text-xs font-bold" style={color ? { color } : undefined}>
                            {c.matiere_nom ?? "—"}
                          </p>
                          <p className="text-[11px]">{c.classe_nom ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}
                            {c.salle_code ? ` · Salle ${c.salle_code}` : ""}
                          </p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsSection>
  );
}
