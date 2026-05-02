import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bus, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type VehiculeRow = Database["public"]["Tables"]["vehicules"]["Row"];

export default function TransportVehicles() {
  const { ecoleId } = useEcoleId();
  const [vehicules, setVehicules] = useState<VehiculeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ immatriculation: "", marque: "", modele: "", capacite: "30", chauffeur: "", telephone_chauffeur: "" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("vehicules").select("*").eq("ecole_id", ecoleId).order("immatriculation");
    setVehicules(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.immatriculation || !ecoleId) return;
    setSaving(true);
    const { error } = await supabase.from("vehicules").insert({
      ecole_id: ecoleId, immatriculation: form.immatriculation,
      marque: form.marque || null, modele: form.modele || null,
      capacite: parseInt(form.capacite) || 30,
      chauffeur: form.chauffeur || null, telephone_chauffeur: form.telephone_chauffeur || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Véhicule ajouté"); await fetchData(); }
    setOpen(false); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<Bus className="h-5 w-5" />} title={`Véhicules (${vehicules.length})`} description="Flotte de transport scolaire." hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouveau véhicule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau véhicule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Immatriculation *"><Input value={form.immatriculation} onChange={(e) => set("immatriculation", e.target.value)} /></FieldRow>
              <FieldRow label="Marque"><Input value={form.marque} onChange={(e) => set("marque", e.target.value)} /></FieldRow>
              <FieldRow label="Modèle"><Input value={form.modele} onChange={(e) => set("modele", e.target.value)} /></FieldRow>
              <FieldRow label="Capacité"><Input type="number" value={form.capacite} onChange={(e) => set("capacite", e.target.value)} className="w-24" /></FieldRow>
              <FieldRow label="Chauffeur"><Input value={form.chauffeur} onChange={(e) => set("chauffeur", e.target.value)} /></FieldRow>
              <FieldRow label="Tél. chauffeur"><Input value={form.telephone_chauffeur} onChange={(e) => set("telephone_chauffeur", e.target.value)} placeholder="+225" /></FieldRow>
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
              <TableHead>Immatriculation</TableHead>
              <TableHead>Marque / Modèle</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicules.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono font-medium">{v.immatriculation}</TableCell>
                <TableCell>{[v.marque, v.modele].filter(Boolean).join(" ") || "—"}</TableCell>
                <TableCell>{v.capacite} places</TableCell>
                <TableCell className="text-sm">{v.chauffeur ?? "—"}<br /><span className="text-muted-foreground text-xs">{v.telephone_chauffeur ?? ""}</span></TableCell>
                <TableCell><Badge variant={v.statut === "actif" ? "default" : "secondary"}>{v.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {vehicules.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun véhicule.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
