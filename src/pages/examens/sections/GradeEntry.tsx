import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenSquare, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useNotes } from "@/hooks/useNotes";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

export default function GradeEntry() {
  const { ecoleId } = useEcoleId();
  const { classes } = useClasses();
  const { eleves } = useEleves();
  const { notes, fetchNotesByEvaluation, saveNotes, loading: notesLoading } = useNotes();
  const [selectedClasse, setSelectedClasse] = useState<string>("");
  const [selectedEval, setSelectedEval] = useState<string>("");
  const [classEvals, setClassEvals] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<Record<string, { note: string; absent: boolean; commentaire: string }>>({});
  const [saving, setSaving] = useState(false);

  // Fetch evaluations for selected class
  useEffect(() => {
    if (!selectedClasse || !ecoleId) { setClassEvals([]); return; }
    supabase
      .from("evaluations")
      .select("id, titre, date_eval, type, matieres(nom)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse)
      .order("date_eval", { ascending: false })
      .then(({ data }) => setClassEvals(data ?? []));
  }, [selectedClasse, ecoleId]);

  // Fetch notes when evaluation selected
  useEffect(() => {
    if (selectedEval) fetchNotesByEvaluation(selectedEval);
  }, [selectedEval, fetchNotesByEvaluation]);

  // Populate local notes from DB
  useEffect(() => {
    const map: Record<string, { note: string; absent: boolean; commentaire: string }> = {};
    notes.forEach((n) => {
      map[n.eleve_id] = {
        note: n.note != null ? String(n.note) : "",
        absent: n.absent ?? false,
        commentaire: n.commentaire ?? "",
      };
    });
    setLocalNotes(map);
  }, [notes]);

  const classeEleves = eleves.filter((e) => e.classe_id === selectedClasse);

  const handleSave = async () => {
    if (!selectedEval) return;
    setSaving(true);
    const notesData = classeEleves.map((e) => {
      const local = localNotes[e.id] ?? { note: "", absent: false, commentaire: "" };
      return {
        eleve_id: e.id,
        note: local.note ? parseFloat(local.note) : null,
        absent: local.absent,
        commentaire: local.commentaire,
      };
    });
    await saveNotes(selectedEval, notesData);
    setSaving(false);
  };

  const updateLocal = (eleveId: string, field: string, value: any) => {
    setLocalNotes((prev) => ({
      ...prev,
      [eleveId]: { ...(prev[eleveId] ?? { note: "", absent: false, commentaire: "" }), [field]: value },
    }));
  };

  return (
    <SettingsSection
      icon={<PenSquare className='h-5 w-5' />}
      title="Saisie des notes"
      description="Sélectionnez une classe et une évaluation pour saisir les notes."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-xs">Classe</Label>
          <Select value={selectedClasse} onValueChange={(v) => { setSelectedClasse(v); setSelectedEval(""); }}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Évaluation</Label>
          <Select value={selectedEval} onValueChange={setSelectedEval} disabled={!selectedClasse}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une évaluation" /></SelectTrigger>
            <SelectContent>
              {classEvals.map((ev: any) => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.titre} — {(ev.matieres as any)?.nom ?? ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEval && (
        <>
          {notesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : classeEleves.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun élève dans cette classe.</p>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Nom de l'élève</TableHead>
                      <TableHead className="w-24">Note / 20</TableHead>
                      <TableHead className="w-20">Absent</TableHead>
                      <TableHead className="w-48">Appréciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classeEleves.map((e) => {
                      const local = localNotes[e.id] ?? { note: "", absent: false, commentaire: "" };
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                          <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              value={local.note}
                              onChange={(ev) => updateLocal(e.id, "note", ev.target.value)}
                              className="h-8 w-20"
                              disabled={local.absent}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={local.absent}
                              onChange={(ev) => updateLocal(e.id, "absent", ev.target.checked)}
                              className="h-4 w-4 accent-primary"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Optionnel..."
                              value={local.commentaire}
                              onChange={(ev) => updateLocal(e.id, "commentaire", ev.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les notes
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {!selectedEval && selectedClasse && classEvals.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucune évaluation pour cette classe.</p>
      )}
    </SettingsSection>
  );
}
