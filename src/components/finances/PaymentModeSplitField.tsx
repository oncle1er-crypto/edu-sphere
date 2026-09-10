import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MOYENS_PAIEMENT,
  labelMoyen,
  paymentParts,
  validerSplit,
  libelleRepartition,
  type MoyenPaiement,
  type PaymentSplit,
} from "@/lib/paymentSplit";

interface Props {
  /** Montant total encaissé, utilisé pour calculer la première part. */
  total: number;
  mode: string;
  onModeChange: (mode: string) => void;
  split: PaymentSplit | null;
  onSplitChange: (split: PaymentSplit | null) => void;
  reference?: string;
  onReferenceChange?: (reference: string) => void;
  disabled?: boolean;
  /** Liste de moyens spécifique au module (par défaut : la liste standard). */
  moyens?: MoyenPaiement[];
  referenceLabel?: string;
}

/**
 * Sélecteur de moyen de paiement avec option « régler en deux moyens ».
 * La première part est déduite automatiquement (total − seconde part).
 */
export function PaymentModeSplitField({
  total,
  mode,
  onModeChange,
  split,
  onSplitChange,
  reference,
  onReferenceChange,
  disabled,
  moyens = MOYENS_PAIEMENT,
  referenceLabel = "Référence",
}: Props) {
  const parts = paymentParts(total, mode, split);
  const erreur = validerSplit(total, mode, split);

  const activer = (actif: boolean) => {
    if (!actif) { onSplitChange(null); return; }
    const autre = moyens.find((m) => m.value !== mode)?.value ?? mode;
    const moitie = Math.max(1, Math.floor(Math.max(0, total) / 2));
    onSplitChange({ mode: autre, montant: moitie });
  };

  return (
    <div className="space-y-3">
      <div className={onReferenceChange ? "grid grid-cols-2 gap-3" : ""}>
        <div className="space-y-1.5">
          <Label className="text-xs">Moyen de paiement</Label>
          <Select value={mode} onValueChange={onModeChange} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {moyens.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {onReferenceChange && (
          <div className="space-y-1.5">
            <Label className="text-xs">{referenceLabel}</Label>
            <Input
              placeholder="N° reçu / transaction"
              value={reference ?? ""}
              onChange={(e) => onReferenceChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <Checkbox
          checked={!!split}
          onCheckedChange={(v) => activer(v === true)}
          disabled={disabled}
        />
        <span>Régler en deux moyens de paiement (ex. espèces + Wave)</span>
      </label>

      {split && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Second moyen</Label>
              <Select
                value={split.mode}
                onValueChange={(v) => onSplitChange({ ...split, mode: v })}
                disabled={disabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {moyens.filter((m) => m.value !== mode).map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Montant de la seconde part</Label>
              <Input
                type="number"
                min={0}
                value={String(split.montant)}
                onChange={(e) => onSplitChange({ ...split, montant: Number(e.target.value) || 0 })}
                disabled={disabled}
              />
            </div>
          </div>
          {erreur
            ? <p className="text-[11px] text-destructive">{erreur}</p>
            : <p className="text-[11px] text-muted-foreground">Répartition : {libelleRepartition(parts)}</p>}
          {!erreur && (
            <p className="text-[10px] text-muted-foreground">
              La première part ({labelMoyen(mode)}) est calculée automatiquement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
