import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface ExigenceDoc {
  id: string;
  ecole_id: string;
  eleve_id: string;
  type_document: string;
  obligatoire: boolean;
}

const DEFAULT_REQUIRED = new Set([
  "acte_naissance",
  "photo_identite",
  "certificat_scolarite",
]);

export function isObligatoire(type: string, exigences: ExigenceDoc[]): boolean {
  const row = exigences.find((e) => e.type_document === type);
  if (row) return row.obligatoire;
  return DEFAULT_REQUIRED.has(type);
}

export function useExigencesDocuments(eleveId?: string) {
  const { ecoleId } = useEcoleId();
  const [exigences, setExigences] = useState<ExigenceDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!ecoleId || !eleveId) { setExigences([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("exigences_documents_eleves" as any)
      .select("*")
      .eq("eleve_id", eleveId);
    if (!error) setExigences(((data as any) ?? []) as ExigenceDoc[]);
    setLoading(false);
  }, [ecoleId, eleveId]);

  useEffect(() => { fetch(); }, [fetch]);

  const setObligatoire = async (type: string, value: boolean) => {
    if (!ecoleId || !eleveId) return;
    const existing = exigences.find((e) => e.type_document === type);
    if (existing) {
      const { error } = await supabase
        .from("exigences_documents_eleves" as any)
        .update({ obligatoire: value } as any)
        .eq("id", existing.id);
      if (error) { toast.error(messageErreurBase(error)); return; }
    } else {
      const { error } = await supabase
        .from("exigences_documents_eleves" as any)
        .insert({
          ecole_id: ecoleId,
          eleve_id: eleveId,
          type_document: type,
          obligatoire: value,
        } as any);
      if (error) { toast.error(messageErreurBase(error)); return; }
    }
    toast.success(value ? "Document marqué obligatoire" : "Document marqué optionnel");
    await fetch();
  };

  return { exigences, loading, setObligatoire, isObligatoire: (t: string) => isObligatoire(t, exigences), refetch: fetch };
}
