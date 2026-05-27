import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Indique pour chaque élève s'il est À JOUR sur sa scolarité :
 * = aucune tranche échue (echeance < today) avec montant > paye.
 * Les tranches futures non payées n'empêchent pas l'envoi.
 */
export function useBulletinScolariteStatus(ecoleId: string | null, eleveIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, { aJour: boolean; resteDu: number }>>({});
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

    const map: Record<string, { aJour: boolean; resteDu: number }> = {};
    for (const id of eleveIds) map[id] = { aJour: true, resteDu: 0 };
    for (const t of (data ?? []) as any[]) {
      const reste = Number(t.montant ?? 0) - Number(t.paye ?? 0);
      if (reste > 0 && t.echeance && t.echeance < today) {
        const cur = map[t.eleve_id] ?? { aJour: true, resteDu: 0 };
        map[t.eleve_id] = { aJour: false, resteDu: cur.resteDu + reste };
      }
    }
    setStatusMap(map);
    setLoading(false);
  }, [ecoleId, eleveIds.join("|")]); // eslint-disable-line

  useEffect(() => { refresh(); }, [refresh]);

  return { statusMap, loading, refresh };
}
