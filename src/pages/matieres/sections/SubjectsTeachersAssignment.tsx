import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader2, Trash2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = { id: string; matiere_id: string; enseignant_id: string; classe_id: string | null };

export default function SubjectsTeachersAssignment() {
  const { matieres } = useMatieres();
  const { enseignants } = useEnseignants();
  const { classes } = useClasses();
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ matiere_id: string; enseignant_id: string; classe_id: string }>({ matiere_id: "", enseignant_id: "", classe_id: "" });

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase.from("enseignant_matieres").select("id, matiere_id, enseignant_id, classe_id").eq("ecole_id", ecoleId);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ecoleId]);

  const add = async () => {
    if (!ecoleId || !form.matiere_id || !form.enseignant_id) return toast.error("Matière et enseignant requis");
    const { error } = await supabase.from("enseignant_matieres").insert({
      ecole_id: ecoleId, matiere_id: form.matiere_id, enseignant_id: form.enseignant_id,
      classe_id: form.classe_id || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Affectation créée");
    setOpen(false);
    setForm({ matiere_id: "", enseignant_id: "", classe_id: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("enseignant_matieres").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Affectation supprimée");
    load();
  };

  // Regrouper par matière
  const grouped = matieres.map((m) => ({
    matiere: m,
    affectations: rows.filter((r) => r.matiere_id === m.id),
  })).filter((g) => g.affectations.length > 0);

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Affectation des enseignants aux matières"
      description="Liez chaque matière à ses enseignants titulaires."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nouvelle affectation</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune affectation enregistrée.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Enseignants (classe)</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((g) => (
                <TableRow key={g.matiere.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${g.matiere.couleur || "bg-primary"}`} />
                      {g.matiere.nom}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {g.affectations.map((a) => {
                        const ens = enseignants.find((e) => e.id === a.enseignant_id);
                        const cl = classes.find((c) => c.id === a.classe_id);
                        return (
                          <Badge key={a.id} variant="outline" className="gap-1">
                            {ens ? `${ens.prenom} ${ens.nom}` : "—"}{cl ? ` · ${cl.nom}` : ""}
                            <button onClick={() => remove(a.id)} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Badge variant="secondary">{g.affectations.length}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle affectation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.matiere_id} onValueChange={(v) => setForm({ ...form, matiere_id: v })}>
              <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
              <SelectContent>{matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.enseignant_id} onValueChange={(v) => setForm({ ...form, enseignant_id: v })}>
              <SelectTrigger><SelectValue placeholder="Enseignant" /></SelectTrigger>
              <SelectContent>{enseignants.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.classe_id} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
              <SelectTrigger><SelectValue placeholder="Classe (optionnel)" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={add}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
