import { useEffect, useMemo, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Fuel, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useTransportCarburant } from "@/hooks/useTransportCarburant";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";

const fcfa = (n: number) => Math.round(n).toLocaleString("fr-FR");

export default function TransportFuel() {
  const { ecoleId } = useEcoleId();
  const { items, loading, add, remove } = useTransportCarburant();
  const { can } = usePermissions();
  const [vehicules, setVehicules] = useState<{ id: string; immatriculation: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicule_id: "", date_plein: new Date().toISOString().slice(0,10), litres: "60", prix_litre: "750", km_compteur: "", notes: "" });

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("vehicules").select("id, immatriculation").eq("ecole_id", ecoleId).order("immatriculation").then(({ data }) => setVehicules(data ?? []));
  }, [ecoleId]);

  const montant = useMemo(() => (Number(form.litres) || 0) * (Number(form.prix_litre) || 0), [form.litres, form.prix_litre]);
  const totalMois = useMemo(() => {
    const now = new Date();
    return items
      .filter((i) => { const d = new Date(i.date_plein); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, i) => s + i.montant, 0);
  }, [items]);
  const litresMois = useMemo(() => {
    const now = new Date();
    return items
      .filter((i) => { const d = new Date(i.date_plein); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, i) => s + i.litres, 0);
  }, [items]);

  const handleAdd = async () => {
    if (!form.vehicule_id) return;
    setSaving(true);
    const ok = await add({
      vehicule_id: form.vehicule_id,
      date_plein: form.date_plein,
      litres: Number(form.litres) || 0,
      prix_litre: Number(form.prix_litre) || 0,
      montant,
      km_compteur: form.km_compteur ? Number(form.km_compteur) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (ok) { setOpen(false); setForm({ vehicule_id: "", date_plein: new Date().toISOString().slice(0,10), litres: "60", prix_litre: "750", km_compteur: "", notes: "" }); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Carburant" description="Suivi des pleins de la flotte." icon={<Fuel className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total du mois</p><p className="text-2xl font-bold text-primary">{fcfa(totalMois)} FCFA</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Litres du mois</p><p className="text-2xl font-bold">{fcfa(litresMois)} L</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pleins enregistrés</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
      </div>

      {can("transport", "create") && <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouveau plein</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau plein</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Véhicule *">
                <Select value={form.vehicule_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicule_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{vehicules.map((v) => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.date_plein} onChange={(e) => setForm((p) => ({ ...p, date_plein: e.target.value }))} /></FieldRow>
              <FieldRow label="Litres"><Input type="number" value={form.litres} onChange={(e) => setForm((p) => ({ ...p, litres: e.target.value }))} /></FieldRow>
              <FieldRow label="Prix / L (FCFA)"><Input type="number" value={form.prix_litre} onChange={(e) => setForm((p) => ({ ...p, prix_litre: e.target.value }))} /></FieldRow>
              <FieldRow label="Km compteur"><Input type="number" value={form.km_compteur} onChange={(e) => setForm((p) => ({ ...p, km_compteur: e.target.value }))} /></FieldRow>
              <FieldRow label="Notes"><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></FieldRow>
              <div className="rounded-md bg-muted p-3 text-sm">Total : <strong className="text-primary">{fcfa(montant)} FCFA</strong></div>
              <Button className="w-full" onClick={handleAdd} disabled={saving || !form.vehicule_id}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead className="text-right">Litres</TableHead>
              <TableHead className="text-right">Prix/L</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date_plein}</TableCell>
                <TableCell className="font-mono text-xs">{r.vehicules?.immatriculation ?? "—"}</TableCell>
                <TableCell className="text-right">{r.litres.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right">{r.prix_litre.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right font-semibold">{fcfa(r.montant)}</TableCell>
                <TableCell className="text-right">{r.km_compteur ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {can("transport", "delete") && <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucun plein enregistré.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
