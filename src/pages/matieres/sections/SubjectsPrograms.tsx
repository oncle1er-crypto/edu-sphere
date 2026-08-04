import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, FileText, Loader2, Trash2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Prog = { id: string; matiere_id: string; classe_id: string | null; periode: string; chapitres_total: number; chapitres_faits: number; notes: string | null };

export default function SubjectsPrograms() {
  const { matieres } = useMatieres();
  const { classes } = useClasses();
  const { ecoleId } = useEcoleId();
  const [progs, setProgs] = useState<Prog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ matiere_id: "", classe_id: "", periode: "T1", chapitres_total: 10, chapitres_faits: 0 });

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase.from("progressions_matiere").select("*").eq("ecole_id", ecoleId).order("created_at", { ascending: false });
    setProgs((data as Prog[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ecoleId]);

  const add = async () => {
    if (!ecoleId || !form.matiere_id) return toast.error("Matière requise");
    const { error } = await supabase.from("progressions_matiere").insert({
      ecole_id: ecoleId, matiere_id: form.matiere_id, classe_id: form.classe_id || null,
      periode: form.periode, chapitres_total: form.chapitres_total, chapitres_faits: form.chapitres_faits,
    });
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Progression créée"); setOpen(false); load();
  };

  const updateFaits = async (id: string, faits: number) => {
    const { error } = await supabase.from("progressions_matiere").update({ chapitres_faits: faits }).eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    setProgs((p) => p.map((x) => x.id === id ? { ...x, chapitres_faits: faits } : x));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("progressions_matiere").delete().eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Supprimé"); load();
  };

  return (
    <SettingsSection
      icon={<GitBranch className="h-5 w-5" />}
      title="Programmes & progressions"
      description="Suivi de l'avancement pédagogique par matière, classe et période."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><FileText className="h-4 w-4 mr-1" />Nouvelle progression</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : progs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune progression enregistrée.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progs.map((p) => {
            const m = matieres.find((x) => x.id === p.matiere_id);
            const c = classes.find((x) => x.id === p.classe_id);
            const pct = p.chapitres_total ? Math.round((p.chapitres_faits / p.chapitres_total) * 100) : 0;
            return (
              <Card key={p.id} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${m?.couleur || "bg-primary"}`} />
                      <h3 className="font-semibold">{m?.nom || "—"}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.periode}</Badge>
                      <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Classe : {c?.nom || "Toutes"}</p>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={p.chapitres_total} value={p.chapitres_faits}
                          onChange={(e) => updateFaits(p.id, Number(e.target.value))} className="w-16 h-7 text-center" />
                        <span>/ {p.chapitres_total} chapitres</span>
                      </div>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle progression</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Matière</Label>
              <Select value={form.matiere_id} onValueChange={(v) => setForm({ ...form, matiere_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Classe (optionnel)</Label>
              <Select value={form.classe_id} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Période</Label>
              <Select value={form.periode} onValueChange={(v) => setForm({ ...form, periode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="T1">Trimestre 1</SelectItem>
                  <SelectItem value="T2">Trimestre 2</SelectItem>
                  <SelectItem value="T3">Trimestre 3</SelectItem>
                  <SelectItem value="Année">Année</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total chapitres</Label><Input type="number" value={form.chapitres_total} onChange={(e) => setForm({ ...form, chapitres_total: Number(e.target.value) })} /></div>
              <div><Label>Faits</Label><Input type="number" value={form.chapitres_faits} onChange={(e) => setForm({ ...form, chapitres_faits: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={add}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
