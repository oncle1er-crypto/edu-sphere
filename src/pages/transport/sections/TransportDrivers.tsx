import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Chauffeur {
  id: string; nom: string; prenom: string; telephone: string | null;
  numero_permis: string | null; date_expiration_permis: string | null;
  vehicule_id: string | null; statut: string;
  vehicules?: { immatriculation: string } | null;
}

export default function TransportDrivers() {
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<Chauffeur[]>([]);
  const [vehicules, setVehicules] = useState<{ id: string; immatriculation: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", numero_permis: "", date_expiration_permis: "", vehicule_id: "", statut: "actif" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fetchData = async () => {
    if (!ecoleId) return;
    const [{ data: ch }, { data: ve }] = await Promise.all([
      supabase.from("chauffeurs").select("*, vehicules(immatriculation)").eq("ecole_id", ecoleId).order("nom"),
      supabase.from("vehicules").select("id, immatriculation").eq("ecole_id", ecoleId).order("immatriculation"),
    ]);
    setRows((ch ?? []) as any);
    setVehicules(ve ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.nom || !form.prenom || !ecoleId) return;
    setSaving(true);
    const { error } = await supabase.from("chauffeurs").insert({
      ecole_id: ecoleId, nom: form.nom, prenom: form.prenom,
      telephone: form.telephone || null, numero_permis: form.numero_permis || null,
      date_expiration_permis: form.date_expiration_permis || null,
      vehicule_id: form.vehicule_id || null, statut: form.statut,
    });
    if (error) toast.error(messageErreurBase(error));
    else { toast.success("Chauffeur ajouté"); await fetchData(); setForm({ nom: "", prenom: "", telephone: "", numero_permis: "", date_expiration_permis: "", vehicule_id: "", statut: "actif" }); }
    setOpen(false); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<UserCog className="h-5 w-5" />} title={`Chauffeurs (${rows.length})`} description="Personnel de conduite et permis." hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouveau chauffeur</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau chauffeur</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} /></FieldRow>
              <FieldRow label="Prénom *"><Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} /></FieldRow>
              <FieldRow label="Téléphone"><Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+225 ..." /></FieldRow>
              <FieldRow label="N° permis"><Input value={form.numero_permis} onChange={(e) => set("numero_permis", e.target.value)} /></FieldRow>
              <FieldRow label="Expiration permis"><Input type="date" value={form.date_expiration_permis} onChange={(e) => set("date_expiration_permis", e.target.value)} /></FieldRow>
              <FieldRow label="Véhicule affecté">
                <Select value={form.vehicule_id} onValueChange={(v) => set("vehicule_id", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{vehicules.map((v) => <SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving}>
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
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Permis</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nom} {c.prenom}</TableCell>
                <TableCell>{c.telephone ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{c.numero_permis ?? "—"}</TableCell>
                <TableCell>{c.date_expiration_permis ?? "—"}</TableCell>
                <TableCell>{c.vehicules?.immatriculation ?? "—"}</TableCell>
                <TableCell><Badge variant={c.statut === "actif" ? "default" : "secondary"}>{c.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun chauffeur enregistré.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
