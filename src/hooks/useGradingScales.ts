import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ParamRow = Database["public"]["Tables"]["parametres_matieres"]["Row"];
type ParamUpdate = Database["public"]["Tables"]["parametres_matieres"]["Update"];

export type ClasseMatiereRow = {
  id: string;
  classe_id: string;
  matiere_id: string;
  coefficient: number;
  volume_horaire_hebdo: number | null;
  matiere_nom: string;
  matiere_note_sur: number;
  matiere_note_passage: number;
  matiere_categorie: string | null;
};

/** Params globaux barème pour l'école. */
export function useParametresMatieres() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [params, setParams] = useState<ParamRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchParams = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("parametres_matieres")
      .select("*")
      .eq("ecole_id", ecoleId)
      .maybeSingle();
    if (error) toast.error("Erreur chargement barème");
    if (!data && !error) {
      // Créer les paramètres par défaut si aucun n'existe.
      const { data: created } = await supabase
        .from("parametres_matieres")
        .insert({ ecole_id: ecoleId })
        .select()
        .single();
      setParams(created ?? null);
    } else {
      setParams(data);
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchParams();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchParams]);

  const saveParams = async (patch: ParamUpdate) => {
    if (!params) return false;
    const { error } = await supabase
      .from("parametres_matieres")
      .update(patch)
      .eq("id", params.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Barème enregistré");
    await fetchParams();
    return true;
  };

  return { params, loading: loading || ecoleLoading, saveParams };
}

/** Matières + coefficients pour une classe donnée. */
export function useClasseMatieres(classeId: string | null) {
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<ClasseMatiereRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    if (!ecoleId || !classeId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("classe_matieres")
      .select(
        "id, classe_id, matiere_id, coefficient, volume_horaire_hebdo, matieres(nom, note_sur, note_passage, categorie)"
      )
      .eq("ecole_id", ecoleId)
      .eq("classe_id", classeId);
    if (error) {
      toast.error("Erreur chargement matières classe");
      setLoading(false);
      return;
    }
    setRows(
      (data ?? []).map((r: any) => ({
        id: r.id,
        classe_id: r.classe_id,
        matiere_id: r.matiere_id,
        coefficient: Number(r.coefficient) || 0,
        volume_horaire_hebdo: r.volume_horaire_hebdo,
        matiere_nom: r.matieres?.nom ?? "—",
        matiere_note_sur: r.matieres?.note_sur ?? 20,
        matiere_note_passage: Number(r.matieres?.note_passage) || 10,
        matiere_categorie: r.matieres?.categorie ?? null,
      }))
    );
    setLoading(false);
  }, [ecoleId, classeId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const updateCoefficient = async (id: string, coefficient: number) => {
    const { error } = await supabase
      .from("classe_matieres")
      .update({ coefficient })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    await fetchRows();
    return true;
  };

  const updateVolume = async (id: string, volume_horaire_hebdo: number) => {
    const { error } = await supabase
      .from("classe_matieres")
      .update({ volume_horaire_hebdo })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    await fetchRows();
    return true;
  };

  const attachMatiere = async (matiereId: string, coefficient = 1) => {
    if (!ecoleId || !classeId) return false;
    const { error } = await supabase.from("classe_matieres").insert({
      ecole_id: ecoleId,
      classe_id: classeId,
      matiere_id: matiereId,
      coefficient,
    });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Matière ajoutée à la classe");
    await fetchRows();
    return true;
  };

  const detachMatiere = async (id: string) => {
    const { error } = await supabase.from("classe_matieres").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Matière retirée");
    await fetchRows();
    return true;
  };

  return { rows, loading, updateCoefficient, updateVolume, attachMatiere, detachMatiere, refresh: fetchRows };
}
