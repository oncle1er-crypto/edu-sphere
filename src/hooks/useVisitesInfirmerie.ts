import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["visites_infirmerie"]["Row"];

export interface VisiteInfirmerie extends Row {
  eleve_nom?: string;
  classe_nom?: string;
}

export function useVisitesInfirmerie() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [visites, setVisites] = useState<VisiteInfirmerie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisites = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("visites_infirmerie")
      .select("*, eleves(nom, prenom), classes(nom)")
      .eq("ecole_id", ecoleId)
      .order("date_visite", { ascending: false })
      .limit(100);
    if (error) { console.error(error); toast.error("Erreur chargement visites"); }
    else {
      setVisites((data ?? []).map((d: any) => ({
        ...d,
        eleve_nom: d.eleves ? `${d.eleves.prenom} ${d.eleves.nom}` : "",
        classe_nom: d.classes?.nom ?? "",
      })));
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchVisites();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchVisites]);

  const addVisite = async (visite: Database["public"]["Tables"]["visites_infirmerie"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("visites_infirmerie").insert({ ...visite, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Visite enregistrée");
    await fetchVisites();
    return data;
  };

  return { visites, loading: loading || ecoleLoading, fetchVisites, addVisite, ecoleId };
}
