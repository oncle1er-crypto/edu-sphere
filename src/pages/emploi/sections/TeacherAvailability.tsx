import { useState, useEffect, useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";

const days = [
  { i: 1, label: "Lundi" },
  { i: 2, label: "Mardi" },
  { i: 3, label: "Mercredi" },
  { i: 4, label: "Jeudi" },
  { i: 5, label: "Vendredi" },
  { i: 6, label: "Samedi" },
];
const plages: Array<{ key: "matin" | "apres_midi"; label: string }> = [
  { key: "matin", label: "Matin" },
  { key: "apres_midi", label: "Après-midi" },
];

type Key = `${number}-${"matin" | "apres_midi"}`;

export default function TeacherAvailability() {
  const { enseignants, loading: ensLoading } = useEnseignants();
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [selected, setSelected] = useState<string>("");
  const [dispo, setDispo] = useState<Record<Key, boolean>>({} as any);
  const [creneauxHours, setCreneauxHours] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected && enseignants.length) setSelected(enseignants[0].id);
  }, [enseignants, selected]);

  // Load availability + workload
  useEffect(() => {
    if (!selected || !ecoleId) return;
    (async () => {
      const { data } = await supabase
        .from("disponibilites_enseignants" as any)
        .select("jour, plage, disponible")
        .eq("enseignant_id", selected);
      const map: Record<Key, boolean> = {} as any;
      days.forEach((d) => plages.forEach((p) => { map[`${d.i}-${p.key}` as Key] = true; }));
      ((data as any[]) ?? []).forEach((r) => {
        map[`${r.jour}-${r.plage}` as Key] = !!r.disponible;
      });
      setDispo(map);

      // Workload (heures par semaine)
      if (anneeId) {
        const { data: cren } = await supabase
          .from("creneaux_emploi_temps" as any)
          .select("heure_debut, heure_fin")
          .eq("enseignant_id", selected)
          .eq("annee_id", anneeId);
        const total = ((cren as any[]) ?? []).reduce((sum, c) => {
          const [h1, m1] = c.heure_debut.split(":").map(Number);
          const [h2, m2] = c.heure_fin.split(":").map(Number);
          return sum + (h2 * 60 + m2 - h1 * 60 - m1) / 60;
        }, 0);
        setCreneauxHours(Math.round(total * 10) / 10);
      }
    })();
  }, [selected, ecoleId, anneeId]);

  const toggle = async (jour: number, plage: "matin" | "apres_midi") => {
    const key = `${jour}-${plage}` as Key;
    const next = !dispo[key];
    setDispo((p) => ({ ...p, [key]: next }));
    if (!ecoleId || !selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("disponibilites_enseignants" as any)
      .upsert(
        { ecole_id: ecoleId, enseignant_id: selected, jour, plage, disponible: next },
        { onConflict: "enseignant_id,jour,plage" }
      );
    setSaving(false);
    if (error) {
      toast.error("Erreur enregistrement");
      setDispo((p) => ({ ...p, [key]: !next }));
    }
  };

  const dispoCount = useMemo(
    () => Object.values(dispo).filter(Boolean).length,
    [dispo]
  );

  return (
    <SettingsSection
      title="Disponibilités enseignants"
      description="Cochez les créneaux où l'enseignant est disponible. Les modifications sont enregistrées automatiquement."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="max-w-md">
        <Select value={selected} onValueChange={setSelected} disabled={ensLoading}>
          <SelectTrigger><SelectValue placeholder="Choisir un enseignant…" /></SelectTrigger>
          <SelectContent>
            {enseignants.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nom} {e.prenom}{e.specialite ? ` — ${e.specialite}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border bg-muted p-2 text-xs">Créneau</th>
                  {days.map((d) => (
                    <th key={d.i} className="border bg-muted p-2 text-xs">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plages.map((p) => (
                  <tr key={p.key}>
                    <td className="border p-2 text-xs font-semibold bg-muted/50">{p.label}</td>
                    {days.map((d) => {
                      const key = `${d.i}-${p.key}` as Key;
                      return (
                        <td key={key} className="border p-2 text-center">
                          <Checkbox
                            checked={dispo[key] ?? true}
                            onCheckedChange={() => toggle(d.i, p.key)}
                            disabled={saving}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground flex justify-between">
            <span>
              Disponibilités : <strong className="text-foreground">{dispoCount} / 12</strong> demi-journées
            </span>
            <span>
              Charge actuelle EDT : <strong className="text-foreground">{creneauxHours}h</strong> / semaine
            </span>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
