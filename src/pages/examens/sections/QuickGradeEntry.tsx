import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Zap, Save, Loader2, Plus, ChevronRight, ChevronLeft, CheckCircle, SkipForward } from "lucide-react";
import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { useNotes } from "@/hooks/useNotes";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { toast } from "sonner";
import { sortEleves } from "@/lib/sortEleves";

interface QuickEval {
  id: string;
  titre: string;
  bareme: number;
  type: string;
  matiere_nom: string;
}

/**
 * Saisie rapide : un élève à la fois, navigation clavier (Entrée = suivant),
 * enregistrement automatique à chaque passage au suivant.
 */
export default function QuickGradeEntry() {
  const { ecoleId } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const scopedAnneeId = periodLoading ? "" : (activeAnnee?.id ?? "");
  const periodeIds = periodLoading || !activeAnnee ? [] : activeAnnee.periodes.map((p) => p.id);
  const { classes } = useClasses(scopedAnneeId);
  const { eleves } = useEleves(scopedAnneeId);
  const { notes, fetchNotesByEvaluation, saveSingleNote } = useNotes();

  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedEval, setSelectedEval] = useState("");
  const [classEvals, setClassEvals] = useState<QuickEval[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localNote, setLocalNote] = useState("");
  const [localAbsent, setLocalAbsent] = useState(false);
  const [localComment, setLocalComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [showNewEval, setShowNewEval] = useState(false);
  const [newEvalForm, setNewEvalForm] = useState({ titre: "", type: "devoir", matiere_id: "", coefficient: "1", bareme: "20", date_eval: new Date().toISOString().split("T")[0] });
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [creatingEval, setCreatingEval] = useState(false);

  const noteInputRef = useRef<HTMLInputElement>(null);

  // Fetch class evaluations
  useEffect(() => {
    if (!selectedClasse || !ecoleId) { setClassEvals([]); return; }
    if (periodeIds.length === 0) { setClassEvals([]); return; }
    supabase
      .from("evaluations")
      .select("id, titre, bareme, type, matieres(nom)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse)
      .in("periode_id", periodeIds)
      .order("date_eval", { ascending: false })
      .then(({ data }) => {
        setClassEvals((data ?? []).map((e: any) => ({
          id: e.id,
          titre: e.titre,
          bareme: e.bareme ?? 20,
          type: e.type,
          matiere_nom: e.matieres?.nom ?? "",
        })));
      });
  }, [selectedClasse, ecoleId, periodeIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch matieres for new eval dialog
  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("matieres").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setMatieres(data ?? []));
  }, [ecoleId]);

  // Load existing notes when eval changes
  useEffect(() => {
    if (selectedEval) {
      fetchNotesByEvaluation(selectedEval);
      setCurrentIndex(0);
      setSavedSet(new Set());
    }
  }, [selectedEval, fetchNotesByEvaluation]);

  const classeEleves = sortEleves(eleves.filter((e) => e.classe_id === selectedClasse));

  const currentEleve = classeEleves[currentIndex];
  const evalInfo = classEvals.find(e => e.id === selectedEval);

  // Sync local fields when index or notes change
  useEffect(() => {
    if (!currentEleve) return;
    const existing = notes.find(n => n.eleve_id === currentEleve.id);
    if (existing) {
      setLocalNote(existing.note != null ? String(existing.note) : "");
      setLocalAbsent(existing.absent ?? false);
      setLocalComment(existing.commentaire ?? "");
    } else {
      setLocalNote("");
      setLocalAbsent(false);
      setLocalComment("");
    }
    // Focus note input
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [currentIndex, currentEleve, notes]);

  const saveAndNext = useCallback(async () => {
    if (!currentEleve || !selectedEval) return;
    setSaving(true);

    const success = await saveSingleNote(selectedEval, currentEleve.id, {
      note: localNote ? parseFloat(localNote) : null,
      absent: localAbsent,
      commentaire: localComment,
    });

    if (success) {
      setSavedSet(prev => new Set(prev).add(currentEleve.id));
      // Move to next if not last
      if (currentIndex < classeEleves.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("Tous les élèves ont été saisis !");
      }
    }
    setSaving(false);
  }, [currentEleve, selectedEval, localNote, localAbsent, localComment, saveSingleNote, currentIndex, classeEleves.length]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveAndNext();
    }
  };

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < classeEleves.length) setCurrentIndex(idx);
  };

  const handleCreateEval = async () => {
    if (!newEvalForm.titre || !newEvalForm.matiere_id || !selectedClasse || !ecoleId) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setCreatingEval(true);
    const { data, error } = await supabase.from("evaluations").insert({
      titre: newEvalForm.titre.trim(),
      type: newEvalForm.type,
      date_eval: newEvalForm.date_eval,
      classe_id: selectedClasse,
      matiere_id: newEvalForm.matiere_id,
      coefficient: parseFloat(newEvalForm.coefficient) || 1,
      bareme: parseFloat(newEvalForm.bareme) || 20,
      ecole_id: ecoleId,
    }).select("id").single();

    if (error) { toast.error(error.message); }
    else if (data) {
      toast.success("Évaluation créée");
      // Refresh evals list and auto-select
      const { data: refreshed } = await supabase
        .from("evaluations")
        .select("id, titre, bareme, type, matieres(nom)")
        .eq("ecole_id", ecoleId)
        .eq("classe_id", selectedClasse)
        .in("periode_id", periodeIds.length ? periodeIds : ["00000000-0000-0000-0000-000000000000"])
        .order("date_eval", { ascending: false });
      setClassEvals((refreshed ?? []).map((e: any) => ({
        id: e.id, titre: e.titre, bareme: e.bareme ?? 20, type: e.type, matiere_nom: e.matieres?.nom ?? "",
      })));
      setSelectedEval(data.id);
      setShowNewEval(false);
      setNewEvalForm({ titre: "", type: "devoir", matiere_id: "", coefficient: "1", bareme: "20", date_eval: new Date().toISOString().split("T")[0] });
    }
    setCreatingEval(false);
  };

  const progress = classeEleves.length > 0
    ? Math.round((savedSet.size / classeEleves.length) * 100)
    : 0;

  return (
    <SettingsSection
      icon={<Zap className="h-5 w-5" />}
      title="Saisie rapide"
      description="Saisissez les notes un élève à la fois. Appuyez sur Entrée pour enregistrer et passer au suivant."
    >
      {/* Step 1: Select class + eval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <Label className="text-xs">Classe</Label>
          <Select value={selectedClasse} onValueChange={(v) => { setSelectedClasse(v); setSelectedEval(""); setSavedSet(new Set()); }}>
            <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Évaluation</Label>
          <div className="flex gap-2">
            <Select value={selectedEval} onValueChange={setSelectedEval} disabled={!selectedClasse}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Choisir une évaluation" /></SelectTrigger>
              <SelectContent>
                {classEvals.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.titre} — {ev.matiere_nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClasse && (
              <Button size="icon" variant="outline" onClick={() => setShowNewEval(true)} title="Créer une évaluation">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick eval creation dialog */}
      <Dialog open={showNewEval} onOpenChange={setShowNewEval}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle évaluation rapide</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titre</Label>
              <Input value={newEvalForm.titre} onChange={(e) => setNewEvalForm({ ...newEvalForm, titre: e.target.value })} placeholder="Ex: Interro Maths n°3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newEvalForm.type} onValueChange={(v) => setNewEvalForm({ ...newEvalForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devoir">Devoir</SelectItem>
                    <SelectItem value="interrogation">Interrogation</SelectItem>
                    <SelectItem value="composition">Composition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matière</Label>
                <Select value={newEvalForm.matiere_id} onValueChange={(v) => setNewEvalForm({ ...newEvalForm, matiere_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {matieres.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={newEvalForm.date_eval} onChange={(e) => setNewEvalForm({ ...newEvalForm, date_eval: e.target.value })} />
              </div>
              <div>
                <Label>Coef.</Label>
                <Input type="number" min={0.5} step={0.5} value={newEvalForm.coefficient} onChange={(e) => setNewEvalForm({ ...newEvalForm, coefficient: e.target.value })} />
              </div>
              <div>
                <Label>Barème</Label>
                <Input type="number" min={1} value={newEvalForm.bareme} onChange={(e) => setNewEvalForm({ ...newEvalForm, bareme: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleCreateEval} disabled={creatingEval}>
                {creatingEval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer et saisir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Quick entry card */}
      {selectedEval && evalInfo && classeEleves.length > 0 && currentEleve && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {savedSet.size}/{classeEleves.length} ({progress}%)
            </span>
          </div>

          {/* Eval info */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{evalInfo.matiere_nom}</Badge>
            <Badge variant="outline">{evalInfo.type}</Badge>
            <Badge variant="outline">/{evalInfo.bareme}</Badge>
          </div>

          {/* Student card */}
          <div className="border-2 border-primary/20 rounded-xl p-6 bg-card shadow-sm" onKeyDown={handleKeyDown}>
            {/* Student header */}
            <div className="flex items-center justify-between mb-6">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="text-center flex-1">
                <p className="text-lg font-bold text-primary">
                  {currentEleve.nom} {currentEleve.prenom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentEleve.matricule} · Élève {currentIndex + 1} / {classeEleves.length}
                </p>
                {savedSet.has(currentEleve.id) && (
                  <Badge className="mt-1 bg-green-500/15 text-green-600 text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1" />Enregistré
                  </Badge>
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex >= classeEleves.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Note input - large and centered */}
            <div className="flex flex-col items-center gap-4">
              {localAbsent ? (
                <div className="h-20 flex items-center justify-center text-lg font-bold text-orange-500">
                  ABSENT
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <Input
                    ref={noteInputRef}
                    type="number"
                    min={0}
                    max={evalInfo.bareme}
                    step={0.25}
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                    className="text-center text-3xl font-bold h-20 w-32 border-2 border-primary/30 focus:border-primary"
                    placeholder="—"
                    autoFocus
                  />
                  <span className="text-xl text-muted-foreground font-medium">/ {evalInfo.bareme}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label className="text-sm">Absent</Label>
                <Switch
                  checked={localAbsent}
                  onCheckedChange={(checked) => {
                    setLocalAbsent(checked);
                    if (checked) setLocalNote("");
                  }}
                />
              </div>

              <Input
                placeholder="Appréciation (optionnel)..."
                value={localComment}
                onChange={(e) => setLocalComment(e.target.value)}
                className="max-w-sm text-center"
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentIndex < classeEleves.length - 1) setCurrentIndex(currentIndex + 1);
                }}
                className="gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Passer
              </Button>
              <Button
                size="sm"
                onClick={saveAndNext}
                disabled={saving}
                className="gap-1 min-w-[160px]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer & suivant
              </Button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-3">
              Astuce : appuyez sur <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Entrée</kbd> pour enregistrer et passer au suivant
            </p>
          </div>

          {/* Mini student list */}
          <div className="flex flex-wrap gap-1 mt-2">
            {classeEleves.map((e, idx) => (
              <button
                key={e.id}
                onClick={() => goTo(idx)}
                className={`h-9 w-9 sm:h-7 sm:w-7 rounded text-[10px] font-mono transition-colors ${
                  idx === currentIndex
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : savedSet.has(e.id)
                    ? "bg-green-500/20 text-green-700"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={`${e.nom} ${e.prenom}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedEval && classeEleves.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Aucun élève dans cette classe.</p>
      )}

      {!selectedEval && selectedClasse && classEvals.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucune évaluation pour cette classe. Cliquez sur <strong>+</strong> pour en créer une.
        </p>
      )}
    </SettingsSection>
  );
}
