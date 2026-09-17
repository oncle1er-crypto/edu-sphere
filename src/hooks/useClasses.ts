import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { STATUTS_ACTIFS } from "@/lib/eleveStatus";

type ClasseRow = Database["public"]["Tables"]["classes"]["Row"];

export interface Classe extends ClasseRow {
  cycle_nom?: string;
  effectif?: number;
  prof_nom?: string;
}

export function useClasses(anneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, cycleIds } = useNiveau();
  const [classesRaw, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtrage par niveau (Primaire = Maternelle + Primaire / Secondaire)
  const classes = useMemo(() => {
    if (isGlobal) return classesRaw;
    const set = new Set(cycleIds);
    return classesRaw.filter((c) => c.cycle_id && set.has(c.cycle_id));
  }, [classesRaw, isGlobal, cycleIds]);

  const fetchClasses = useCallback(async () => {
    if (!ecoleId) return;
    if (anneeId === "") { setClasses([]); setLoading(false); return; }
    setLoading(true);

    let q = supabase
      .from("classes")
      .select("*, cycles(nom), enseignants(nom, prenom)")
      .eq("ecole_id", ecoleId);
    if (anneeId) q = q.eq("annee_id", anneeId);
    const { data, error } = await q.order("nom");

    if (error) {
      console.error(error);
      toast.error("Erreur chargement classes");
      setLoading(false);
      return;
    }

    // L'effectif ne compte que les élèves réellement présents (cf. STATUTS_ACTIFS) :
    // les sortis / exclus / transférés sont archivés dans « Anciens élèves » et ne
    // doivent plus peser dans les effectifs ni les taux de remplissage.
    const effectifs = new Map<string, number>();
    const pageSize = 1000;
    for (let page = 0; page < 30; page++) {
      let eq = supabase
        .from("eleves")
        .select("classe_id")
        .eq("ecole_id", ecoleId)
        .in("statut", STATUTS_ACTIFS as unknown as string[])
        .not("classe_id", "is", null)
        .order("id")
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (anneeId) eq = eq.eq("annee_id", anneeId);
      const { data: rows, error: errE } = await eq;
      if (errE) { console.error(errE); break; }
      (rows ?? []).forEach((r: any) => {
        effectifs.set(r.classe_id, (effectifs.get(r.classe_id) ?? 0) + 1);
      });
      if (!rows || rows.length < pageSize) break;
    }

    setClasses(
      (data ?? []).map((c: any) => ({
        ...c,
        cycle_nom: c.cycles?.nom ?? "",
        effectif: effectifs.get(c.id) ?? 0,
        prof_nom: c.enseignants ? `${c.enseignants.nom} ${c.enseignants.prenom}` : "",
      }))
    );

    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchClasses();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetchClasses]);

  const addClass = async (classe: Database["public"]["Tables"]["classes"]["Insert"]) => {
    if (!ecoleId) return null;
    const { data, error } = await supabase
      .from("classes")
      .insert({ ...classe, ecole_id: ecoleId })
      .select()
      .single();
    if (error) { toast.error(messageErreurBase(error)); return null; }
    toast.success("Classe créée");
    await fetchClasses();
    return data;
  };

  return { classes, loading: loading || ecoleLoading, fetchClasses, addClass, ecoleId };
}
