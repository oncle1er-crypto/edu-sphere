import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Printer, Ban, Loader2, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { downloadInvoiceReceipt } from "@/lib/downloadInvoiceReceipt";
import { toast } from "sonner";
import type { InvoiceForPayment } from "./InvoicePaymentDialog";

const MODES = ["especes","wave","orange_money","mtn_money","moov_money","virement","cheque","remise","bourse","prise_en_charge"] as const;

interface Props {
  facture: InvoiceForPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

interface Paiement {
  id: string;
  montant: number;
  mode: string;
  reference: string | null;
  date_paiement: string;
  annule_le: string | null;
  motif_annulation: string | null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

export function InvoicePaymentsHistoryDialog({ facture, open, onOpenChange, onChanged }: Props) {
  const { isAdmin } = useIsAdmin();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [motifFor, setMotifFor] = useState<string | null>(null);
  const [motif, setMotif] = useState("");

  const fetchPaiements = async () => {
    if (!facture) return;
    setLoading(true);
    const { data } = await supabase
      .from("paiements")
      .select("id, montant, mode, reference, date_paiement, annule_le, motif_annulation")
      .eq("facture_id", facture.id)
      .order("date_paiement", { ascending: false })
      .order("created_at", { ascending: false });
    setPaiements(((data ?? []) as any[]) as Paiement[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && facture) fetchPaiements();
    if (!open) { setMotifFor(null); setMotif(""); }
  }, [open, facture?.id]);

  if (!facture) return null;

  const reprint = async (p: Paiement) => {
    await downloadInvoiceReceipt({
      ecoleId: facture.ecole_id,
      factureId: facture.id,
      montant: Number(p.montant),
      reference: p.reference,
      mode: p.mode,
      datePaiement: p.date_paiement,
    });
  };

  const confirmCancel = async (p: Paiement) => {
    if (motif.trim().length < 3) {
      toast.error("Motif obligatoire (3 caractères minimum)");
      return;
    }
    setCancelling(p.id);
    try {
      const { error } = await supabase.rpc("annuler_paiement_facture", {
        _paiement_id: p.id,
        _motif: motif.trim(),
      });
      if (error) throw error;
      toast.success("Paiement annulé", { description: `${fcfa(Number(p.montant))} retirés de la facture` });
      // Reçu de correction téléchargé automatiquement
      await downloadInvoiceReceipt({
        ecoleId: facture.ecole_id,
        factureId: facture.id,
        montant: Number(p.montant),
        mode: p.mode,
        annulation: true,
        motifAnnulation: motif.trim(),
      });
      setMotifFor(null); setMotif("");
      await fetchPaiements();
      onChanged?.();
    } catch (err: any) {
      toast.error("Annulation refusée", { description: err?.message ?? "Erreur inconnue" });
    } finally {
      setCancelling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <History className="h-5 w-5" /> Historique des paiements
          </DialogTitle>
          <DialogDescription>
            {facture.numero} — {facture.libelle} · {facture.eleve_nom}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : paiements.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Aucun paiement enregistré pour cette facture.</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map((p) => {
                  const isCancelled = !!p.annule_le;
                  return (
                    <>
                      <TableRow key={p.id} className={isCancelled ? "opacity-60" : ""}>
                        <TableCell className="text-xs">{p.date_paiement}</TableCell>
                        <TableCell className="font-mono text-xs">{p.reference ?? "—"}</TableCell>
                        <TableCell className="text-xs uppercase">{p.mode}</TableCell>
                        <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-muted-foreground" : "text-primary"}`}>
                          {fcfa(Number(p.montant))}
                        </TableCell>
                        <TableCell>
                          {isCancelled
                            ? <Badge variant="destructive">Annulé</Badge>
                            : <Badge variant="default">Encaissé</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => reprint(p)} title="Réimprimer">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          {!isCancelled && isAdmin && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setMotifFor(p.id); setMotif(""); }} title="Annuler ce paiement">
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {motifFor === p.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-destructive/5 py-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-destructive">Motif de l'annulation (obligatoire)</Label>
                              <Textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : Double encaissement, erreur de saisie, remboursement famille…" />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setMotifFor(null); setMotif(""); }} disabled={cancelling === p.id}>Retour</Button>
                                <Button size="sm" variant="destructive" onClick={() => confirmCancel(p)} disabled={cancelling === p.id}>
                                  {cancelling === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                  Confirmer l'annulation
                                </Button>
                              </div>
                              {isCancelled && p.motif_annulation && (
                                <p className="text-xs text-muted-foreground">Motif enregistré : {p.motif_annulation}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {isCancelled && p.motif_annulation && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-xs text-muted-foreground italic pt-0">
                            Motif : {p.motif_annulation}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!isAdmin && (
          <p className="text-[11px] text-muted-foreground">Seul un administrateur peut annuler un paiement.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
