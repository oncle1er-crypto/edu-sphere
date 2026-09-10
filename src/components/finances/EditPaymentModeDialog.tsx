import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentModeSplitField } from "@/components/finances/PaymentModeSplitField";
import { validerSplit, type MoyenPaiement, type PaymentSplit } from "@/lib/paymentSplit";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Résumé affiché en lecture seule (numéro, bénéficiaire, montant…). */
  summary?: string;
  /** Montant total déjà encaissé — sert de référence pour valider le split, n'est jamais modifié. */
  total: number;
  initialMode: string;
  initialSplit: PaymentSplit | null;
  moyens?: MoyenPaiement[];
  /** Reçoit le nouveau mode + la nouvelle répartition ; ne doit toucher qu'à ces champs côté appelant. */
  onSave: (mode: string, split: PaymentSplit | null) => Promise<void> | void;
}

/**
 * Dialogue dédié à la correction du mode de paiement d'un encaissement déjà
 * enregistré (services ponctuels, ventes de tenues, cours de vacances) —
 * volontairement limité au mode/à la répartition en deux moyens : ne permet
 * pas de modifier le montant, le bénéficiaire, la quantité ou le statut,
 * pour ne pas rouvrir de logique métier hors du périmètre demandé (stock,
 * échéances, etc.).
 */
export function EditPaymentModeDialog({
  open, onOpenChange, summary, total, initialMode, initialSplit, moyens, onSave,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [split, setSplit] = useState<PaymentSplit | null>(initialSplit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSplit(initialSplit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const erreur = validerSplit(total, mode, split);
    if (erreur) { toast.error(erreur); return; }
    setSaving(true);
    try {
      await onSave(mode, split);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le mode de paiement</DialogTitle>
          <DialogDescription>
            Seul le mode de règlement peut être corrigé ici (montant, bénéficiaire et statut restent inchangés).
          </DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">{summary}</div>
        )}
        <PaymentModeSplitField
          total={total}
          mode={mode}
          onModeChange={setMode}
          split={split}
          onSplitChange={setSplit}
          moyens={moyens}
          disabled={saving}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
