import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useVacancesData, VacClasse } from "../hooks/useVacances";
import { Plus, Pencil, Trash2 } from "lucide-react";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesClasses() {
  const { classes, eleves, loading, save, remove } = useVacancesData();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<VacClasse | null>(null);
  const [form, setForm] = useState({ nom: "", montant: 0, capacite: "", actif: true });

  const openNew = () => { setEdit(null); setForm({ nom: "", montant: 0, capacite: "", actif: true }); setOpen(true); };
  const openEdit = (c: VacClasse) => {
    setEdit(c);
    setForm({ nom: c.nom, montant: Number(c.montant), capacite: c.capacite?.toString() ?? "", actif: c.actif });
    setOpen(true);
  };
  const submit = async () => {
    if (!form.nom.trim()) return;
    await save("vacances_classes", {
      nom: form.nom.trim(),
      montant: Number(form.montant) || 0,
      capacite: form.capacite ? Number(form.capacite) : null,
      actif: form.actif,
    }, edit?.id);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Classes / Tarifs</h2>
          <p className="text-sm text-muted-foreground">Définissez les classes ouvertes et leur montant unique.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nouvelle classe</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Modifier la classe" : "Nouvelle classe"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom de la classe *</Label><Input value={form.nom} onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex. CP1, CE2, 6e" /></div>
              <div><Label>Montant (FCFA) *</Label><Input type="number" value={form.montant} onChange={(e) => setForm(f => ({ ...f, montant: Number(e.target.value) }))} /></div>
              <div><Label>Capacité maximale (optionnel)</Label><Input type="number" value={form.capacite} onChange={(e) => setForm(f => ({ ...f, capacite: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.actif} onCheckedChange={(v) => setForm(f => ({ ...f, actif: v }))} /><Label>Classe active</Label></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}>{edit ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          {loading ? <p className="p-4 text-sm text-muted-foreground">Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead><TableHead>Montant</TableHead>
                  <TableHead>Capacité</TableHead><TableHead>Inscrits</TableHead>
                  <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Aucune classe.</TableCell></TableRow>}
                {classes.map((c) => {
                  const inscrits = eleves.filter((e) => e.classe_id === c.id).length;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nom}</TableCell>
                      <TableCell>{fmt(Number(c.montant))}</TableCell>
                      <TableCell>{c.capacite ?? "—"}</TableCell>
                      <TableCell>{inscrits}</TableCell>
                      <TableCell><Badge variant={c.actif ? "default" : "secondary"}>{c.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer ${c.nom} ?`)) remove("vacances_classes", c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
