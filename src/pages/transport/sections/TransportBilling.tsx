import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Receipt, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useEleves } from "@/hooks/useEleves";
import { toast } from "sonner";

interface Row { id: string; numero: string; eleve_nom: string; libelle: string; montant: number; montant_paye: number; statut: string; date_echeance: string; }

export default function TransportBilling() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { eleves } = useEleves();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", libelle: "Transport - Mensuel", montant: "18000", date_echeance: new Date().toISOString().slice(0,10) });

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("factures").select("id, numero, libelle, montant, montant_paye, statut, date_echeance, eleves(nom, prenom)").eq("ecole_id", ecoleId).eq("categorie", "transport").order("created_at", { ascending: false });
    setRows(((data ?? []) as any[]).map((f) => ({
      id: f.id, numero: f.numero, libelle: f.libelle, montant: Number(f.montant), montant_paye: Number(f.montant_paye),
      statut: f.statut, date_echeance: f.date_echeance,
      eleve_nom: f.eleves ? `${f.eleves.prenom} ${f.eleves.nom}` : "?",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.eleve_id || !ecoleId || !anneeId) return;
    setSaving(true);
    const numero = `TRP-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`;
    const { error } = await supabase.from("factures").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, annee_id: anneeId,
      numero, libelle: form.libelle, montant: parseFloat(form.montant) || 0,
      date_echeance: form.date_echeance, statut: "emise", categorie: "transport",
    });
    if (error) toast.error(error.message);
    else { toast.success("Facture créée"); await fetchData(); }
    setOpen(false); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Facturation transport" description="Factures émises pour les abonnements." icon={<Receipt className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle facture</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle facture transport</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Élève *">
                <Select value={form.eleve_id} onValueChange={(v) => setForm((p) => ({ ...p, eleve_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{eleves.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Libellé"><Input value={form.libelle} onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))} /></FieldRow>
              <FieldRow label="Montant (FCFA)"><Input type="number" value={form.montant} onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))} /></FieldRow>
              <FieldRow label="Échéance"><Input type="date" value={form.date_echeance} onChange={(e) => setForm((p) => ({ ...p, date_echeance: e.target.value }))} /></FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving || !form.eleve_id}>
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
              <TableHead>N°</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                <TableCell className="font-medium">{f.eleve_nom}</TableCell>
                <TableCell>{f.libelle}</TableCell>
                <TableCell>{f.date_echeance}</TableCell>
                <TableCell className="text-right">{f.montant.toLocaleString("fr-FR")} FCFA</TableCell>
                <TableCell><Badge variant={f.montant_paye >= f.montant ? "default" : f.montant_paye > 0 ? "secondary" : "destructive"}>{f.montant_paye >= f.montant ? "Payée" : f.montant_paye > 0 ? "Partielle" : f.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucune facture transport.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
