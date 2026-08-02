import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import type { Database } from "@/integrations/supabase/types";

export type ProviderChannelStats =
  Database["public"]["Views"]["v_notifications_fournisseurs"]["Row"];

export interface ProviderStats {
  provider: string;
  total: number;
  envoyes: number;
  echecs: number;
  moisCourant: number;
  moisCourantDecompte: number;
  dernierEnvoi: string | null;
  derniereErreur: string | null;
  canaux: ProviderChannelStats[];
}

function aggregate(rows: ProviderChannelStats[]): Record<string, ProviderStats> {
  const map: Record<string, ProviderStats> = {};
  for (const row of rows) {
    const key = row.provider ?? "inconnu";
    const acc = map[key] ?? {
      provider: key,
      total: 0,
      envoyes: 0,
      echecs: 0,
      moisCourant: 0,
      moisCourantDecompte: 0,
      dernierEnvoi: null,
      derniereErreur: null,
      canaux: [],
    };
    acc.total += row.total ?? 0;
    acc.envoyes += row.envoyes ?? 0;
    acc.echecs += row.echecs ?? 0;
    acc.moisCourant += row.mois_courant ?? 0;
    acc.moisCourantDecompte += row.mois_courant_decompte ?? 0;
    if (row.dernier_envoi && (!acc.dernierEnvoi || row.dernier_envoi > acc.dernierEnvoi)) {
      acc.dernierEnvoi = row.dernier_envoi;
    }
    if (row.derniere_erreur && !acc.derniereErreur) {
      acc.derniereErreur = row.derniere_erreur;
    }
    acc.canaux.push(row);
    map[key] = acc;
  }
  return map;
}

export function useNotificationProviders() {
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<ProviderChannelStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("v_notifications_fournisseurs")
      .select("*")
      .eq("ecole_id", ecoleId);
    if (error) {
      console.error("Error fetching v_notifications_fournisseurs:", error);
    }
    setRows(data ?? []);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const byProvider = aggregate(rows);
  const volumeMoisTotal = Object.values(byProvider).reduce((s, p) => s + p.moisCourant, 0);

  return {
    rows,
    byProvider,
    volumeMoisTotal,
    loading,
    refetch: fetchRows,
    get: (provider: string): ProviderStats | null => byProvider[provider] ?? null,
  };
}
