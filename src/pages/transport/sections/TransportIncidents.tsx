import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { AlertTriangle, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useTransportIncidents } from "@/hooks/useTransportIncidents";

const GRAVITE_COLOR: Record<string, "default" | "secondary" | "destructive"> = {
  mineure: "secondary", moyenne: "default", majeure: "destructive",
};

export default function TransportIncidents() {
  const { ecoleId } = useEcoleId();
  const { items, loading, add, update, remove } = useTransportIncidents();
  const [vehicules, setVehicules] = useState<{ id: string; immatriculation: string }[]>([]);
  const [chauffeurs, setChauffeurs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicule_id: "", chauffeur_id: "", date_incident: new Date().toISOString().slice(0,10), type: "panne", gravite: "mineure", description: "", statut: "ouvert" });

  useEffect(() => {
    if (!ecoleId) return;
    Promise.all([
      supabase.from("vehicules").select("id, immatriculation").eq("ecole_id", ecoleId),
      supabase.from("chauffeurs").select("id, nom, prenom").eq("ecole_id", ecoleId),
    ]).then(([v, c]) => { setVehicules(v.data ?? []); setChauffeurs(c.data ?? []); });
  }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.description) return;
    setSaving(true);
    const ok = await add({
      vehicule_id: form.vehicule_id || null,
      chauffeur_id: form.chauffeur_id || null,
      date_incident: form.date_incident,
      type: form.type, gravite: form.gravite, description: form.description, statut: form.statut,
    });
    setSaving(false);
    if (ok) { setOpen(false); setForm({ vehicule_id: "", chauffeur_id: "", date_incident: new Date().toISOString().slice(0,10), type: "panne", gravite: "mineure", description: "", statut: "ouvert" }); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Incidents" description="Pannes, accidents, retards signalés." icon={<AlertTriangle className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvel incident</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Signaler un incident</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Véhicule">
                <Select value={form.vehicule_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicule_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{vehicules.map((v) => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Chauffeur">
                <Select value={form.chauffeur_id} onValueChange={(v) => setForm((p) => ({ ...p, chauffeur_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{chauffeurs.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom} {c.prenom}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.date_incident} onChange={(e) => setForm((p) => ({ ...p, date_incident: e.target.value }))} /></FieldRow>
              <FieldRow label="Type">
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="panne">Panne</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="retard">Retard</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gravité">
                <Select value={form.gravite} onValueChange={(v) => setForm((p) => ({ ...p, gravite: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mineure">Mineure</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="majeure">Majeure</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Description *"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving || !form.description}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Gravité</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date_incident}</TableCell>
                <TableCell className="font-mono text-xs">{r.vehicules?.immatriculation ?? "—"}</TableCell>
                <TableCell>{r.chauffeurs ? `${r.chauffeurs.nom} ${r.chauffeurs.prenom}` : "—"}</TableCell>
                <TableCell className="capitalize">{r.type}</TableCell>
                <TableCell><Badge variant={GRAVITE_COLOR[r.gravite] ?? "secondary"}>{r.gravite}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                <TableCell>
                  <Select value={r.statut} onValueChange={(v) => update(r.id, { statut: v })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ouvert">Ouvert</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="traite">Traité</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Aucun incident signalé.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
