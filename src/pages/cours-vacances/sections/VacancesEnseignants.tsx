import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVacancesData, VacEnseignant } from "../hooks/useVacances";
import { Plus, Pencil, Trash2 } from "lucide-react";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesEnseignants() {
  const { classes, eleves, enseignants, honoraires, loading, save, remove } = useVacancesData();
  const nbElevesParClasse = useMemo(() => {
    const m: Record<string, number> = {};
    eleves.forEach((e) => { m[e.classe_id] = (m[e.classe_id] ?? 0) + 1; });
    return m;
  }, [eleves]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<VacEnseignant | null>(null);
  const [form, setForm] = useState<any>({});

  const openNew = () => { setEdit(null); setForm({ nom: "", prenom: "", telephone: "", classe_id: "", matiere: "", observation: "" }); setOpen(true); };
  const openEdit = (e: VacEnseignant) => { setEdit(e); setForm({ ...e, classe_id: e.classe_id ?? "" }); setOpen(true); };
  const submit = async () => {
    if (!form.nom?.trim() || !form.prenom?.trim()) return;
    await save("vacances_enseignants", {
      nom: form.nom.trim(), prenom: form.prenom.trim(),
      telephone: form.telephone || null,
      classe_id: form.classe_id || null,
      matiere: form.matiere || null,
      observation: form.observation || null,
      // honoraire_prevu calculé automatiquement par trigger DB (tarif × nb élèves)
    }, edit?.id);
    setOpen(false);
  };

  const payePar = useMemo(() => {
    const m: Record<string, number> = {};
    honoraires.forEach((h) => { m[h.enseignant_id] = (m[h.enseignant_id] ?? 0) + Number(h.montant); });
    return m;
  }, [honoraires]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">Maîtres / Enseignants</h2><p className="text-sm text-muted-foreground">Enseignants intervenant pendant les cours de vacances.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nouveau maître</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Modifier" : "Nouveau maître"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Prénoms *</Label><Input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div>
                <Label>Classe affectée</Label>
                <Select value={form.classe_id || "none"} onValueChange={(v) => setForm({ ...form, classe_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">— Aucune —</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Matière / Niveau</Label><Input value={form.matiere || ""} onChange={(e) => setForm({ ...form, matiere: e.target.value })} /></div>
              <div className="col-span-2"><Label>Honoraire prévu (FCFA)</Label><Input type="number" value={form.honoraire_prevu ?? 0} onChange={(e) => setForm({ ...form, honoraire_prevu: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Observation</Label><Textarea value={form.observation || ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}>{edit ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <p className="p-4 text-sm">Chargement…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nom</TableHead><TableHead>Prénoms</TableHead><TableHead>Téléphone</TableHead>
                <TableHead>Classe</TableHead><TableHead>Matière</TableHead>
                <TableHead>Prévu</TableHead><TableHead>Payé</TableHead><TableHead>Reste</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {enseignants.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">Aucun maître.</TableCell></TableRow>}
                {enseignants.map((e) => {
                  const paye = payePar[e.id] ?? 0;
                  const reste = Number(e.honoraire_prevu) - paye;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nom}</TableCell>
                      <TableCell>{e.prenom}</TableCell>
                      <TableCell>{e.telephone ?? "—"}</TableCell>
                      <TableCell>{classes.find(c => c.id === e.classe_id)?.nom ?? "—"}</TableCell>
                      <TableCell>{e.matiere ?? "—"}</TableCell>
                      <TableCell>{fmt(Number(e.honoraire_prevu))}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold">{fmt(paye)}</TableCell>
                      <TableCell className={reste > 0 ? "text-destructive font-semibold" : ""}>{fmt(reste)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer ${e.nom} ${e.prenom} ?`)) remove("vacances_enseignants", e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
