import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Indique pour chaque élève s'il est À JOUR sur sa scolarité :
 * = aucune tranche échue (echeance < today) avec montant > paye.
 * Les tranches futures non payées n'empêchent pas l'envoi.
 */
export type ScolariteStatus = {
  aJour: boolean;
  resteDu: number;
  /** Aucune tranche n'existe pour cet élève (scolarité non configurée). */
  nonConfiguree: boolean;
};

export function useBulletinScolariteStatus(ecoleId: string | null, eleveIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, ScolariteStatus>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!ecoleId || eleveIds.length === 0) { setStatusMap({}); return; }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("tranches")
      .select("eleve_id, montant, paye, echeance")
      .eq("ecole_id", ecoleId)
      .in("eleve_id", eleveIds);

    // Défaut : non configurée => non à jour (bloque l'envoi tant que la
    // grille tarifaire n'est pas appliquée à l'élève).
    const map: Record<string, ScolariteStatus> = {};
    for (const id of eleveIds) map[id] = { aJour: false, resteDu: 0, nonConfiguree: true };
    for (const t of (data ?? []) as any[]) {
      const cur = map[t.eleve_id];
      if (!cur) continue;
      // Dès qu'une tranche existe, la scolarité est considérée comme configurée
      // et l'élève est à jour par défaut, sauf tranche échue impayée.
      if (cur.nonConfiguree) {
        map[t.eleve_id] = { aJour: true, resteDu: 0, nonConfiguree: false };
      }
      const reste = Number(t.montant ?? 0) - Number(t.paye ?? 0);
      if (reste > 0 && t.echeance && t.echeance < today) {
        const c = map[t.eleve_id];
        map[t.eleve_id] = { aJour: false, resteDu: c.resteDu + reste, nonConfiguree: false };
      }
    }
    setStatusMap(map);
    setLoading(false);
  }, [ecoleId, eleveIds.join("|")]); // eslint-disable-line

  useEffect(() => { refresh(); }, [refresh]);

  return { statusMap, loading, refresh };
}
