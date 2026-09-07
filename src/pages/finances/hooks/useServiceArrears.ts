import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CategorieRetardDetail } from "../lateNotices";

type ServiceCategorie = "cantine" | "transport";

interface FactureRow {
  eleve_id: string;
  categorie: string;
  montant: number;
  montant_paye: number;
  date_echeance: string;
  statut: string;
}

export interface ServiceArrearsResult {
  /** Élèves ayant au moins une facture (retard ou non) dans une des catégories demandées. */
  concerne: Record<string, Partial<Record<ServiceCategorie, true>>>;
  /** Détail des retards réels par élève/catégorie (échéance strictement passée, reste dû > 0, non annulée). */
  retards: Record<string, Partial<Record<ServiceCategorie, CategorieRetardDetail>>>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Retards cantine/transport pour une classe donnée — même définition du
 * retard que `ServiceBilling.estEnRetard()` / `computeServiceKpis()` :
 * facture non annulée, échéance strictement dans le passé, reste dû > 0.
 * Les remises/bourses/prises en charge sont déjà incluses dans
 * `factures.montant_paye` en amont (mêmes RPC que les encaissements) —
 * rien à traiter séparément ici.
 */
export function useServiceArrears(
  ecoleId: string | null,
  classeId: string | null,
  categories: ServiceCategorie[],
): ServiceArrearsResult {
  const [concerne, setConcerne] = useState<ServiceArrearsResult["concerne"]>({});
  const [retards, setRetards] = useState<ServiceArrearsResult["retards"]>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesKey = categories.slice().sort().join(",");

  const fetchData = useCallback(async () => {
    if (!ecoleId || !classeId || categories.length === 0) {
      setConcerne({});
      setRetards({});
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("factures")
      .select("eleve_id, categorie, montant, montant_paye, date_echeance, statut, eleves!inner(classe_id)")
      .eq("ecole_id", ecoleId)
      .eq("eleves.classe_id", classeId)
      .in("categorie", categories)
      .neq("statut", "annulee");

    if (err) {
      setError(err.message);
      setConcerne({});
      setRetards({});
      setLoading(false);
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const nextConcerne: ServiceArrearsResult["concerne"] = {};
    const nextRetards: ServiceArrearsResult["retards"] = {};

    ((data ?? []) as unknown as FactureRow[]).forEach((f) => {
      const cat = f.categorie as ServiceCategorie;
      if (!categories.includes(cat)) return;

      nextConcerne[f.eleve_id] = { ...(nextConcerne[f.eleve_id] ?? {}), [cat]: true };

      const reste = Math.max(0, Number(f.montant) - Number(f.montant_paye));
      // Échéance strictement passée uniquement : une échéance du jour même
      // n'est pas encore un retard (même règle que mapTrancheStatut côté
      // scolarité : `today > echeance`, pas `>=`).
      if (reste > 0 && f.date_echeance < todayIso) {
        const prev = nextRetards[f.eleve_id]?.[cat];
        nextRetards[f.eleve_id] = {
          ...(nextRetards[f.eleve_id] ?? {}),
          [cat]: {
            montantDu: (prev?.montantDu ?? 0) + reste,
            echeance: prev && prev.echeance < f.date_echeance ? prev.echeance : f.date_echeance,
          },
        };
      }
    });

    setConcerne(nextConcerne);
    setRetards(nextRetards);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoleId, classeId, categoriesKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({ concerne, retards, loading, error, refetch: fetchData }),
    [concerne, retards, loading, error, fetchData],
  );
}
