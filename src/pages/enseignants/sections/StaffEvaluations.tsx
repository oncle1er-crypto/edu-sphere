import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Award, Plus, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnseignantEvaluations } from "@/hooks/useEnseignantsRH";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useRhReferentiels } from "@/hooks/useRhReferentiels";

type Seuils = { tresBien: number; bien: number; assezBien: number; passable: number };

const mentionFor = (n: number | null, s: Seuils) => {
  if (n == null) return "—";
  if (n >= s.tresBien) return "Très bien";
  if (n >= s.bien) return "Bien";
  if (n >= s.assezBien) return "Assez bien";
  if (n >= s.passable) return "Passable";
  return "Insuffisant";
};

// Classes Tailwind entièrement littérales : une classe construite dynamiquement
// ne serait pas détectée à la compilation et la barre resterait sans couleur.
const progressClassFor = (n: number, s: Seuils) => {
  if (n >= s.tresBien) return "h-1.5 [&>div]:bg-emerald-500";
  if (n >= s.assezBien) return "h-1.5 [&>div]:bg-amber-500";
  return "h-1.5 [&>div]:bg-destructive";
};

export default function StaffEvaluations() {
  const { items, loading, add, remove } = useEnseignantEvaluations();
  const { enseignants } = useEnseignants();
  const { criteres, seuilsEvaluation, loading: loadingRef } = useRhReferentiels();
  const [open, setOpen] = useState(false);
  const [enseignantId, setEnseignantId] = useState("");
  const [noteGlobale, setNoteGlobale] = useState(15);
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [pointsForts, setPointsForts] = useState("");
  const [axes, setAxes] = useState("");

  useEffect(() => {
    if (criteres.length === 0) return;
    setNotes(Object.fromEntries(criteres.map((c) => [c.code, c.note_defaut])));
  }, [criteres]);

  const resetForm = () => {
    setEnseignantId("");
    setNoteGlobale(15);
    setNotes(Object.fromEntries(criteres.map((c) => [c.code, c.note_defaut])));
    setPointsForts("");
    setAxes("");
  };

  const handleAdd = async () => {
    if (!enseignantId) return;
    await add({
      enseignant_id: enseignantId,
      note_globale: noteGlobale,
      points_forts: pointsForts,
      axes_amelioration: axes,
      ...notes,
    });
    setOpen(false);
    resetForm();
  };

  return (
    <SettingsSection
      icon={<Award className="h-5 w-5" />}
      title="Évaluations annuelles"
      description="Évaluation des performances pédagogiques et professionnelles."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle évaluation</Button>
      </div>

      {loading || loadingRef ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucune évaluation enregistrée.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((e: any) => {
            const ens = e.enseignants;
            const nom = ens ? `${ens.prenom} ${ens.nom}` : "—";
            return (
              <Card key={e.id} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold font-display truncate">{nom}</h4>
                      <p className="text-xs text-muted-foreground">{e.date_evaluation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-extrabold font-display text-primary">{e.note_globale ?? "—"}/20</p>
                      <Badge variant="secondary" className="text-[10px]">{mentionFor(e.note_globale, seuilsEvaluation)}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {criteres
                      .filter((c) => e[c.code] != null)
                      .map((c) => {
                        const v = Number(e[c.code]);
                        return (
                          <div key={c.code}>
                            <div className="flex justify-between text-xs mb-1 gap-2">
                              <span className="truncate">{c.libelle}</span>
                              <span className="font-semibold shrink-0">{v}/{c.note_max}</span>
                            </div>
                            <Progress value={(v / c.note_max) * 100} className={progressClassFor(v, seuilsEvaluation)} />
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Membre du personnel</Label>
              <Select value={enseignantId} onValueChange={setEnseignantId}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Note globale /20</Label>
                <Input type="number" min={0} max={20} value={noteGlobale} onChange={(ev) => setNoteGlobale(Number(ev.target.value))} />
              </div>
              {criteres.map((c) => (
                <div key={c.code}>
                  <Label>{c.libelle} /{c.note_max}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={c.note_max}
                    value={notes[c.code] ?? c.note_defaut}
                    onChange={(ev) => setNotes((prev) => ({ ...prev, [c.code]: Number(ev.target.value) }))}
                  />
                </div>
              ))}
            </div>
            <div><Label>Points forts</Label><Textarea rows={2} value={pointsForts} onChange={(ev) => setPointsForts(ev.target.value)} /></div>
            <div><Label>Axes d'amélioration</Label><Textarea rows={2} value={axes} onChange={(ev) => setAxes(ev.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!enseignantId}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
