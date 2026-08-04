import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface ModeleExigences {
  id: string;
  ecole_id: string;
  nom: string;
  description: string | null;
  est_defaut: boolean;
  types_obligatoires: string[];
  types_optionnels: string[];
  created_at: string;
  updated_at: string;
}

export function useModelesExigences() {
  const { ecoleId } = useEcoleId();
  const [modeles, setModeles] = useState<ModeleExigences[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("modeles_exigences_documents" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("est_defaut", { ascending: false })
      .order("nom");
    if (!error) setModeles(((data as any) ?? []) as ModeleExigences[]);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetch(); }, [fetch]);

  const saveModele = async (
    m: Partial<ModeleExigences> & { nom: string; types_obligatoires: string[]; types_optionnels: string[] }
  ) => {
    if (!ecoleId) return null;
    if (m.est_defaut) {
      // Unset other defaults
      await supabase
        .from("modeles_exigences_documents" as any)
        .update({ est_defaut: false } as any)
        .eq("ecole_id", ecoleId);
    }
    const payload: any = {
      ecole_id: ecoleId,
      nom: m.nom,
      description: m.description ?? null,
      est_defaut: m.est_defaut ?? false,
      types_obligatoires: m.types_obligatoires,
      types_optionnels: m.types_optionnels,
    };
    let res;
    if (m.id) {
      res = await supabase
        .from("modeles_exigences_documents" as any)
        .update(payload)
        .eq("id", m.id)
        .select()
        .single();
    } else {
      res = await supabase
        .from("modeles_exigences_documents" as any)
        .insert(payload)
        .select()
        .single();
    }
    if (res.error) { toast.error(res.messageErreurBase(error)); return null; }
    toast.success("Modèle enregistré");
    await fetch();
    return res.data as any;
  };

  const deleteModele = async (id: string) => {
    const { error } = await supabase
      .from("modeles_exigences_documents" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success("Modèle supprimé");
    await fetch();
    return true;
  };

  const applyToEleves = async (modele: ModeleExigences, eleveIds: string[]) => {
    if (!ecoleId || eleveIds.length === 0) return false;
    const rows: any[] = [];
    for (const eleveId of eleveIds) {
      for (const t of modele.types_obligatoires) {
        rows.push({ ecole_id: ecoleId, eleve_id: eleveId, type_document: t, obligatoire: true });
      }
      for (const t of modele.types_optionnels) {
        rows.push({ ecole_id: ecoleId, eleve_id: eleveId, type_document: t, obligatoire: false });
      }
    }
    if (rows.length === 0) {
      toast.error("Le modèle est vide");
      return false;
    }
    const { error } = await supabase
      .from("exigences_documents_eleves" as any)
      .upsert(rows, { onConflict: "eleve_id,type_document" } as any);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success(`Modèle appliqué à ${eleveIds.length} élève(s)`);
    return true;
  };

  return { modeles, loading, saveModele, deleteModele, applyToEleves, refetch: fetch };
}
