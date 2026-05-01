import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const TYPES = ["devoir", "interrogation", "composition"] as const;

const tone: Record<string, string> = {
  devoir: "bg-primary/15 text-primary",
  composition: "bg-accent/15 text-accent",
  interrogation: "bg-orange-500/15 text-orange-600",
};

interface EvalForm {
  titre: string;
  type: string;
  date_eval: string;
  classe_id: string;
  matiere_id: string;
  coefficient: string;
  bareme: string;
}

const emptyForm: EvalForm = {
  titre: "", type: "devoir", date_eval: new Date().toISOString().split("T")[0],
  classe_id: "", matiere_id: "", coefficient: "1", bareme: "20",
};

export default function Evaluations() {
  const { evaluations, loading, addEvaluation, updateEvaluation, deleteEvaluation, ecoleId } = useEvaluations();
  const { classes } = useClasses();
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EvalForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterClasse, setFilterClasse] = useState("");

  // Fetch matieres
  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("matieres").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setMatieres(data ?? []));
  }, [ecoleId]);

  // Fetch class-specific matieres when classe changes (via classe_matieres)
  const [classMatieres, setClassMatieres] = useState<{ id: string; nom: string }[]>([]);
  useEffect(() => {
    if (!form.classe_id || !ecoleId) { setClassMatieres(matieres); return; }
    supabase
      .from("classe_matieres")
      .select("matiere_id, matieres(id, nom)")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", form.classe_id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setClassMatieres((data as any[]).map(d => ({ id: d.matieres?.id, nom: d.matieres?.nom })).filter(d => d.id));
        } else {
          setClassMatieres(matieres); // fallback to all matieres
        }
      });
  }, [form.classe_id, ecoleId, matieres]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditId(ev.id);
    setForm({
      titre: ev.titre,
      type: ev.type,
      date_eval: ev.date_eval,
      classe_id: ev.classe_id,
      matiere_id: ev.matiere_id,
      coefficient: String(ev.coefficient),
      bareme: String(ev.bareme),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titre || !form.classe_id || !form.matiere_id || !form.date_eval) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSaving(true);
    const payload = {
      titre: form.titre.trim(),
      type: form.type,
      date_eval: form.date_eval,
      classe_id: form.classe_id,
      matiere_id: form.matiere_id,
      coefficient: parseFloat(form.coefficient) || 1,
      bareme: parseFloat(form.bareme) || 20,
    };

    if (editId) {
      await updateEvaluation(editId, payload);
    } else {
      await addEvaluation(payload as any);
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette évaluation et ses notes ?")) return;
    await deleteEvaluation(id);
  };

  const filteredEvals = filterClasse
    ? evaluations.filter(e => e.classe_id === filterClasse)
    : evaluations;

  return (
    <SettingsSection
      icon={<ClipboardList className='h-5 w-5' />}
      title={`Évaluations & devoirs (${filteredEvals.length})`}
      description="Créez et gérez vos évaluations : devoirs, interrogations, compositions."
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
        <div className="max-w-xs">
          <Label className="text-xs">Filtrer par classe</Label>
          <Select value={filterClasse} onValueChange={setFilterClasse}>
            <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Nouvelle évaluation
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier l'évaluation" : "Nouvelle évaluation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Devoir n°1 Maths" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date_eval} onChange={(e) => setForm({ ...form, date_eval: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Classe *</Label>
                <Select value={form.classe_id} onValueChange={(v) => setForm({ ...form, classe_id: v, matiere_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matière *</Label>
                <Select value={form.matiere_id} onValueChange={(v) => setForm({ ...form, matiere_id: v })} disabled={!form.classe_id}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {classMatieres.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coefficient</Label>
                <Input type="number" min={0.5} step={0.5} value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} />
              </div>
              <div>
                <Label>Barème</Label>
                <Input type="number" min={1} value={form.bareme} onChange={(e) => setForm({ ...form, bareme: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editId ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filteredEvals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Aucune évaluation trouvée.</p>
          <p className="text-xs mt-1">Créez votre première évaluation pour commencer la saisie des notes.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Coef.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvals.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.titre}</TableCell>
                  <TableCell>{e.classe_nom ?? "—"}</TableCell>
                  <TableCell>{e.matiere_nom ?? "—"}</TableCell>
                  <TableCell>{e.coefficient}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(e.date_eval).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge className={tone[e.type] || "bg-muted"} variant="secondary">{e.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.nb_notes ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
