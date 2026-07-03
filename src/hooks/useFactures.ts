import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

export interface Facture {
  id: string;
  numero: string;
  libelle: string;
  montant: number;
  montant_paye: number;
  date_emission: string;
  date_echeance: string;
  statut: string;
  notes: string | null;
  eleve_id: string;
  annee_id: string;
  eleve_nom?: string;
  eleve_prenom?: string;
  classe_nom?: string;
}

export function useFactures(scopedAnneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { anneeId: dbAnneeId } = useAnneeId();
  // Si un anneeId scopé est fourni, il prime (chaîne vide = ne rien charger).
  // Sinon, on retombe sur l'année active DB (rétro-compatibilité).
  const scopedProvided = scopedAnneeId !== undefined;
  const effectiveAnneeId = scopedProvided ? scopedAnneeId : dbAnneeId;
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    if (scopedProvided && !effectiveAnneeId) {
      setFactures([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("factures")
      .select("*, eleves(nom, prenom, classe_id, classes(nom))")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });

    if (effectiveAnneeId) query = query.eq("annee_id", effectiveAnneeId);

    const { data, error } = await query;
    if (error) {
      toast.error("Erreur chargement factures");
      setLoading(false);
      return;
    }
    setFactures(
      (data ?? []).map((f: any) => ({
        id: f.id,
        numero: f.numero,
        libelle: f.libelle,
        montant: Number(f.montant),
        montant_paye: Number(f.montant_paye),
        date_emission: f.date_emission,
        date_echeance: f.date_echeance,
        statut: f.statut,
        notes: f.notes,
        eleve_id: f.eleve_id,
        annee_id: f.annee_id,
        eleve_nom: f.eleves?.nom,
        eleve_prenom: f.eleves?.prenom,
        classe_nom: f.eleves?.classes?.nom,
      }))
    );
    setLoading(false);
  }, [ecoleId, effectiveAnneeId, scopedProvided]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetch();
    if (!ecoleLoading && !ecoleId) setLoading(false);
  }, [ecoleLoading, ecoleId, fetch]);

  const addFacture = async (f: {
    eleve_id: string;
    libelle: string;
    montant: number;
    date_echeance: string;
    notes?: string;
  }) => {
    if (!ecoleId || !anneeId) return;
    // Generate next number
    const { count } = await supabase
      .from("factures")
      .select("id", { count: "exact", head: true })
      .eq("ecole_id", ecoleId);
    const num = `FAC-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { error } = await supabase.from("factures").insert({
      ecole_id: ecoleId,
      annee_id: anneeId,
      eleve_id: f.eleve_id,
      numero: num,
      libelle: f.libelle,
      montant: f.montant,
      date_echeance: f.date_echeance,
      statut: "brouillon",
      notes: f.notes || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Facture créée");
    fetch();
  };

  const updateStatut = async (id: string, statut: string) => {
    const { error } = await supabase.from("factures").update({ statut }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Statut mis à jour");
    fetch();
  };

  const deleteFacture = async (id: string) => {
    const { error } = await supabase.from("factures").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Facture supprimée");
    fetch();
  };

  return { factures, loading: loading || ecoleLoading, addFacture, updateStatut, deleteFacture, refetch: fetch, ecoleId };
}
