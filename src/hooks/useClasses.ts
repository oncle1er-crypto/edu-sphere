import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";

export interface Classe {
  id: string;
  nom: string;
  cycle_id: string;
  annee_id: string;
  ecole_id: string;
  capacite: number | null;
  salle: string | null;
  professeur_principal_id: string | null;
  cycle_nom?: string;
  effectif?: number;
  prof_nom?: string;
}

export function useClasses() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);

    // Get classes with cycle name
    const { data: classesData, error } = await supabase
      .from("classes")
      .select("*, cycles(nom)")
      .eq("ecole_id", ecoleId)
      .order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement classes");
      setLoading(false);
      return;
    }

    // Count students per class
    const { data: countData } = await supabase
      .from("eleves")
      .select("classe_id")
      .eq("ecole_id", ecoleId)
      .not("classe_id", "is", null);

    const counts: Record<string, number> = {};
    (countData ?? []).forEach((e: any) => {
      counts[e.classe_id] = (counts[e.classe_id] || 0) + 1;
    });

    // Get teacher names for professeur_principal
    const profIds = (classesData ?? [])
      .map((c: any) => c.professeur_principal_id)
      .filter(Boolean);

    let profMap: Record<string, string> = {};
    if (profIds.length > 0) {
      const { data: profs } = await supabase
        .from("enseignants")
        .select("id, nom, prenom")
        .in("id", profIds);
      (profs ?? []).forEach((p: any) => {
        profMap[p.id] = `${p.prenom} ${p.nom}`;
      });
    }

    setClasses(
      (classesData ?? []).map((c: any) => ({
        ...c,
        cycle_nom: c.cycles?.nom ?? "",
        effectif: counts[c.id] || 0,
        prof_nom: c.professeur_principal_id ? profMap[c.professeur_principal_id] ?? "" : "",
      }))
    );
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchClasses();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchClasses]);

  const addClass = async (classe: { nom: string; cycle_id: string; annee_id: string; capacite?: number; salle?: string }) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("classes")
      .insert({ ...classe, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Classe créée");
    await fetchClasses();
    return data;
  };

  return { classes, loading: loading || ecoleLoading, fetchClasses, addClass, ecoleId };
}
