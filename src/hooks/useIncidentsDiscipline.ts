import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["incidents_discipline"]["Row"];

export interface IncidentDiscipline extends Row {
  eleve_nom?: string;
  classe_nom?: string;
}

export function useIncidentsDiscipline() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [incidents, setIncidents] = useState<IncidentDiscipline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("incidents_discipline")
      .select("*, eleves(nom, prenom), classes(nom)")
      .eq("ecole_id", ecoleId)
      .order("date_incident", { ascending: false })
      .limit(100);
    if (error) { console.error(error); toast.error("Erreur chargement incidents"); }
    else {
      setIncidents((data ?? []).map((d: any) => ({
        ...d,
        eleve_nom: d.eleves ? `${d.eleves.nom} ${d.eleves.prenom}` : "",
        classe_nom: d.classes?.nom ?? "",
      })));
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchIncidents();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchIncidents]);

  const addIncident = async (incident: Database["public"]["Tables"]["incidents_discipline"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase.from("incidents_discipline").insert({ ...incident, ecole_id: ecoleId }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Incident enregistré");
    await fetchIncidents();
    return data;
  };

  return { incidents, loading: loading || ecoleLoading, fetchIncidents, addIncident, ecoleId };
}
