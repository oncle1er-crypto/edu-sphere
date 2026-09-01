import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type LigneType = "gain" | "retenue" | "charge_patronale";

export interface RhLigne {
  code: string;
  libelle: string;
  type: LigneType;
  base: number;
  taux: number | null;
  montant: number;
  ordre: number;
}

export interface RhBulletinLigne {
  id: string;
  bulletin_id: string;
  rubrique_code: string;
  libelle: string;
  type: string;
  base: number;
  taux: number | null;
  montant: number;
  ordre: number;
}

export type EtatPersonnel = "pret" | "a_corriger" | "deja_cree";

export interface ApercuPersonnel {
  ok: boolean;
  personnel_id: string;
  matricule: string | null;
  nom: string;
  prenom: string;
  poste: string | null;
  anciennete_annees: number;
  anciennete_taux: number | null;
  total_gains: number;
  brut_imposable: number;
  base_cnps: number;
  total_retenues: number;
  total_charges_patronales: number;
  net_a_payer: number;
  cout_employeur: number;
  lignes: RhLigne[];
  alertes: string[];
  etat: EtatPersonnel;
}

export interface ApercuPaie {
  ok: boolean;
  mois: number;
  annee: number;
  prets: number;
  a_corriger: number;
  deja_crees: number;
  net_estime: number;
  personnels: ApercuPersonnel[];
}

export interface BulletinPaieRh {
  id: string;
  enseignant_id: string;
  mois: number;
  annee: number;
  statut: string;
  salaire_brut: number;
  retenues: number;
  net_a_payer: number;
  total_gains: number;
  brut_imposable: number;
  base_cnps: number;
  total_charges_patronales: number;
  cout_employeur: number;
  anciennete_annees: number;
  date_paiement: string | null;
  valide_le: string | null;
  notes: string | null;
  personnel_nom: string;
  personnel_matricule: string | null;
  personnel_poste: string | null;
  /** Cycle de rattachement (`enseignants.cycle_id`). `null` = personnel commun. */
  personnel_cycle_id: string | null;
}

const ERREURS: Record<string, string> = {
  not_authorized: "Réservé aux administrateurs et directeurs",
  bulletin_non_valide: "Validez le bulletin avant de le payer",
  bulletin_deja_paye: "Ce bulletin est déjà payé",
  bulletin_introuvable: "Bulletin introuvable",
  bulletin_deja_valide: "Ce bulletin est déjà validé : impossible de le supprimer",
  not_authenticated: "Session expirée, reconnectez-vous",
};

function traduire(code?: string | null) {
  if (!code) return "Une erreur est survenue";
  return ERREURS[code] ?? code;
}

/** Statut normalisé : les anciennes lignes `en_attente` valent `brouillon`. */
export function normaliserStatut(statut: string): "brouillon" | "valide" | "paye" {
  if (statut === "paye") return "paye";
  if (statut === "valide") return "valide";
  return "brouillon";
}

