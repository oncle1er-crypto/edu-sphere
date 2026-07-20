import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Receipt, Plus, Loader2, Wallet, Printer, History } from "lucide-react";
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
import { InvoicePaymentDialog, type InvoiceForPayment } from "@/pages/finances/components/InvoicePaymentDialog";
import { InvoicePaymentsHistoryDialog } from "@/pages/finances/components/InvoicePaymentsHistoryDialog";
import { downloadInvoiceReceipt } from "@/lib/downloadInvoiceReceipt";
import { toast } from "sonner";

interface Row {
  id: string;
  numero: string;
  eleve_nom: string;
  libelle: string;
  montant: number;
  montant_paye: number;
  statut: string;
  date_echeance: string;
  ecole_id: string;
  categorie: string;
}

export default function CanteenBilling() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { eleves } = useEleves();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payFor, setPayFor] = useState<InvoiceForPayment | null>(null);
  const [historyFor, setHistoryFor] = useState<InvoiceForPayment | null>(null);
  const [form, setForm] = useState({ eleve_id: "", libelle: "Cantine - Mensuel", montant: "15000", date_echeance: new Date().toISOString().slice(0,10) });

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("factures")
      .select("id, numero, libelle, montant, montant_paye, statut, date_echeance, ecole_id, categorie, eleves(nom, prenom)")
      .eq("ecole_id", ecoleId).eq("categorie", "cantine")
      .order("created_at", { ascending: false });
    setRows(((data ?? []) as any[]).map((f) => ({
      id: f.id, numero: f.numero, libelle: f.libelle,
      montant: Number(f.montant), montant_paye: Number(f.montant_paye),
      statut: f.statut, date_echeance: f.date_echeance,
      ecole_id: f.ecole_id, categorie: f.categorie,
      eleve_nom: f.eleves ? `${f.eleves.nom} ${f.eleves.prenom}` : "?",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.eleve_id || !ecoleId || !anneeId) return;
    setSaving(true);
    const numero = `CTN-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`;
    const { error } = await supabase.from("factures").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, annee_id: anneeId,
      numero, libelle: form.libelle, montant: parseFloat(form.montant) || 0,
      date_echeance: form.date_echeance, statut: "emise", categorie: "cantine",
    });
    if (error) toast.error(error.message);
    else { toast.success("Facture créée"); await fetchData(); }
    setOpen(false); setSaving(false);
  };

  const openPayDialog = (r: Row) => {
    setPayFor({
      id: r.id, numero: r.numero, libelle: r.libelle,
      montant: r.montant, montant_paye: r.montant_paye,
      eleve_nom: r.eleve_nom, ecole_id: r.ecole_id, categorie: r.categorie,
    });
  };

  const reprint = async (r: Row) => {
    if (r.montant_paye <= 0) { toast.info("Aucun paiement à réimprimer"); return; }
    await downloadInvoiceReceipt({ ecoleId: r.ecole_id, factureId: r.id });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Facturation cantine" description="Génération, encaissement et suivi des factures de restauration." icon={<Receipt className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle facture</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle facture cantine</DialogTitle></DialogHeader>
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
              <TableHead className="text-right">Réglé</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const solde = f.montant_paye >= f.montant;
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                  <TableCell className="font-medium">{f.eleve_nom}</TableCell>
                  <TableCell>{f.libelle}</TableCell>
                  <TableCell>{f.date_echeance}</TableCell>
                  <TableCell className="text-right">{f.montant.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right text-primary">{f.montant_paye.toLocaleString("fr-FR")}</TableCell>
                  <TableCell><Badge variant={solde ? "default" : f.montant_paye > 0 ? "secondary" : "destructive"}>{solde ? "Payée" : f.montant_paye > 0 ? "Partielle" : f.statut}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {!solde && (
                      <Button size="sm" variant="outline" onClick={() => openPayDialog(f)}>
                        <Wallet className="h-3.5 w-3.5" /> Encaisser
                      </Button>
                    )}
                    {f.montant_paye > 0 && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setHistoryFor({
                          id: f.id, numero: f.numero, libelle: f.libelle,
                          montant: f.montant, montant_paye: f.montant_paye,
                          eleve_nom: f.eleve_nom, ecole_id: f.ecole_id, categorie: f.categorie,
                        })} title="Historique / Annuler">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reprint(f)} title="Réimprimer le reçu">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Aucune facture cantine.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InvoicePaymentDialog
        facture={payFor}
        open={!!payFor}
        onOpenChange={(o) => !o && setPayFor(null)}
        onPaymentRecorded={fetchData}
      />

      <InvoicePaymentsHistoryDialog
        facture={historyFor}
        open={!!historyFor}
        onOpenChange={(o) => !o && setHistoryFor(null)}
        onChanged={fetchData}
      />
    </SettingsSection>
  );
}
