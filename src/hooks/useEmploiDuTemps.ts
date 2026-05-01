import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";

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
  created_at: string;
  updated_at: string;
  // joined
  matiere_nom?: string;
  enseignant_nom?: string;
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
        .select("*, matieres(nom), enseignants(nom, prenom)")
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
            ? `${c.enseignants.prenom} ${c.enseignants.nom}`
            : "",
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
      salle?: string;
    }) => {
      if (!ecoleId || !anneeId) return null;
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
        toast.error("Erreur ajout créneau : " + error.message);
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
      updates: Partial<{
        matiere_id: string;
        enseignant_id: string | null;
        jour: number;
        heure_debut: string;
        heure_fin: string;
        salle: string;
      }>
    ) => {
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
    []
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
