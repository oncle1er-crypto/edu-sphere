import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LigneRow = Database["public"]["Tables"]["lignes_transport"]["Row"];

export default function TransportLines() {
  const { ecoleId } = useEcoleId();
  const [lignes, setLignes] = useState<LigneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: "", depart: "", arrivee: "", heure_depart: "", heure_arrivee: "", tarif: "25000" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("lignes_transport").select("*").eq("ecole_id", ecoleId).order("nom");
    setLignes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.nom || !ecoleId) return;
    setSaving(true);
    const { error } = await supabase.from("lignes_transport").insert({
      ecole_id: ecoleId, nom: form.nom, depart: form.depart, arrivee: form.arrivee,
      heure_depart: form.heure_depart || null, heure_arrivee: form.heure_arrivee || null,
      tarif_mensuel: parseFloat(form.tarif) || 25000,
    });
    if (error) toast.error(error.message);
    else { toast.success("Ligne créée"); await fetchData(); }
    setOpen(false); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<MapPin className="h-5 w-5" />} title={`Lignes (${lignes.length})`} description="Itinéraires de transport scolaire." hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle ligne</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle ligne de transport</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ligne Cocody-Plateau" /></FieldRow>
              <FieldRow label="Départ"><Input value={form.depart} onChange={(e) => set("depart", e.target.value)} placeholder="Cocody" /></FieldRow>
              <FieldRow label="Arrivée"><Input value={form.arrivee} onChange={(e) => set("arrivee", e.target.value)} placeholder="Plateau" /></FieldRow>
              <FieldRow label="Heure départ"><Input type="time" value={form.heure_depart} onChange={(e) => set("heure_depart", e.target.value)} /></FieldRow>
              <FieldRow label="Heure arrivée"><Input type="time" value={form.heure_arrivee} onChange={(e) => set("heure_arrivee", e.target.value)} /></FieldRow>
              <FieldRow label="Tarif mensuel (FCFA)"><Input type="number" value={form.tarif} onChange={(e) => set("tarif", e.target.value)} /></FieldRow>
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
              <TableHead>Départ</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Horaires</TableHead>
              <TableHead>Tarif/mois</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nom}</TableCell>
                <TableCell>{l.depart}</TableCell>
                <TableCell>{l.arrivee}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {l.heure_depart && l.heure_arrivee ? `${l.heure_depart} → ${l.heure_arrivee}` : "—"}
                </TableCell>
                <TableCell className="font-semibold">{(l.tarif_mensuel ?? 0).toLocaleString("fr-FR")} FCFA</TableCell>
              </TableRow>
            ))}
            {lignes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune ligne.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
