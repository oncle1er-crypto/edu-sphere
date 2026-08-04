import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

async function checkOverlap(
  ecoleId: string,
  anneeId: string,
  classeId: string,
  enseignantId: string | null,
  jour: number,
  heureDebut: string,
  heureFin: string,
  excludeId?: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("check_creneau_overlap" as any, {
    _ecole_id: ecoleId,
    _annee_id: anneeId,
    _classe_id: classeId,
    _enseignant_id: enseignantId,
    _jour: jour,
    _heure_debut: heureDebut,
    _heure_fin: heureFin,
    _exclude_id: excludeId ?? null,
  });
  if (error) { console.error(error); return null; }
  return (data as string) ?? null;
}

async function checkFeasibility(
  ecoleId: string,
  anneeId: string,
  classeId: string,
  enseignantId: string | null,
  salleId: string | null,
  jour: number,
  heureDebut: string,
  heureFin: string,
  excludeId?: string
): Promise<{ ok: boolean; errors: string[]; warnings: string[] } | null> {
  const { data, error } = await supabase.rpc("check_creneau_feasibility" as any, {
    _ecole_id: ecoleId,
    _annee_id: anneeId,
    _classe_id: classeId,
    _enseignant_id: enseignantId,
    _salle_id: salleId,
    _jour: jour,
    _heure_debut: heureDebut,
    _heure_fin: heureFin,
    _exclude_id: excludeId ?? null,
  });
  if (error) { console.error(error); return null; }
  return data as any;
}

export interface Creneau {
  id: string;
  ecole_id: string;
  annee_id: string;
  classe_id: string;
  matiere_id: string;
  enseignant_id: string | null;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  salle_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  matiere_nom?: string;
  enseignant_nom?: string;
  salle_code?: string;
}


export function useEmploiDuTemps() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCreneaux = useCallback(
    async (classeId: string) => {
      if (!ecoleId || !anneeId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("creneaux_emploi_temps" as any)
        .select("*, matieres(nom), enseignants(nom, prenom), salles(code, nom)")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId)
        .eq("classe_id", classeId)
        .order("jour")
        .order("heure_debut");

      if (error) {
        toast.error("Erreur chargement emploi du temps");
        console.error(error);
        setLoading(false);
        return;
      }

      setCreneaux(
        ((data as any[]) ?? []).map((c) => ({
          ...c,
          matiere_nom: c.matieres?.nom ?? "",
          enseignant_nom: c.enseignants
            ? `${c.enseignants.nom} ${c.enseignants.prenom}`
            : "",
          salle_code: c.salles?.code ?? c.salle ?? "",
        }))
      );
      setLoading(false);
    },
    [ecoleId, anneeId]
  );

  const addCreneau = useCallback(
    async (creneau: {
      classe_id: string;
      matiere_id: string;
      enseignant_id?: string | null;
      jour: number;
      heure_debut: string;
      heure_fin: string;
      salle_id?: string | null;
      salle?: string | null;
    }) => {
      if (!ecoleId || !anneeId) return null;
      // Overlap check (classe + enseignant)
      const conflict = await checkOverlap(
        ecoleId, anneeId, creneau.classe_id,
        creneau.enseignant_id ?? null,
        creneau.jour, creneau.heure_debut, creneau.heure_fin
      );
      if (conflict) { toast.error("Conflit : " + conflict); return null; }

      // Feasibility check (dispo prof, salle occupée, capacité)
      const feas = await checkFeasibility(
        ecoleId, anneeId, creneau.classe_id,
        creneau.enseignant_id ?? null,
        creneau.salle_id ?? null,
        creneau.jour, creneau.heure_debut, creneau.heure_fin
      );
      if (feas && !feas.ok) {
        toast.error(feas.errors.join(" • "));
        return null;
      }
      if (feas && feas.warnings.length > 0) {
        feas.warnings.forEach((w) => toast.warning(w));
      }

      const { data, error } = await supabase
        .from("creneaux_emploi_temps" as any)
        .insert({
          ...creneau,
          ecole_id: ecoleId,
          annee_id: anneeId,
        } as any)
        .select()
        .single();
      if (error) {
        toast.error("Erreur ajout créneau : " + messageErreurBase(error));
        console.error(error);
        return null;
      }
      toast.success("Créneau ajouté");
      return data;
    },
    [ecoleId, anneeId]
  );


  const deleteCreneau = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("creneaux_emploi_temps" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur suppression");
      console.error(error);
      return false;
    }
    toast.success("Créneau supprimé");
    setCreneaux((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, []);

  const updateCreneau = useCallback(
    async (
      id: string,
      classeId: string,
      updates: Partial<{
        matiere_id: string;
        enseignant_id: string | null;
        jour: number;
        heure_debut: string;
        heure_fin: string;
        salle: string;
      }>
    ) => {
      if (!ecoleId || !anneeId) return false;
      // Find existing creneau to merge values for overlap check
      const existing = creneaux.find((c) => c.id === id);
      const jour = updates.jour ?? existing?.jour ?? 1;
      const heure_debut = updates.heure_debut ?? existing?.heure_debut ?? "08:00";
      const heure_fin = updates.heure_fin ?? existing?.heure_fin ?? "09:00";
      const enseignant_id = updates.enseignant_id !== undefined
        ? updates.enseignant_id
        : existing?.enseignant_id ?? null;

      const conflict = await checkOverlap(
        ecoleId, anneeId, classeId, enseignant_id, jour, heure_debut, heure_fin, id
      );
      if (conflict) { toast.error("Conflit : " + conflict); return false; }

      const { error } = await supabase
        .from("creneaux_emploi_temps" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) {
        toast.error("Erreur mise à jour");
        console.error(error);
        return false;
      }
      toast.success("Créneau modifié");
      return true;
    },
    [ecoleId, anneeId, creneaux]
  );

  return {
    creneaux,
    loading,
    fetchCreneaux,
    addCreneau,
    deleteCreneau,
    updateCreneau,
    ecoleId,
    anneeId,
  };
}
