import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

export interface Note extends NoteRow {
  eleve_nom?: string;
  eleve_prenom?: string;
  eleve_matricule?: string;
}

export function useNotes() {
  const { ecoleId } = useEcoleId();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotesByEvaluation = useCallback(
    async (evaluationId: string) => {
      if (!ecoleId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*, eleves(nom, prenom, matricule)")
        .eq("ecole_id", ecoleId)
        .eq("evaluation_id", evaluationId)
        .order("created_at");

      if (error) {
        console.error(error);
        toast.error("Erreur chargement notes");
      } else {
        setNotes(
          (data ?? []).map((n: any) => ({
            ...n,
            eleve_nom: n.eleves?.nom ?? "",
            eleve_prenom: n.eleves?.prenom ?? "",
            eleve_matricule: n.eleves?.matricule ?? "",
          }))
        );
      }
      setLoading(false);
    },
    [ecoleId]
  );

  const saveNotes = async (
    evaluationId: string,
    notesData: { eleve_id: string; note: number | null; absent: boolean; commentaire?: string }[]
  ) => {
    if (!ecoleId) return false;

    // Use upsert approach: delete all existing then re-insert
    // This is safer than individual upserts for bulk grade entry
    const { error: delError } = await supabase
      .from("notes")
      .delete()
      .eq("evaluation_id", evaluationId)
      .eq("ecole_id", ecoleId);

    if (delError) { toast.error(delError.message); return false; }

    // Only insert rows that have either a note or are marked absent
    const rows = notesData
      .filter(n => n.note !== null || n.absent)
      .map((n) => ({
        evaluation_id: evaluationId,
        ecole_id: ecoleId,
        eleve_id: n.eleve_id,
        note: n.absent ? null : n.note,
        absent: n.absent,
        commentaire: n.commentaire?.trim() || null,
      }));

    if (rows.length === 0) {
      toast.success("Notes enregistrées (aucune saisie)");
      return true;
    }

    const { error } = await supabase.from("notes").insert(rows);
    if (error) { toast.error(messageErreurBase(error)); return false; }
    toast.success(`${rows.length} note(s) enregistrée(s) avec succès`);
    return true;
  };

  const saveSingleNote = async (
    evaluationId: string,
    eleveId: string,
    data: { note: number | null; absent: boolean; commentaire?: string }
  ) => {
    if (!ecoleId) return false;

    // Check if note exists
    const { data: existing } = await supabase
      .from("notes")
      .select("id")
      .eq("evaluation_id", evaluationId)
      .eq("eleve_id", eleveId)
      .eq("ecole_id", ecoleId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("notes")
        .update({
          note: data.absent ? null : data.note,
          absent: data.absent,
          commentaire: data.commentaire?.trim() || null,
        })
        .eq("id", existing.id);
      if (error) { toast.error(messageErreurBase(error)); return false; }
    } else {
      if (data.note === null && !data.absent) return true; // nothing to save
      const { error } = await supabase.from("notes").insert({
        evaluation_id: evaluationId,
        ecole_id: ecoleId,
        eleve_id: eleveId,
        note: data.absent ? null : data.note,
        absent: data.absent,
        commentaire: data.commentaire?.trim() || null,
      });
      if (error) { toast.error(messageErreurBase(error)); return false; }
    }
    return true;
  };

  return { notes, loading, fetchNotesByEvaluation, saveNotes, saveSingleNote, ecoleId };
}