export function useRhPaie(mois: number, annee: number) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [bulletins, setBulletins] = useState<BulletinPaieRh[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBulletins = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bulletins_paie")
      .select(
        "id, enseignant_id, mois, annee, statut, salaire_brut, retenues, net_a_payer, total_gains, brut_imposable, base_cnps, total_charges_patronales, cout_employeur, anciennete_annees, date_paiement, valide_le, notes, enseignants(nom, prenom, matricule, poste, specialite, cycle_id)",
      )
      .eq("ecole_id", ecoleId)
      .eq("mois", mois)
      .eq("annee", annee)
      .order("created_at");

    if (error) {
      toast.error(messageErreurBase(error));
      setLoading(false);
      return;
    }

    setBulletins(
      (data ?? []).map((b) => {
        const p = b.enseignants as {
          nom: string;
          prenom: string;
          matricule: string | null;
          poste: string | null;
          specialite: string | null;
          cycle_id: string | null;
        } | null;
        return {
          id: b.id,
          enseignant_id: b.enseignant_id,
          mois: b.mois,
          annee: b.annee,
          statut: b.statut,
          salaire_brut: Number(b.salaire_brut ?? 0),
          retenues: Number(b.retenues ?? 0),
          net_a_payer: Number(b.net_a_payer ?? 0),
          total_gains: Number(b.total_gains ?? 0),
          brut_imposable: Number(b.brut_imposable ?? 0),
          base_cnps: Number(b.base_cnps ?? 0),
          total_charges_patronales: Number(b.total_charges_patronales ?? 0),
          cout_employeur: Number(b.cout_employeur ?? 0),
          anciennete_annees: Number(b.anciennete_annees ?? 0),
          date_paiement: b.date_paiement,
          valide_le: b.valide_le,
          notes: b.notes,
          personnel_nom: p ? `${p.nom} ${p.prenom}` : "—",
          personnel_matricule: p?.matricule ?? null,
          personnel_poste: p?.poste ?? p?.specialite ?? null,
          personnel_cycle_id: p?.cycle_id ?? null,
        };
      }),
    );
    setLoading(false);
  }, [ecoleId, mois, annee]);

  useEffect(() => {
    if (ecoleLoading) return;
    if (!ecoleId) {
      setLoading(false);
      return;
    }
    fetchBulletins();
  }, [ecoleLoading, ecoleId, fetchBulletins]);

  const apercu = useCallback(
    async (m: number, a: number): Promise<ApercuPaie | null> => {
      if (!ecoleId) return null;
      const { data, error } = await supabase.rpc("rh_apercu_paie", {
        _ecole_id: ecoleId,
        _mois: m,
        _annee: a,
      });
      if (error) {
        toast.error(messageErreurBase(error));
        return null;
      }
      const res = data as unknown as ApercuPaie & { erreur?: string };
      if (!res?.ok) {
        toast.error(traduire(res?.erreur));
        return null;
      }
      return res;
    },
    [ecoleId],
  );

  const genererBrouillons = useCallback(
    async (m: number, a: number): Promise<number | null> => {
      if (!ecoleId) return null;
      const { data, error } = await supabase.rpc("rh_generer_brouillons", {
        _ecole_id: ecoleId,
        _mois: m,
        _annee: a,
      });
      if (error) {
        toast.error(messageErreurBase(error));
        return null;
      }
      const res = data as unknown as { ok: boolean; crees?: number; erreur?: string };
      if (!res?.ok) {
        toast.error(traduire(res?.erreur));
        return null;
      }
      toast.success(`${res.crees ?? 0} brouillon(s) créé(s)`);
      await fetchBulletins();
      return res.crees ?? 0;
    },
    [ecoleId, fetchBulletins],
  );

  const validerBulletin = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.rpc("rh_valider_bulletin", { _bulletin_id: id });
      if (error) {
        toast.error(messageErreurBase(error));
        return false;
      }
      const res = data as unknown as { ok: boolean; erreur?: string };
      if (!res?.ok) {
        toast.error(traduire(res?.erreur));
        return false;
      }
      toast.success("Bulletin validé");
      await fetchBulletins();
      return true;
    },
    [fetchBulletins],
  );

  const payerBulletin = useCallback(
    async (id: string, date: string) => {
      const { data, error } = await supabase.rpc("rh_payer_bulletin", {
        _bulletin_id: id,
        _date_paiement: date,
      });
      if (error) {
        toast.error(messageErreurBase(error));
        return false;
      }
      const res = data as unknown as { ok: boolean; erreur?: string };
      if (!res?.ok) {
        toast.error(traduire(res?.erreur));
        return false;
      }
      toast.success("Bulletin payé — dépenses comptables créées");
      await fetchBulletins();
      return true;
    },
    [fetchBulletins],
  );

  const supprimerBulletin = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.rpc("rh_supprimer_bulletin", { _bulletin_id: id });
      if (error) {
        toast.error(messageErreurBase(error));
        return false;
      }
      const res = data as unknown as { ok: boolean; erreur?: string };
      if (!res?.ok) {
        toast.error(traduire(res?.erreur));
        return false;
      }
      toast.success("Bulletin supprimé");
      await fetchBulletins();
      return true;
    },
    [fetchBulletins],
  );

  const lignesBulletin = useCallback(async (bulletinId: string): Promise<RhBulletinLigne[]> => {
    const { data, error } = await supabase
      .from("rh_bulletin_lignes")
      .select("id, bulletin_id, rubrique_code, libelle, type, base, taux, montant, ordre")
      .eq("bulletin_id", bulletinId)
      .order("type")
      .order("ordre");
    if (error) {
      toast.error(messageErreurBase(error));
      return [];
    }
    return (data ?? []).map((l) => ({
      ...l,
      base: Number(l.base ?? 0),
      taux: l.taux === null ? null : Number(l.taux),
      montant: Number(l.montant ?? 0),
      ordre: Number(l.ordre ?? 0),
    }));
  }, []);

  return {
    ecoleId,
    bulletins,
    loading: loading || ecoleLoading,
    refetch: fetchBulletins,
    apercu,
    genererBrouillons,
    validerBulletin,
    payerBulletin,
    lignesBulletin,
  };
}
