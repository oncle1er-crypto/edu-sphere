import { ReactNode, useState, MouseEvent } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Tone = "default" | "danger" | "warning";

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Texte affiché dans le bouton déclencheur */
  children: ReactNode;
  /** Titre du dialogue */
  confirmTitle?: string;
  /** Description / contexte affiché à l'utilisateur */
  confirmDescription?: ReactNode;
  /** Libellé du bouton de confirmation */
  confirmLabel?: string;
  /** Libellé du bouton d'annulation */
  cancelLabel?: string;
  /** Tonalité visuelle (rouge pour destructif, jaune pour avertissement) */
  tone?: Tone;
  /** Action exécutée après confirmation */
  onConfirm: () => void | Promise<void>;
}

/**
 * Bouton qui ouvre un AlertDialog de confirmation avant d'exécuter l'action.
 * À utiliser pour toutes les actions critiques : paiements, validations,
 * verrouillages, révocations, suppressions, etc.
 */
export function ConfirmButton({
  children,
  confirmTitle = "Confirmer l'action ?",
  confirmDescription = "Cette action sera enregistrée. Souhaitez-vous continuer ?",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "default",
  onConfirm,
  disabled,
  className,
  ...buttonProps
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleTrigger = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setOpen(true);
  };

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const actionClass =
    tone === "danger"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      : tone === "warning"
      ? "bg-accent text-accent-foreground hover:bg-accent/90"
      : "";

  return (
    <>
      <Button
        {...buttonProps}
        disabled={disabled}
        className={className}
        onClick={handleTrigger}
      >
        {children}
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={cn(actionClass)}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {busy ? "…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
