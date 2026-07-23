import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { downloadInvoiceReceipt } from "@/lib/downloadInvoiceReceipt";
import { toast } from "sonner";

const MOYENS = [
  { label: "Espèces", value: "especes" },
  { label: "Wave", value: "wave" },
  { label: "Orange Money", value: "orange_money" },
  { label: "MTN MoMo", value: "mtn_money" },
  { label: "Moov Money", value: "moov_money" },
  { label: "Virement", value: "virement" },
  { label: "Chèque", value: "cheque" },
];

export interface InvoiceForPayment {
  id: string;
  numero: string;
  libelle: string;
  montant: number;
  montant_paye: number;
  eleve_nom: string;
  ecole_id: string;
  categorie?: string;
}

interface Props {
  facture: InvoiceForPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: () => void;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

export function InvoicePaymentDialog({ facture, open, onOpenChange, onPaymentRecorded }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [montant, setMontant] = useState("");
  const [moyen, setMoyen] = useState("especes");
  const [reference, setReference] = useState("");
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));

  const restant = facture ? Math.max(0, facture.montant - facture.montant_paye) : 0;
  const montantNum = Number(montant) || 0;
  const valid = !!facture && montantNum > 0 && montantNum <= restant;

  useEffect(() => {
    if (!open || !facture) return;
    submittingRef.current = false;
    setMontant(String(restant));
    setMoyen("especes");
    setReference("");
    setDatePaiement(new Date().toISOString().slice(0, 10));
  }, [open, facture, restant]);

  if (!facture) return null;

  const handleSubmit = async () => {
    if (!valid || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const { data: paiementId, error } = await supabase.rpc("enregistrer_paiement_facture", {
        _facture_id: facture.id,
        _montant: montantNum,
        _mode: moyen,
        _reference: reference || null,
        _recu_par: user?.id ?? null,
      });
      if (error) throw error;

      toast.success("Encaissement enregistré", {
        description: `${fcfa(montantNum)} · ${facture.numero} · ${facture.eleve_nom}`,
      });

      // Reçu PDF téléchargé automatiquement
      await downloadInvoiceReceipt({
        ecoleId: facture.ecole_id,
        factureId: facture.id,
        montant: montantNum,
        reference: reference || (typeof paiementId === "string" ? `REC-${paiementId.slice(0, 8).toUpperCase()}` : null),
        mode: moyen,
      });

      onOpenChange(false);
      onPaymentRecorded?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Encaissement refusé", { description: err?.message ?? "Erreur inconnue" });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" /> Encaisser la facture
          </DialogTitle>
          <DialogDescription>
            {facture.numero} — {facture.libelle}
            <br />
            <span className="text-xs">{facture.eleve_nom}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border bg-muted/30">
            <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-muted-foreground uppercase">Montant</p><p className="text-xs font-bold">{fcfa(facture.montant)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Déjà réglé</p><p className="text-xs font-bold text-primary">{fcfa(facture.montant_paye)}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Restant</p><p className="text-xs font-bold text-destructive">{fcfa(restant)}</p></div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Montant encaissé (FCFA)</Label>
            <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {montantNum > restant && (
              <p className="text-[11px] text-destructive">Le montant dépasse le reste dû.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Moyen de paiement</Label>
              <Select value={moyen} onValueChange={setMoyen}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOYENS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Référence</Label>
              <Input placeholder="N° reçu / transaction" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enregistrer & imprimer le reçu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
