import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface BulletinPaie {
  id: string;
  enseignant_id: string;
  enseignant_nom?: string;
  enseignant_fonction?: string;
  /** Cycle de rattachement de l'enseignant (`enseignants.cycle_id`). `null` = personnel commun (prorata). */
  enseignant_cycle_id?: string | null;
  mois: number;
  annee: number;
  salaire_brut: number;
  retenues: number;
  net_a_payer: number;
  statut: string;
  date_paiement: string | null;
}

export function useBulletinsPaie(mois?: number, annee?: number) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const m = mois ?? (now.getMonth() + 1);
  const a = annee ?? now.getFullYear();

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bulletins_paie")
      .select("*, enseignants(nom, prenom, specialite, cycle_id)")
      .eq("ecole_id", ecoleId)
      .eq("mois", m)
      .eq("annee", a)
      .order("created_at");
    if (data) {
      setBulletins(data.map((b: any) => ({
        ...b,
        salaire_brut: Number(b.salaire_brut),
        retenues: Number(b.retenues),
        net_a_payer: Number(b.net_a_payer),
        enseignant_nom: b.enseignants ? `${b.enseignants.nom} ${b.enseignants.prenom}` : "—",
        enseignant_fonction: b.enseignants?.specialite ?? "Enseignant",
        enseignant_cycle_id: b.enseignants?.cycle_id ?? null,
      })));
    }
    setLoading(false);
  }, [ecoleId, m, a]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const addBulletin = async (b: Pick<BulletinPaie, "enseignant_id" | "salaire_brut" | "retenues" | "net_a_payer">) => {
    if (!ecoleId) return;
    const { error } = await supabase.from("bulletins_paie").insert({ ...b, ecole_id: ecoleId, mois: m, annee: a });
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Bulletin créé");
    fetch();
  };

  const payBulletin = async (id: string) => {
    const { error } = await supabase.from("bulletins_paie").update({ statut: "paye", date_paiement: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Paiement enregistré");
    fetch();
  };

  return { bulletins, loading: loading || ecoleLoading, addBulletin, payBulletin, refetch: fetch, ecoleId, mois: m, annee: a };
}
