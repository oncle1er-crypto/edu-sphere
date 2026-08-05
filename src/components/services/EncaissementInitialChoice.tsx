import { FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";
import type { GrilleService } from "@/hooks/useGrilleServices";

export type PortionEncaissement = "aucun" | "periode" | "mois";

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} F`;

/** Montant de la 1ʳᵉ échéance de la grille. */
export function montantPremierePeriode(grille?: GrilleService | null): number {
  if (!grille) return 0;
  const t = (grille.tranches ?? [])[0];
  if (t?.montant) return Number(t.montant);
  const n = Math.max((grille.tranches ?? []).length, 1);
  return Math.round(Number(grille.montant_total ?? 0) / n);
}

/** Montant à encaisser selon le choix (période entière ou 1 mois). */
export function montantAEncaisser(grille: GrilleService | null | undefined, portion: PortionEncaissement): number {
  const base = montantPremierePeriode(grille);
  if (portion === "aucun") return 0;
  if (portion === "mois" && grille?.periodicite === "trimestriel") return Math.round(base / 3);
  return base;
}

interface Props {
  grille?: GrilleService | null;
  value: PortionEncaissement;
  onValueChange: (v: PortionEncaissement) => void;
}

export function EncaissementInitialChoice({ grille, value, onValueChange }: Props) {
  if (!grille) return null;
  const base = montantPremierePeriode(grille);
  const trimestriel = grille.periodicite === "trimestriel";
  const libellePeriode = (grille.tranches ?? [])[0]?.label ?? (trimestriel ? "1ᵉʳ trimestre" : "1ᵉʳ mois");

  return (
    <>
      <FieldRow label="Encaissement">
        <Select value={value} onValueChange={(v) => onValueChange(v as PortionEncaissement)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aucun">Plus tard (créer l'abonnement seulement)</SelectItem>
            <SelectItem value="periode">
              {trimestriel ? "Payer le trimestre" : "Payer le mois"} — {fcfa(base)}
            </SelectItem>
            {trimestriel && (
              <SelectItem value="mois">Payer 1 mois (acompte) — {fcfa(Math.round(base / 3))}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </FieldRow>

      {value !== "aucun" && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2">
          <Wallet className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            À l'enregistrement : la facture <b>{libellePeriode}</b> ({fcfa(base)}) est ouverte, puis la caisse s'ouvre
            avec <b>{fcfa(montantAEncaisser(grille, value))}</b> pré-rempli (modifiable). Le reçu est généré
            automatiquement après validation.
          </p>
        </div>
      )}
    </>
  );
}
