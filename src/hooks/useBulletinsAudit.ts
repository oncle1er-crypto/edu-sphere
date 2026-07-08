import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAnneeId } from "./useAnneeId";
import { toast } from "sonner";

export type PeriodeRow = {
  id: string;
  nom: string;
  debut: string;
  fin: string;
  statut: "a_venir" | "en_cours" | "verrouillee";
};

export type PeriodeStats = {
  periode: PeriodeRow;
  totalBulletins: number;
  lockedBulletins: number;
};

export function usePeriodesAvecBulletins() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const [items, setItems] = useState<PeriodeStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!ecoleId || !anneeId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: periodes, error } = await supabase
      .from("periodes")
      .select("id, nom, debut, fin, statut")
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId)
      .order("debut");
    if (error) {
      toast.error("Erreur chargement périodes");
      setLoading(false);
      return;
    }
    const stats: PeriodeStats[] = [];
    for (const p of periodes ?? []) {
      const { data: bulletins } = await supabase
        .from("bulletins_audit")
        .select("id, locked")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId)
        .eq("periode_id", p.id);
      const total = bulletins?.length ?? 0;
      const locked = (bulletins ?? []).filter((b) => b.locked).length;
      stats.push({ periode: p as PeriodeRow, totalBulletins: total, lockedBulletins: locked });
    }
    setItems(stats);
    setLoading(false);
  }, [ecoleId, anneeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setPeriodeStatut = async (periodeId: string, statut: PeriodeRow["statut"]) => {
    const { error } = await supabase.from("periodes").update({ statut }).eq("id", periodeId);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(
      statut === "verrouillee"
        ? "Période verrouillée"
        : statut === "en_cours"
        ? "Période ouverte"
        : "Période marquée à venir"
    );
    await fetchAll();
    return true;
  };

  const verrouillerBulletinsDePeriode = async (periodeId: string) => {
    if (!ecoleId) return false;
    const { data: bulletins, error } = await supabase
      .from("bulletins_audit")
      .select("id")
      .eq("ecole_id", ecoleId)
      .eq("periode_id", periodeId)
      .eq("locked", false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!bulletins || bulletins.length === 0) {
      toast.info("Aucun bulletin à verrouiller");
      return true;
    }
    let ok = 0;
    for (const b of bulletins) {
      const { error: rpcErr } = await supabase.rpc("verrouiller_bulletin", {
        _id: b.id,
        _pdf_hash: null as any,
        _pdf_path: null as any,
      });
      if (!rpcErr) ok++;
    }
    toast.success(`${ok} bulletin(s) verrouillé(s) sur ${bulletins.length}`);
    await fetchAll();
    return true;
  };

  return {
    items,
    loading,
    setPeriodeStatut,
    verrouillerBulletinsDePeriode,
    refresh: fetchAll,
    hasAnnee: !!anneeId,
  };
}
