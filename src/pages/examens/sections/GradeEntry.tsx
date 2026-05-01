import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PenSquare, Save, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNotes } from "@/hooks/useNotes";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

interface LocalNote {
  note: string;
  absent: boolean;
  commentaire: string;
  saved: boolean;
}

export default function GradeEntry() {
  const { ecoleId } = useEcoleId();
  const { classes } = useClasses();
  const { eleves } = useEleves();
  const { notes, fetchNotesByEvaluation, saveNotes, saveSingleNote, loading: notesLoading } = useNotes();
  const [selectedClasse, setSelectedClasse] = useState<string>("");
  const [selectedEval, setSelectedEval] = useState<string>("");
  const [classEvals, setClassEvals] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<Record<string, LocalNote>>({});
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [evalInfo, setEvalInfo] = useState<{ bareme: number; matiere: string; type: string } | null>(null);

  // Fetch evaluations for selected class
  useEffect(() => {
    if (!selectedClasse || !ecoleId) { setClassEvals([]); return; }
    supabase
      .from("evaluations")
      .select("id, titre, date_eval, type, bareme, matieres(nom)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse)
      .order("date_eval", { ascending: false })
      .then(({ data }) => setClassEvals(data ?? []));
  }, [selectedClasse, ecoleId]);

  // Fetch notes when evaluation selected
  useEffect(() => {
    if (selectedEval) {
      fetchNotesByEvaluation(selectedEval);
      const ev = classEvals.find(e => e.id === selectedEval);
      if (ev) {
        setEvalInfo({
          bareme: ev.bareme ?? 20,
          matiere: (ev.matieres as any)?.nom ?? "",
          type: ev.type ?? "devoir",
        });
      }
    } else {
      setEvalInfo(null);
    }
  }, [selectedEval, fetchNotesByEvaluation, classEvals]);

  // Populate local notes from DB
  useEffect(() => {
    const map: Record<string, LocalNote> = {};
    notes.forEach((n) => {
      map[n.eleve_id] = {
        note: n.note != null ? String(n.note) : "",
        absent: n.absent ?? false,
        commentaire: n.commentaire ?? "",
        saved: true,
      };
    });
    setLocalNotes(map);
  }, [notes]);

  const classeEleves = eleves.filter((e) => e.classe_id === selectedClasse);

  const updateLocal = (eleveId: string, field: keyof LocalNote, value: any) => {
    setLocalNotes((prev) => ({
      ...prev,
      [eleveId]: {
        ...(prev[eleveId] ?? { note: "", absent: false, commentaire: "", saved: false }),
        [field]: value,
        saved: false,
      },
    }));
  };

  // Save all notes at once
  const handleSaveAll = async () => {
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
    const success = await saveNotes(selectedEval, notesData);
    if (success) {
      // Mark all as saved
      setLocalNotes(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], saved: true }; });
        return updated;
      });
    }
    setSaving(false);
  };

  // Save single student note
  const handleSaveSingle = async (eleveId: string) => {
    if (!selectedEval) return;
    setSavingId(eleveId);
    const local = localNotes[eleveId] ?? { note: "", absent: false, commentaire: "" };
    const success = await saveSingleNote(selectedEval, eleveId, {
      note: local.note ? parseFloat(local.note) : null,
      absent: local.absent,
      commentaire: local.commentaire,
    });
    if (success) {
      setLocalNotes(prev => ({
        ...prev,
        [eleveId]: { ...prev[eleveId], saved: true },
      }));
    }
    setSavingId(null);
  };

  const bareme = evalInfo?.bareme ?? 20;
  const unsavedCount = classeEleves.filter(e => {
    const local = localNotes[e.id];
    return local && !local.saved;
  }).length;

  const stats = classeEleves.reduce((acc, e) => {
    const local = localNotes[e.id];
    if (!local) return acc;
    if (local.absent) { acc.absents++; return acc; }
    if (local.note) {
      const n = parseFloat(local.note);
      acc.filled++;
      acc.sum += n;
      if (n >= bareme / 2) acc.above++;
    }
    return acc;
  }, { filled: 0, absents: 0, sum: 0, above: 0 });

  const moyenne = stats.filled > 0 ? stats.sum / stats.filled : 0;

  return (
    <SettingsSection
      icon={<PenSquare className='h-5 w-5' />}
      title="Saisie des notes"
      description="Sélectionnez une classe et une évaluation, puis saisissez les notes élève par élève."
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

      {selectedEval && evalInfo && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <Badge variant="outline" className="gap-1">
              {evalInfo.matiere} · {evalInfo.type} · /{bareme}
            </Badge>
            <Badge variant="outline" className="gap-1 bg-primary/10 text-primary">
              {stats.filled} noté(s)
            </Badge>
            <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600">
              {stats.absents} absent(s)
            </Badge>
            {stats.filled > 0 && (
              <>
                <Badge variant="outline" className="gap-1">
                  Moy: {moyenne.toFixed(2)}/{bareme}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  ≥ {bareme / 2}: {stats.above}/{stats.filled} ({((stats.above / stats.filled) * 100).toFixed(0)}%)
                </Badge>
              </>
            )}
            {unsavedCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />{unsavedCount} non enregistré(s)
              </Badge>
            )}
          </div>

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
                      <TableHead className="w-24">Matricule</TableHead>
                      <TableHead>Nom de l'élève</TableHead>
                      <TableHead className="w-24">Note /{bareme}</TableHead>
                      <TableHead className="w-20">Absent</TableHead>
                      <TableHead>Appréciation</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classeEleves.map((e) => {
                      const local = localNotes[e.id] ?? { note: "", absent: false, commentaire: "", saved: true };
                      const noteVal = local.note ? parseFloat(local.note) : null;
                      const isLow = noteVal !== null && noteVal < bareme / 2;
                      return (
                        <TableRow key={e.id} className={local.absent ? "opacity-60 bg-muted/30" : ""}>
                          <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                          <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={bareme}
                              step={0.25}
                              value={local.note}
                              onChange={(ev) => updateLocal(e.id, "note", ev.target.value)}
                              className={`h-8 w-20 ${isLow ? "border-destructive text-destructive" : ""}`}
                              disabled={local.absent}
                              placeholder="—"
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={local.absent}
                              onCheckedChange={(checked) => {
                                updateLocal(e.id, "absent", checked);
                                if (checked) updateLocal(e.id, "note", "");
                              }}
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
                          <TableCell>
                            {!local.saved ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleSaveSingle(e.id)}
                                disabled={savingId === e.id}
                              >
                                {savingId === e.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5 text-primary" />
                                )}
                              </Button>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchNotesByEvaluation(selectedEval)}>
                  Rafraîchir
                </Button>
                <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer tout ({classeEleves.length} élèves)
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {!selectedEval && selectedClasse && classEvals.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucune évaluation pour cette classe. Créez-en une dans l'onglet "Évaluations".</p>
      )}
    </SettingsSection>
  );
}
