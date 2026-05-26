import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface Decision {
  id: string;
  ecole_id: string;
  annee_id: string;
  eleve_id: string;
  classe_origine_id: string;
  decision: string;
  classe_destination_id: string | null;
  motif: string | null;
  decide_par: string | null;
  statut: string;
  valide_par: string | null;
  valide_le: string | null;
  verrouille_par: string | null;
  verrouille_le: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  ecole_id: string;
  decision_id: string;
  action: string;
  ancien_statut: string | null;
  nouveau_statut: string | null;
  effectue_par: string;
  details: any;
  created_at: string;
}

export function useDecisionsFinAnnee() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDecisions = useCallback(
    async (anneeId: string) => {
      if (!ecoleId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("decisions_fin_annee" as any)
        .select("*")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId);
      if (error) {
        toast.error("Erreur chargement décisions");
        console.error(error);
      }
      setDecisions((data as any as Decision[]) ?? []);
      setLoading(false);
    },
    [ecoleId]
  );

  const fetchAuditLog = useCallback(
    async (anneeId: string) => {
      if (!ecoleId) return;
      // Get decision ids for this year then fetch audit
      const { data } = await supabase
        .from("audit_decisions_fin_annee" as any)
        .select("*")
        .eq("ecole_id", ecoleId)
        .order("created_at", { ascending: false })
        .limit(200);
      setAuditLog((data as any as AuditEntry[]) ?? []);
    },
    [ecoleId]
  );

  const saveBulkDecisions = useCallback(
    async (
      anneeId: string,
      items: {
        eleve_id: string;
        classe_origine_id: string;
        decision: string;
        classe_destination_id?: string | null;
        motif?: string;
      }[]
    ) => {
      if (!ecoleId || !user) return false;
      const payload = items.map((d) => ({
        ...d,
        annee_id: anneeId,
        ecole_id: ecoleId,
        decide_par: user.id,
        statut: "brouillon",
      }));
      const { error } = await supabase
        .from("decisions_fin_annee" as any)
        .upsert(payload as any, { onConflict: "ecole_id,annee_id,eleve_id" });
      if (error) {
        toast.error("Erreur enregistrement en masse");
        console.error(error);
        return false;
      }
      // Audit entries
      for (const item of items) {
        await supabase.from("audit_decisions_fin_annee" as any).insert({
          ecole_id: ecoleId,
          decision_id: "00000000-0000-0000-0000-000000000000", // placeholder, will be updated
          action: "creation",
          ancien_statut: null,
          nouveau_statut: "brouillon",
          effectue_par: user.id,
          details: { decision: item.decision, eleve_id: item.eleve_id },
        } as any);
      }
      toast.success(`${items.length} décision(s) enregistrée(s) (brouillon)`);
      await fetchDecisions(anneeId);
      return true;
    },
    [ecoleId, user, fetchDecisions]
  );

  const changeStatut = useCallback(
    async (
      anneeId: string,
      decisionIds: string[],
      newStatut: "valide" | "verrouille",
      classeId?: string
    ) => {
      if (!ecoleId || !user) return false;

      const updates: any = { statut: newStatut, updated_at: new Date().toISOString() };
      if (newStatut === "valide") {
        updates.valide_par = user.id;
        updates.valide_le = new Date().toISOString();
      } else if (newStatut === "verrouille") {
        updates.verrouille_par = user.id;
        updates.verrouille_le = new Date().toISOString();
      }

      const previousStatut = newStatut === "valide" ? "brouillon" : "valide";

      // Update all matching decisions
      const { error } = await supabase
        .from("decisions_fin_annee" as any)
        .update(updates)
        .eq("ecole_id", ecoleId)
        .eq("annee_id", anneeId)
        .eq("statut", previousStatut)
        .in("id", decisionIds);

      if (error) {
        toast.error("Erreur changement de statut");
        console.error(error);
        return false;
      }

      // Audit
      for (const did of decisionIds) {
        await supabase.from("audit_decisions_fin_annee" as any).insert({
          ecole_id: ecoleId,
          decision_id: did,
          action: newStatut === "valide" ? "validation" : "verrouillage",
          ancien_statut: previousStatut,
          nouveau_statut: newStatut,
          effectue_par: user.id,
        } as any);
      }

      const label = newStatut === "valide" ? "validée(s)" : "verrouillée(s)";
      toast.success(`${decisionIds.length} décision(s) ${label}`);
      await fetchDecisions(anneeId);
      return true;
    },
    [ecoleId, user, fetchDecisions]
  );

  const appliquerDecisions = useCallback(
    async (anneeId: string) => {
      if (!ecoleId || !user) return null;
      const { data, error } = await supabase.rpc("appliquer_decisions_fin_annee" as any, {
        _ecole_id: ecoleId,
        _annee_id: anneeId,
      });
      if (error) {
        toast.error("Erreur application des décisions");
        console.error(error);
        return null;
      }
      toast.success("Décisions appliquées avec succès !");
      await fetchDecisions(anneeId);
      return data;
    },
    [ecoleId, user, fetchDecisions]
  );

  return {
    decisions,
    auditLog,
    loading,
    fetchDecisions,
    fetchAuditLog,
    saveBulkDecisions,
    changeStatut,
    appliquerDecisions,
  };
}
