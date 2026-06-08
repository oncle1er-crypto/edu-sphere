import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Plus, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnseignantFormations } from "@/hooks/useEnseignantsRH";
import { useEnseignants } from "@/hooks/useEnseignants";

const STATUTS = ["planifiee", "en_cours", "validee", "annulee"];

export default function StaffTraining() {
  const { items, loading, add, update, remove } = useEnseignantFormations();
  const { enseignants } = useEnseignants();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    enseignant_id: "", intitule: "", organisme: "", date_debut: "", date_fin: "",
    duree_heures: 0, lieu: "", cout: 0,
  });

  const handleAdd = async () => {
    if (!form.enseignant_id || !form.intitule) return;
    await add({
      ...form,
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
      duree_heures: Number(form.duree_heures) || null,
      cout: Number(form.cout) || null,
    });
    setOpen(false);
  };

  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Formations & certifications"
      description="Plan de formation continue et certifications obtenues."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Inscrire à une formation</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucune formation enregistrée.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Organisme</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f: any) => {
                const ens = f.enseignants;
                const nom = ens ? `${ens.prenom} ${ens.nom}` : "—";
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{nom}</TableCell>
                    <TableCell>{f.intitule}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.organisme ?? "—"}</TableCell>
                    <TableCell className="text-xs">{f.date_debut ?? "—"} → {f.date_fin ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{f.duree_heures ?? 0}h</Badge></TableCell>
                    <TableCell>
                      <Select value={f.statut} onValueChange={(v) => update(f.id, { statut: v })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle formation</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Enseignant</Label>
              <Select value={form.enseignant_id} onValueChange={(v) => setForm({ ...form, enseignant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {enseignants.map((e) => <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Intitulé</Label><Input value={form.intitule} onChange={(e) => setForm({ ...form, intitule: e.target.value })} /></div>
            <div><Label>Organisme</Label><Input value={form.organisme} onChange={(e) => setForm({ ...form, organisme: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date début</Label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><Label>Date fin</Label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
              <div><Label>Durée (heures)</Label><Input type="number" value={form.duree_heures} onChange={(e) => setForm({ ...form, duree_heures: Number(e.target.value) })} /></div>
              <div><Label>Coût (FCFA)</Label><Input type="number" value={form.cout} onChange={(e) => setForm({ ...form, cout: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Lieu</Label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!form.enseignant_id || !form.intitule}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
