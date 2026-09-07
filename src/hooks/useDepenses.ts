import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface Depense {
  id: string;
  reference: string | null;
  libelle: string;
  categorie: string | null;
  montant: number;
  fournisseur_id: string | null;
  fournisseur_nom?: string;
  /** Niveau imputé — null = dépense commune (répartie entre les niveaux). */
  cycle_id?: string | null;
  date_depense: string;
  statut: string;
  notes: string | null;
  created_at: string;
  enregistre_par: string | null;
  valide_par: string | null;
  valide_le: string | null;
  rejete_par: string | null;
  rejete_le: string | null;
  motif_rejet: string | null;
  /** Numéro séquentiel formel (BSC-YYYY-00001) assigné par trigger DB à la
   * validation — null tant que la dépense est en_attente ou rejetée. */
  numero_bon_sortie: string | null;
  /** Fiche de paiement à faire signer par le bénéficiaire (facultatif, activé
   * via le bascule dans le formulaire) — null si non utilisée pour cette dépense. */
  fiche_objet: string | null;
  fiche_beneficiaire_nom: string | null;
  fiche_beneficiaire_fonction: string | null;
  fiche_periode_service: string | null;
  /** Chemin de stockage (bucket privé justificatifs-depenses) du document
   * scanné signé, téléversé après impression + signature manuscrite. */
  fiche_piece_jointe_chemin: string | null;
  fiche_piece_jointe_nom: string | null;
  /** Justificatif général (facture, reçu, ticket…) — distinct de
   * fiche_piece_jointe_* : une dépense peut avoir les deux à la fois.
   * Joignable à la création ou tant que la dépense est "en_attente". */
  justificatif_chemin: string | null;
  justificatif_nom: string | null;
}

/** Génère une référence de pièce comptable, même convention que les autres
 * modules (PAY-/TRP-/CTN-… : préfixe + fragment temporel en base36). */
function genererReference(): string {
  return `DEP-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Téléverse un justificatif général (facture/reçu) vers le bucket privé
 * justificatifs-depenses et référence son chemin sur la dépense. Fonction
 * de module (pas de dépendance à l'état du hook) : réutilisée à la fois
 * juste après la création d'une dépense (addDepense) et par l'attache
 * ultérieure (uploadJustificatif, qui vérifie en plus le statut avant
 * d'appeler ceci). Même bucket et même convention de chemin que
 * fiche_piece_jointe_* (ecole_id/depense_id/…), fichier distinct.
 */
async function uploadJustificatifStorage(id: string, ecoleId: string, file: File): Promise<boolean> {
  const ext = file.name.split(".").pop();
  const path = `${ecoleId}/${id}/justificatif-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("justificatifs-depenses").upload(path, file, { upsert: true });
  if (upErr) { toast.error("Erreur de téléversement : " + messageErreurBase(upErr)); return false; }
  const { error } = await supabase.from("depenses").update({ justificatif_chemin: path, justificatif_nom: file.name }).eq("id", id);
  if (error) { toast.error("Erreur : " + messageErreurBase(error)); return false; }
  return true;
}

/** Champs saisis par l'utilisateur à la création — le reste (id, audit, statut initial, référence) est géré par le hook. */
export type NouvelleDepense = {
  libelle: string;
  categorie: string | null;
  montant: number;
  fournisseur_id: string | null;
  cycle_id?: string | null;
  date_depense: string;
  notes: string | null;
  fiche_objet?: string | null;
  fiche_beneficiaire_nom?: string | null;
  fiche_beneficiaire_fonction?: string | null;
  fiche_periode_service?: string | null;
};

/** Champs modifiables via l'édition — uniquement autorisée tant que la dépense est "en_attente" (cf. updateDepense). */
export type DepenseEditable = Partial<
  Pick<
    Depense,
    | "libelle" | "categorie" | "montant" | "fournisseur_id" | "cycle_id" | "date_depense" | "notes"
    | "fiche_objet" | "fiche_beneficiaire_nom" | "fiche_beneficiaire_fonction" | "fiche_periode_service"
  >
>;

