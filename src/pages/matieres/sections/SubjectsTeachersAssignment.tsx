import { useEffect, useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users, Plus, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

type Row = { id: string; matiere_id: string; enseignant_id: string; classe_id: string | null };

export default function SubjectsTeachersAssignment() {
  const { matieres } = useMatieres();
  const { enseignants } = useEnseignants();
  const { classes } = useClasses();
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<Row[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>({}); // classe|matiere -> h/sem
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ matiere_id: string; enseignant_id: string; classes_ids: string[] }>({
    matiere_id: "", enseignant_id: "", classes_ids: [],
  });

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const [{ data: em }, { data: cm }] = await Promise.all([
      supabase.from("enseignant_matieres").select("id, matiere_id, enseignant_id, classe_id").eq("ecole_id", ecoleId),
      supabase.from("classe_matieres").select("classe_id, matiere_id, volume_horaire_hebdo").eq("ecole_id", ecoleId),
    ]);
    setRows((em as Row[]) ?? []);
    const vmap: Record<string, number> = {};
    (cm ?? []).forEach((r: any) => { vmap[`${r.classe_id}|${r.matiere_id}`] = Number(r.volume_horaire_hebdo) || 0; });
    setVolumes(vmap);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ecoleId]);

  const existsKey = (matiere_id: string, enseignant_id: string, classe_id: string | null) =>
    rows.some((r) => r.matiere_id === matiere_id && r.enseignant_id === enseignant_id && (r.classe_id ?? null) === classe_id);

  const add = async () => {
    if (!ecoleId || !form.matiere_id || !form.enseignant_id) return toast.error("Matière et enseignant requis");
    const targets: (string | null)[] = form.classes_ids.length > 0 ? form.classes_ids : [null];
    const inserts = targets
      .filter((cid) => !existsKey(form.matiere_id, form.enseignant_id, cid))
      .map((cid) => ({ ecole_id: ecoleId, matiere_id: form.matiere_id, enseignant_id: form.enseignant_id, classe_id: cid }));
    if (inserts.length === 0) return toast.info("Toutes ces affectations existent déjà");
    const { error } = await supabase.from("enseignant_matieres").insert(inserts);
    if (error) return toast.error(messageErreurBase(error));
    toast.success(`${inserts.length} affectation(s) créée(s)`);
    setOpen(false);
    setForm({ matiere_id: "", enseignant_id: "", classes_ids: [] });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("enseignant_matieres").delete().eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Affectation supprimée");
    load();
  };

  // Charge horaire par enseignant (somme volumes des matieres affectées, par classe)
  const workload = useMemo(() => {
    const wl: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.classe_id) {
        const h = volumes[`${r.classe_id}|${r.matiere_id}`] ?? 0;
        wl[r.enseignant_id] = (wl[r.enseignant_id] ?? 0) + h;
      }
    });
    return wl;
  }, [rows, volumes]);

  const grouped = matieres.map((m) => ({
    matiere: m,
    affectations: rows.filter((r) => r.matiere_id === m.id),
  })).filter((g) => g.affectations.length > 0);

  const matieresSansEnseignant = matieres.filter((m) => !rows.some((r) => r.matiere_id === m.id));

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Affectation des enseignants aux matières"
      description="Liez chaque matière à ses enseignants — sur plusieurs classes en un clic."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nouvelle affectation</Button>
      </div>

      {/* Charge horaire par enseignant */}
      {Object.keys(workload).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-medium mb-2 text-muted-foreground">Charge horaire hebdomadaire</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(workload)
                .sort((a, b) => b[1] - a[1])
                .map(([eid, h]) => {
                  const e = enseignants.find((x) => x.id === eid);
                  if (!e) return null;
                  const overloaded = h > 24;
                  return (
                    <Badge key={eid} variant={overloaded ? "destructive" : "secondary"} className="gap-1">
                      {e.nom} {e.prenom} · {h}h
                      {overloaded && <AlertTriangle className="h-3 w-3" />}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {matieresSansEnseignant.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-medium">{matieresSansEnseignant.length} matière(s) sans enseignant :</span>{" "}
              <span className="text-muted-foreground">{matieresSansEnseignant.map((m) => m.nom).join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      )}

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
                            {ens ? `${ens.nom} ${ens.prenom}` : "—"}{cl ? ` · ${cl.nom}` : " · toutes"}
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
          <DialogHeader>
            <DialogTitle>Nouvelle affectation</DialogTitle>
            <DialogDescription>Sélectionnez une ou plusieurs classes pour affecter en lot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={form.matiere_id} onValueChange={(v) => setForm({ ...form, matiere_id: v })}>
              <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
              <SelectContent>{matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}</SelectContent>
            </Select>
            <SearchableSelect
              value={form.enseignant_id}
              onValueChange={(v) => setForm({ ...form, enseignant_id: v })}
              placeholder="Enseignant"
              searchPlaceholder="Rechercher un enseignant..."
              options={enseignants.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">Classes ({form.classes_ids.length || "toutes"})</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {classes.length === 0 && <p className="text-xs text-muted-foreground">Aucune classe.</p>}
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={form.classes_ids.includes(c.id)}
                      onCheckedChange={(v) => setForm((f) => ({
                        ...f,
                        classes_ids: v ? [...f.classes_ids, c.id] : f.classes_ids.filter((x) => x !== c.id),
                      }))}
                    />
                    {c.nom}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Aucune classe cochée = affectation générique à toutes.</p>
            </div>
          </div>
          <DialogFooter><Button onClick={add}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
