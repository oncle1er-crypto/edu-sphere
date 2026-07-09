import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MatiereRow = Database["public"]["Tables"]["matieres"]["Row"];

const CATEGORIES = ["Fondamentale", "Scientifique", "Littéraire", "Religieuse", "Artistique", "Sportive", "Optionnelle"];
const CYCLES = ["Maternelle", "Primaire", "Collège", "Lycée"] as const;
const COULEURS = [
  "bg-primary", "bg-accent", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500", "bg-slate-500",
];

export interface SubjectFormValues {
  nom: string;
  code: string | null;
  categorie: string | null;
  cycles: string[];
  couleur: string;
  coefficient: number;
  note_sur: number;
  note_passage: number;
  active: boolean;
}

const EMPTY: SubjectFormValues = {
  nom: "", code: "", categorie: "", cycles: [],
  couleur: "bg-primary", coefficient: 1, note_sur: 20, note_passage: 10, active: true,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matiere?: MatiereRow | null;
  onSubmit: (values: SubjectFormValues) => Promise<boolean | void>;
  extraCategories?: string[];
}

export function SubjectEditDialog({ open, onOpenChange, matiere, onSubmit, extraCategories = [] }: Props) {
  const [form, setForm] = useState<SubjectFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (matiere) {
      setForm({
        nom: matiere.nom,
        code: matiere.code ?? "",
        categorie: matiere.categorie ?? "",
        cycles: matiere.cycles ?? [],
        couleur: matiere.couleur || "bg-primary",
        coefficient: Number(matiere.coefficient) || 1,
        note_sur: matiere.note_sur ?? 20,
        note_passage: Number(matiere.note_passage) || 10,
        active: matiere.active ?? true,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, matiere]);

  const set = <K extends keyof SubjectFormValues>(k: K, v: SubjectFormValues[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleCycle = (c: string) =>
    set("cycles", form.cycles.includes(c) ? form.cycles.filter((x) => x !== c) : [...form.cycles, c]);

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    const ok = await onSubmit({
      ...form,
      nom: form.nom.trim(),
      code: form.code?.trim() || null,
      categorie: form.categorie?.trim() || null,
    });
    setSaving(false);
    if (ok !== false) onOpenChange(false);
  };

  const allCategories = Array.from(new Set([...CATEGORIES, ...extraCategories.filter(Boolean)]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{matiere ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FieldRow label="Nom *">
            <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} maxLength={100} />
          </FieldRow>
          <FieldRow label="Code">
            <Input value={form.code ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="MATH" maxLength={20} />
          </FieldRow>
          <FieldRow label="Catégorie">
            <Select value={form.categorie ?? ""} onValueChange={(v) => set("categorie", v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Cycles concernés">
            <div className="flex flex-wrap gap-3">
              {CYCLES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.cycles.includes(c)} onCheckedChange={() => toggleCycle(c)} />
                  {c}
                </label>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="Couleur">
            <div className="flex flex-wrap gap-2">
              {COULEURS.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => set("couleur", cls)}
                  className={`h-6 w-6 rounded-full ${cls} ring-offset-2 ${form.couleur === cls ? "ring-2 ring-foreground" : ""}`}
                  aria-label={cls}
                />
              ))}
            </div>
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <FieldRow label="Coefficient">
              <Input type="number" step="0.5" min={0} value={form.coefficient}
                onChange={(e) => set("coefficient", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Note sur">
              <Input type="number" min={1} value={form.note_sur}
                onChange={(e) => set("note_sur", Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Note de passage">
              <Input type="number" step="0.5" min={0} value={form.note_passage}
                onChange={(e) => set("note_passage", Number(e.target.value))} />
            </FieldRow>
          </div>
          <FieldRow label="Matière active" hint="Décoché = archivée (masquée dans les bulletins et affectations)">
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </FieldRow>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.nom.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {matiere ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
