import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { MyEnseignant } from "@/hooks/useMyEnseignant";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Assignment { classe_id: string; classe: string; matiere_id: string; matiere: string; key: string; }

export function NewEvaluationDialog({
  open, onOpenChange, enseignant, defaultClasseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enseignant: MyEnseignant;
  defaultClasseId?: string;
}) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [assignKey, setAssignKey] = useState<string>("");
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("devoir");
  const [dateEval, setDateEval] = useState(new Date().toISOString().slice(0, 10));
  const [bareme, setBareme] = useState("20");
  const [coef, setCoef] = useState("1");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      // 1) Matières enseignées + classes liées via enseignant_matieres
      const { data: em } = await supabase
        .from("enseignant_matieres")
        .select("classe_id, matiere_id, classes(nom), matieres(nom)")
        .eq("ecole_id", enseignant.ecole_id)
        .eq("enseignant_id", enseignant.id);

      // 2) Classes dont il est prof principal (toutes matières de la classe)
      const { data: pc } = await supabase
        .from("classes")
        .select("id, nom, classe_matieres(matiere_id, matieres(nom))")
        .eq("ecole_id", enseignant.ecole_id)
        .eq("professeur_principal_id", enseignant.id);

      const map = new Map<string, Assignment>();
      (em ?? []).forEach((r: any) => {
        if (!r.classe_id || !r.matiere_id) return;
        const key = `${r.classe_id}::${r.matiere_id}`;
        map.set(key, {
          classe_id: r.classe_id, classe: r.classes?.nom ?? "—",
          matiere_id: r.matiere_id, matiere: r.matieres?.nom ?? "—",
          key,
        });
      });
      (pc ?? []).forEach((c: any) => {
        (c.classe_matieres ?? []).forEach((cm: any) => {
          if (!cm.matiere_id) return;
          const key = `${c.id}::${cm.matiere_id}`;
          if (!map.has(key)) {
            map.set(key, {
              classe_id: c.id, classe: c.nom,
              matiere_id: cm.matiere_id, matiere: cm.matieres?.nom ?? "—",
              key,
            });
          }
        });
      });
      const list = Array.from(map.values()).sort((a, b) =>
        a.classe.localeCompare(b.classe) || a.matiere.localeCompare(b.matiere)
      );
      setAssignments(list);
      // Pré-sélection
      const pre = defaultClasseId
        ? list.find((a) => a.classe_id === defaultClasseId)
        : list[0];
      setAssignKey(pre?.key ?? "");
      setLoading(false);
    })();
  }, [open, enseignant, defaultClasseId]);

  const handleCreate = async () => {
    const a = assignments.find((x) => x.key === assignKey);
    if (!a) { toast.error("Sélectionnez une classe et une matière"); return; }
    if (!titre.trim()) { toast.error("Renseignez un titre"); return; }
    const b = Number(bareme);
    const c = Number(coef);
    if (isNaN(b) || b <= 0) { toast.error("Barème invalide"); return; }
    if (isNaN(c) || c <= 0) { toast.error("Coefficient invalide"); return; }

    setSaving(true);
    // Année active
    const { data: annee } = await supabase
      .from("annees_scolaires")
      .select("id")
      .eq("ecole_id", enseignant.ecole_id)
      .eq("statut", "active")
      .maybeSingle();

    const { data: ev, error } = await supabase
      .from("evaluations")
      .insert({
        ecole_id: enseignant.ecole_id,
        classe_id: a.classe_id,
        matiere_id: a.matiere_id,
        enseignant_id: enseignant.id,
        titre: titre.trim(),
        type,
        date_eval: dateEval,
        bareme: b,
        coefficient: c,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !ev) { toast.error(messageErreurBase(error) ?? "Erreur"); return; }
    toast.success("Évaluation créée");
    onOpenChange(false);
    navigate(`/portail-enseignant/evaluations/${ev.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle évaluation</DialogTitle>
          <DialogDescription>Créez une évaluation puis saisissez les notes des élèves.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucune classe/matière assignée à votre profil. Contactez l'administration.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Classe & matière</Label>
              <Select value={assignKey} onValueChange={setAssignKey}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.key} value={a.key}>{a.classe} — {a.matiere}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex: Devoir n°1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devoir">Devoir</SelectItem>
                    <SelectItem value="interro">Interrogation</SelectItem>
                    <SelectItem value="composition">Composition</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={dateEval} onChange={(e) => setDateEval(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Barème</Label>
                <Input type="number" min={1} step="1" value={bareme} onChange={(e) => setBareme(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Coefficient</Label>
                <Input type="number" min={0.5} step="0.5" value={coef} onChange={(e) => setCoef(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleCreate} disabled={saving || loading || assignments.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Créer & saisir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
