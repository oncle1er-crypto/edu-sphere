import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Ban, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fcfa } from "../scolarite-data";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface CancelPaymentTarget {
  id: string;
  date: string;
  montant: number;
  modeLabel: string;
  reference?: string | null;
  trancheNum?: number | null;
  eleveLabel: string;
}

interface Props {
  paiement: CancelPaymentTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

function friendlyError(msg: string): string {
  // Messages propres à cet écran, conservés à l'identique ; le reste passe par la traduction partagée.
  if (msg.includes("not_authenticated")) return "Session expirée, reconnectez-vous";
  if (msg.includes("not_authorized")) return "Réservé aux administrateurs et directeurs";
  if (msg.includes("deja_annule")) return "Ce paiement a déjà été annulé";
  if (msg.includes("paiement_facture")) return "Utilisez l'écran Factures pour ce paiement";
  if (msg.includes("paiement_hors_tranche")) return "Ce paiement n'est rattaché à aucune tranche";
  if (msg.includes("paiement_introuvable")) return "Paiement introuvable";
  if (msg.includes("tranche_introuvable")) return "Tranche introuvable";
  if (msg.includes("montant_invalide")) return "Montant invalide";
  return messageErreurBase(msg, "Impossible d'annuler cet encaissement");
}

export function CancelPaymentDialog({ paiement, open, onOpenChange, onCancelled }: Props) {
  const [motif, setMotif] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMotif("");
    setConfirming(false);
  }, [open, paiement?.id]);

  const motifOk = motif.trim().length >= 5;

  const handleSubmit = async () => {
    if (!paiement || !motifOk) return;
    if (!confirming) { setConfirming(true); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("annuler_paiement_scolarite", {
        _paiement_id: paiement.id,
        _motif: motif.trim(),
      });
      if (error) throw error;
      toast.success("Encaissement annulé", {
        description: `${fcfa(paiement.montant)} FCFA — ${paiement.eleveLabel}`,
      });
      onCancelled?.();
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      toast.error(friendlyError(msg), { description: msg });
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  if (!paiement) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" /> Annuler un encaissement
          </DialogTitle>
          <DialogDescription>
            {paiement.eleveLabel} — {new Date(paiement.date).toLocaleDateString("fr-FR")}
            {paiement.trancheNum ? ` · T${paiement.trancheNum}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border border-amber-300 bg-amber-50">
            <CardContent className="p-3 flex gap-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Cette annulation est <strong>définitive et tracée dans le journal d'audit</strong>.
                Le montant sera retiré des totaux (reste dû, point de caisse) et le reçu portera la mention « ANNULÉ ».
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-muted/30">
            <CardContent className="p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="text-[10px] uppercase text-muted-foreground">Montant</p><p className="font-bold text-primary">{fcfa(paiement.montant)}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Mode</p><p className="font-bold">{paiement.modeLabel}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Référence</p><p className="font-bold font-mono truncate">{paiement.reference ?? "—"}</p></div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Motif de l'annulation <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              value={motif}
              onChange={(e) => { setMotif(e.target.value); setConfirming(false); }}
              placeholder="Ex. Chèque rejeté par la banque le 12/06."
            />
            {!motifOk && motif.length > 0 && (
              <p className="text-[11px] text-destructive">Le motif doit contenir au moins 5 caractères.</p>
            )}
          </div>

          {confirming && (
            <p className="text-[11px] text-destructive font-semibold text-center">
              Confirmez-vous l'annulation définitive de cet encaissement ? Cliquez de nouveau pour valider.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Fermer</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!motifOk || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {confirming ? "Confirmer l'annulation" : "Annuler définitivement cet encaissement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
