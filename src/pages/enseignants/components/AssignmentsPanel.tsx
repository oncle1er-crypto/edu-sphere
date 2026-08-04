import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useMatieres } from "@/hooks/useMatieres";
import { useClasses } from "@/hooks/useClasses";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, GraduationCap } from "lucide-react";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Affectation {
  id: string;
  enseignant_id: string;
  matiere_id: string;
  classe_id: string;
  volume_horaire_hebdo: number | null;
}

export function AssignmentsPanel() {
  const { ecoleId } = useEcoleId();
  const { enseignants } = useEnseignants();
  const { matieres } = useMatieres();
  const { classes } = useClasses();

  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(false);

  const [addMatiere, setAddMatiere] = useState("");
  const [addClasse, setAddClasse] = useState("");
  const [addVolume, setAddVolume] = useState<number>(2);

  useEffect(() => {
    if (enseignants.length && !selected) setSelected(enseignants[0].id);
  }, [enseignants, selected]);

  const load = async (id: string) => {
    if (!id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("enseignant_matieres")
      .select("id, enseignant_id, matiere_id, classe_id, volume_horaire_hebdo")
      .eq("enseignant_id", id);
    setRows((data ?? []) as Affectation[]);
    setLoading(false);
  };

  useEffect(() => { if (selected) load(selected); }, [selected]);

  const totalHeures = rows.reduce((s, r) => s + (Number(r.volume_horaire_hebdo) || 0), 0);

  const handleAdd = async () => {
    if (!ecoleId || !selected || !addMatiere || !addClasse) return;
    const { error } = await (supabase as any).from("enseignant_matieres").insert({
      ecole_id: ecoleId,
      enseignant_id: selected,
      matiere_id: addMatiere,
      classe_id: addClasse,
      volume_horaire_hebdo: addVolume,
    });
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Affectation ajoutée");
    setAddMatiere(""); setAddClasse(""); setAddVolume(2);
    load(selected);
  };

  const handleRemove = async (id: string) => {
    const { error } = await (supabase as any).from("enseignant_matieres").delete().eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Affectation supprimée");
    load(selected);
  };

  const handleVolume = async (id: string, v: number) => {
    const { error } = await (supabase as any).from("enseignant_matieres").update({ volume_horaire_hebdo: v }).eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    load(selected);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Label>Enseignant</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {enseignants.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card className="px-4 py-2 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm">Total : <strong>{totalHeures.toFixed(1)} h/sem.</strong></span>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Ajouter une affectation</h4>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_auto] gap-3">
          <Select value={addMatiere} onValueChange={setAddMatiere}>
            <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
            <SelectContent>
              {matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={addClasse} onValueChange={setAddClasse}>
            <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min={0} step={0.5} value={addVolume} onChange={(e) => setAddVolume(Number(e.target.value))} placeholder="h/sem" />
          <Button onClick={handleAdd} disabled={!addMatiere || !addClasse}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </Card>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matière</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Volume (h/sem)</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">Aucune affectation.</TableCell></TableRow>
            )}
            {rows.map((r) => {
              const m = matieres.find((x) => x.id === r.matiere_id);
              const c = classes.find((x) => x.id === r.classe_id);
              return (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="secondary">{m?.nom ?? "—"}</Badge></TableCell>
                  <TableCell>{c?.nom ?? "—"}</TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step={0.5}
                      defaultValue={r.volume_horaire_hebdo ?? 0}
                      className="w-24"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== r.volume_horaire_hebdo) handleVolume(r.id, v);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