export function useDepenses(range?: { from?: string; to?: string }) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, matchesCycle } = useNiveau();
  const { user } = useAuth();
  const [depensesRaw, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const rangeProvided = range !== undefined;
  const from = range?.from;
  const to = range?.to;

  /**
   * Vue niveau : dépenses du niveau + dépenses communes (cycle_id null).
   * La quote-part des communes est calculée dans les rapports comptables.
   */
  const depenses = useMemo(
    () => (isGlobal ? depensesRaw : depensesRaw.filter((d) => matchesCycle(d.cycle_id))),
    [depensesRaw, isGlobal, matchesCycle],
  );

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    if (rangeProvided && (!from || !to)) {
      setDepenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("depenses")
      .select("*, fournisseurs(nom)")
      .eq("ecole_id", ecoleId);
    if (from) q = q.gte("date_depense", from);
    if (to) q = q.lte("date_depense", to);
    const { data, error } = await q.order("date_depense", { ascending: false });
    if (!error && data) {
      setDepenses(data.map((d: any) => ({ ...d, montant: Number(d.montant), fournisseur_nom: d.fournisseurs?.nom })));
    }
    setLoading(false);
  }, [ecoleId, from, to, rangeProvided]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  /**
   * Crée la dépense puis, si un fichier est fourni, téléverse immédiatement
   * le justificatif général sur la ligne créée (nécessite l'id retourné par
   * l'insert). En cas d'échec du téléversement, la dépense reste créée sans
   * justificatif — l'utilisateur peut le joindre ensuite tant qu'elle est
   * "en_attente" (cf. uploadJustificatif), pas de rollback de la dépense.
   */
  const addDepense = async (d: NouvelleDepense, justificatifFile?: File) => {
    if (!ecoleId) return;
    if (!(d.montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    const { data: inserted, error } = await supabase.from("depenses").insert({
      ...d,
      ecole_id: ecoleId,
      reference: genererReference(),
      statut: "en_attente",
      enregistre_par: user?.id ?? null,
    }).select("id").single();
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense enregistrée");
    if (justificatifFile && inserted?.id) {
      await uploadJustificatifStorage(inserted.id, ecoleId, justificatifFile);
    }
    fetch();
  };

  const trouver = (id: string) => depensesRaw.find((d) => d.id === id);

  /** Édition réservée aux dépenses non encore validées/rejetées, pour ne jamais
   * modifier silencieusement un montant déjà reflété dans un bilan/grand livre. */
  const updateDepense = async (id: string, patch: DepenseEditable) => {
    const cible = trouver(id);
    if (!cible) return;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent être modifiées. Réouvrez-la d'abord si besoin.");
      return;
    }
    if (patch.montant !== undefined && !(patch.montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    const { error } = await supabase.from("depenses").update(patch).eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense modifiée");
    fetch();
  };

  /** Suppression réservée aux dépenses non encore validées/rejetées — une dépense
   * validée peut déjà être reflétée dans un bilan/export ; on la conserve pour l'audit. */
  const deleteDepense = async (id: string) => {
    const cible = trouver(id);
    if (!cible) return;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent être supprimées.");
      return;
    }
    const { error } = await supabase.from("depenses").delete().eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense supprimée");
    fetch();
  };

  const validerDepense = async (id: string) => {
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "validee", valide_par: user?.id ?? null, valide_le: new Date().toISOString(), rejete_par: null, rejete_le: null, motif_rejet: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense validée");
    fetch();
  };

  /** Valide plusieurs dépenses en attente en une seule opération (sélection multiple dans la liste). */
  const validerPlusieurs = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "validee", valide_par: user?.id ?? null, valide_le: new Date().toISOString(), rejete_par: null, rejete_le: null, motif_rejet: null })
      .in("id", ids);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success(`${ids.length} dépense(s) validée(s)`);
    fetch();
  };

  const rejeterDepense = async (id: string, motif: string) => {
    if (!motif.trim()) { toast.error("Un motif de rejet est requis."); return; }
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "rejetee", rejete_par: user?.id ?? null, rejete_le: new Date().toISOString(), motif_rejet: motif.trim(), valide_par: null, valide_le: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense rejetée");
    fetch();
  };

  /** Repasse une dépense validée ou rejetée en "en_attente" (correction), en effaçant les marqueurs d'audit précédents. */
  const reouvrirDepense = async (id: string) => {
    const { error } = await supabase
      .from("depenses")
      .update({ statut: "en_attente", valide_par: null, valide_le: null, rejete_par: null, rejete_le: null, motif_rejet: null })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return; }
    toast.success("Dépense réouverte pour correction");
    fetch();
  };

  /**
   * Téléverse le document scanné (fiche de paiement signée à la main) vers le
   * bucket privé justificatifs-depenses, puis référence son chemin sur la
   * dépense. Réservé aux dépenses en_attente (comme les autres modifications)
   * — une fois validée, la dépense n'est plus éditable, cf. updateDepense.
   */
  const uploadJustificatifFiche = async (id: string, file: File) => {
    if (!ecoleId) return false;
    const cible = trouver(id);
    if (!cible) return false;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent recevoir un justificatif.");
      return false;
    }
    const ext = file.name.split(".").pop();
    const path = `${ecoleId}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("justificatifs-depenses").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Erreur de téléversement : " + messageErreurBase(upErr)); return false; }
    const { error } = await supabase
      .from("depenses")
      .update({ fiche_piece_jointe_chemin: path, fiche_piece_jointe_nom: file.name })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + messageErreurBase(error)); return false; }
    toast.success("Justificatif joint à la dépense");
    fetch();
    return true;
  };

  /** Télécharge le justificatif scanné (bucket privé, pas d'URL publique). */
  const telechargerJustificatifFiche = async (d: Depense) => {
    if (!d.fiche_piece_jointe_chemin) return;
    const { data, error } = await supabase.storage.from("justificatifs-depenses").download(d.fiche_piece_jointe_chemin);
    if (error || !data) { toast.error("Erreur de téléchargement : " + (error ? messageErreurBase(error) : "")); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.fiche_piece_jointe_nom || "justificatif.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Joint (ou remplace) le justificatif général d'une dépense déjà créée —
   * réservé aux dépenses "en_attente", comme les autres modifications
   * (cf. updateDepense). Pour joindre un justificatif à la création, passer
   * le fichier directement à addDepense.
   */
  const uploadJustificatif = async (id: string, file: File) => {
    if (!ecoleId) return false;
    const cible = trouver(id);
    if (!cible) return false;
    if (cible.statut !== "en_attente") {
      toast.error("Seules les dépenses en attente peuvent recevoir un justificatif.");
      return false;
    }
    const ok = await uploadJustificatifStorage(id, ecoleId, file);
    if (!ok) return false;
    toast.success("Justificatif joint à la dépense");
    fetch();
    return true;
  };

  /**
   * Ouvre le justificatif dans un nouvel onglet via une URL signée temporaire
   * (bucket privé) — même mécanisme que StudentDetailDrawer/StudentsDocuments
   * pour les autres documents stockés en privé. Fonctionne pour n'importe
   * quel chemin du bucket justificatifs-depenses (justificatif général ou
   * fiche signée), quel que soit le statut de la dépense : consulter une
   * pièce déjà jointe reste possible après validation, seule l'ajout/le
   * remplacement est bloqué (cf. uploadJustificatif ci-dessus).
   */
  const previewJustificatif = async (chemin: string) => {
    const { data, error } = await supabase.storage.from("justificatifs-depenses").createSignedUrl(chemin, 300);
    if (error || !data?.signedUrl) { toast.error("Impossible d'ouvrir le fichier : " + (error ? messageErreurBase(error) : "")); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return {
    depenses,
    loading: loading || ecoleLoading,
    addDepense,
    updateDepense,
    deleteDepense,
    validerDepense,
    validerPlusieurs,
    rejeterDepense,
    reouvrirDepense,
    uploadJustificatifFiche,
    telechargerJustificatifFiche,
    uploadJustificatif,
    previewJustificatif,
    refetch: fetch,
    ecoleId,
  };
}
