import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Wrench, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useTransportMaintenance } from "@/hooks/useTransportMaintenance";
import { maintenanceDeadlineStatus } from "@/lib/maintenanceDeadline";
import { usePermissions } from "@/hooks/usePermissions";

const fcfa = (n: number) => Math.round(n).toLocaleString("fr-FR");
export default function TransportMaintenance() {
  const { ecoleId } = useEcoleId();
  const { items, loading, add, remove } = useTransportMaintenance();
  const { can } = usePermissions();
  const [vehicules, setVehicules] = useState<{ id: string; immatriculation: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicule_id: "", type: "vidange", date_operation: new Date().toISOString().slice(0,10), km_compteur: "", cout: "0", garage: "", description: "", prochaine_echeance_date: "", statut: "realise" });

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("vehicules").select("id, immatriculation").eq("ecole_id", ecoleId).order("immatriculation").then(({ data }) => setVehicules(data ?? []));
  }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.vehicule_id) return;
    setSaving(true);
    const ok = await add({
      vehicule_id: form.vehicule_id, type: form.type,
      date_operation: form.date_operation,
      km_compteur: form.km_compteur ? Number(form.km_compteur) : null,
      cout: Number(form.cout) || 0,
      garage: form.garage || null,
      description: form.description || null,
      prochaine_echeance_date: form.prochaine_echeance_date || null,
      statut: form.statut,
    });
    setSaving(false);
    if (ok) { setOpen(false); setForm({ vehicule_id: "", type: "vidange", date_operation: new Date().toISOString().slice(0,10), km_compteur: "", cout: "0", garage: "", description: "", prochaine_echeance_date: "", statut: "realise" }); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Maintenance" description="Entretien et contrôles techniques des véhicules." icon={<Wrench className="h-5 w-5" />} hideSave>
      {can("transport", "create") && <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle opération</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle opération de maintenance</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Véhicule *">
                <Select value={form.vehicule_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicule_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{vehicules.map((v) => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Type">
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vidange">Vidange</SelectItem>
                    <SelectItem value="revision">Révision</SelectItem>
                    <SelectItem value="reparation">Réparation</SelectItem>
                    <SelectItem value="controle_technique">Contrôle technique</SelectItem>
                    <SelectItem value="assurance">Assurance</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.date_operation} onChange={(e) => setForm((p) => ({ ...p, date_operation: e.target.value }))} /></FieldRow>
              <FieldRow label="Km compteur"><Input type="number" value={form.km_compteur} onChange={(e) => setForm((p) => ({ ...p, km_compteur: e.target.value }))} /></FieldRow>
              <FieldRow label="Coût (FCFA)"><Input type="number" value={form.cout} onChange={(e) => setForm((p) => ({ ...p, cout: e.target.value }))} /></FieldRow>
              <FieldRow label="Garage"><Input value={form.garage} onChange={(e) => setForm((p) => ({ ...p, garage: e.target.value }))} /></FieldRow>
              <FieldRow label="Description"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></FieldRow>
              <FieldRow label="Prochaine échéance"><Input type="date" value={form.prochaine_echeance_date} onChange={(e) => setForm((p) => ({ ...p, prochaine_echeance_date: e.target.value }))} /></FieldRow>
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
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Coût</TableHead>
              <TableHead>Garage</TableHead>
              <TableHead>Prochaine échéance</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const deadline = maintenanceDeadlineStatus(r.prochaine_echeance_date);
              return (
              <TableRow key={r.id} className={deadline === "overdue" ? "bg-red-50" : deadline === "due_soon" ? "bg-amber-50" : ""}>
                <TableCell>{r.date_operation}</TableCell>
                <TableCell className="font-mono text-xs">{r.vehicules?.immatriculation ?? "—"}</TableCell>
                <TableCell className="capitalize">{r.type.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right">{r.km_compteur ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fcfa(r.cout)}</TableCell>
                <TableCell>{r.garage ?? "—"}</TableCell>
                <TableCell>
                  {r.prochaine_echeance_date
                    ? <span className={deadline === "overdue" ? "font-semibold text-red-700" : deadline === "due_soon" ? "font-semibold text-amber-700" : ""}>{r.prochaine_echeance_date}{deadline === "overdue" && <Badge variant="destructive" className="ml-2">En retard</Badge>}{deadline === "due_soon" && <Badge variant="secondary" className="ml-2">Imminente</Badge>}</span>
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {can("transport", "delete") && <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                </TableCell>
              </TableRow>
            )})}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Aucune opération enregistrée.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
