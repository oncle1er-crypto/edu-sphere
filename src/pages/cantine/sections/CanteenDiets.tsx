import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Apple, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCantineRegimes } from "@/hooks/useCantine";
import { useEleves } from "@/hooks/useEleves";

export default function CanteenDiets() {
  const { items, loading, add, remove } = useCantineRegimes();
  const { eleves } = useEleves();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", type_regime: "Standard", allergenes: "", restrictions: "" });

  const handleAdd = async () => {
    if (!form.eleve_id) return;
    await add({
      eleve_id: form.eleve_id,
      type_regime: form.type_regime,
      allergenes: form.allergenes ? form.allergenes.split(",").map((a) => a.trim()) : [],
      restrictions: form.restrictions || null,
    });
    setOpen(false);
    setForm({ eleve_id: "", type_regime: "Standard", allergenes: "", restrictions: "" });
  };

  const eleveLabel = (id: string) => {
    const e = eleves.find((x) => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : "—";
  };

  return (
    <SettingsSection
      title="Régimes alimentaires & allergies"
      description="Liste des restrictions à respecter en cuisine."
      icon={<Apple className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter une fiche
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun régime enregistré.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Régime</TableHead>
              <TableHead>Allergènes</TableHead>
              <TableHead>Restrictions</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{eleveLabel(r.eleve_id)}</TableCell>
                <TableCell>{r.type_regime}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(r.allergenes ?? []).map((a: string) => (
                      <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.restrictions ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle fiche régime</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Élève</Label>
              <Select value={form.eleve_id} onValueChange={(v) => setForm({ ...form, eleve_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                <SelectContent>
                  {eleves.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de régime</Label>
              <Select value={form.type_regime} onValueChange={(v) => setForm({ ...form, type_regime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Sans porc">Sans porc</SelectItem>
                  <SelectItem value="Végétarien">Végétarien</SelectItem>
                  <SelectItem value="Sans gluten">Sans gluten</SelectItem>
                  <SelectItem value="Sans lactose">Sans lactose</SelectItem>
                  <SelectItem value="Halal">Halal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allergènes (séparés par virgule)</Label>
              <Input value={form.allergenes} onChange={(e) => setForm({ ...form, allergenes: e.target.value })} placeholder="Arachide, Lactose" />
            </div>
            <div>
              <Label>Restrictions / notes</Label>
              <Input value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!form.eleve_id}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
