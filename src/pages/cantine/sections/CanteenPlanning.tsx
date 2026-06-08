import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CalendarDays, Plus, Loader2, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCantinePlanning } from "@/hooks/useCantine";

export default function CanteenPlanning() {
  const { items, loading, add, remove } = useCantinePlanning();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date_service: new Date().toISOString().slice(0, 10), service: "dejeuner", capacite_prevue: 200, notes: "" });

  const handleAdd = async () => {
    await add({
      date_service: form.date_service,
      service: form.service,
      capacite_prevue: Number(form.capacite_prevue) || null,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  return (
    <SettingsSection
      title="Planning des repas"
      description="Services par jour, horaires et estimation des repas."
      icon={<CalendarDays className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Planifier</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun service planifié.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-center">Capacité prévue</TableHead>
              <TableHead className="text-center">Inscrits</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.date_service}</TableCell>
                <TableCell><Badge variant="secondary">{p.service}</Badge></TableCell>
                <TableCell className="text-center">{p.capacite_prevue ?? "—"}</TableCell>
                <TableCell className="text-center">{p.effectif_inscrits ?? 0}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.notes ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
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
          <DialogHeader><DialogTitle>Planifier un service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={form.date_service} onChange={(e) => setForm({ ...form, date_service: e.target.value })} /></div>
            <div>
              <Label>Service</Label>
              <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petit_dejeuner">Petit-déjeuner</SelectItem>
                  <SelectItem value="dejeuner">Déjeuner</SelectItem>
                  <SelectItem value="gouter">Goûter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Capacité prévue</Label><Input type="number" value={form.capacite_prevue} onChange={(e) => setForm({ ...form, capacite_prevue: Number(e.target.value) })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
