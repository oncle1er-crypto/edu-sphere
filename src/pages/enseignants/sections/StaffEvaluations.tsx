import { useState } from "react";
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

const mentionFor = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 16) return "Très bien";
  if (n >= 14) return "Bien";
  if (n >= 12) return "Assez bien";
  if (n >= 10) return "Passable";
  return "Insuffisant";
};
const colorFor = (n: number) => n >= 16 ? "bg-emerald-500" : n >= 12 ? "bg-amber-500" : "bg-destructive";

export default function StaffEvaluations() {
  const { items, loading, add, remove } = useEnseignantEvaluations();
  const { enseignants } = useEnseignants();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    enseignant_id: "", note_globale: 15, pedagogie: 15, ponctualite: 15, relation_eleves: 15,
    participation: 15, points_forts: "", axes_amelioration: "",
  });

  const handleAdd = async () => {
    if (!form.enseignant_id) return;
    await add(form);
    setOpen(false);
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

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucune évaluation enregistrée.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((e: any) => {
            const ens = e.enseignants;
            const nom = ens ? `${ens.prenom} ${ens.nom}` : "—";
            const criteres = { pedagogie: e.pedagogie, ponctualite: e.ponctualite, relation: e.relation_eleves, participation: e.participation };
            return (
              <Card key={e.id} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold font-display">{nom}</h4>
                      <p className="text-xs text-muted-foreground">{e.date_evaluation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold font-display text-primary">{e.note_globale ?? "—"}/20</p>
                      <Badge variant="secondary" className="text-[10px]">{mentionFor(e.note_globale)}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(criteres).filter(([, v]) => v != null).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize">{k}</span>
                          <span className="font-semibold">{v as number}/20</span>
                        </div>
                        <Progress value={((v as number) / 20) * 100} className={`h-1.5 [&>div]:${colorFor(v as number)}`} />
                      </div>
                    ))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Enseignant</Label>
              <Select value={form.enseignant_id} onValueChange={(v) => setForm({ ...form, enseignant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Note globale /20</Label><Input type="number" min={0} max={20} value={form.note_globale} onChange={(e) => setForm({ ...form, note_globale: Number(e.target.value) })} /></div>
              <div><Label>Pédagogie /20</Label><Input type="number" min={0} max={20} value={form.pedagogie} onChange={(e) => setForm({ ...form, pedagogie: Number(e.target.value) })} /></div>
              <div><Label>Ponctualité /20</Label><Input type="number" min={0} max={20} value={form.ponctualite} onChange={(e) => setForm({ ...form, ponctualite: Number(e.target.value) })} /></div>
              <div><Label>Relation élèves /20</Label><Input type="number" min={0} max={20} value={form.relation_eleves} onChange={(e) => setForm({ ...form, relation_eleves: Number(e.target.value) })} /></div>
              <div><Label>Participation /20</Label><Input type="number" min={0} max={20} value={form.participation} onChange={(e) => setForm({ ...form, participation: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Points forts</Label><Textarea rows={2} value={form.points_forts} onChange={(e) => setForm({ ...form, points_forts: e.target.value })} /></div>
            <div><Label>Axes d'amélioration</Label><Textarea rows={2} value={form.axes_amelioration} onChange={(e) => setForm({ ...form, axes_amelioration: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!form.enseignant_id}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
