import { useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

interface PersonnelOption {
  value: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mois: number;
  annee: number;
  personnel: PersonnelOption[];
  onGenerate: (personnelId: string, mois: number, annee: number, netCible: number) => Promise<boolean>;
}

export default function NetPayrollDialog({
  open,
  onOpenChange,
  mois,
  annee,
  personnel,
  onGenerate,
}: Props) {
  const [personnelId, setPersonnelId] = useState("");
  const [net, setNet] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPersonnelId("");
    setNet("");
  };

  const submit = async () => {
    const netCible = Number(net);
    if (!personnelId) {
      toast.error("Sélectionnez un membre du personnel");
      return;
    }
    if (!Number.isInteger(netCible) || netCible <= 0) {
      toast.error("Le net à payer doit être un montant entier strictement positif");
      return;
    }
    setLoading(true);
    try {
      const ok = await onGenerate(personnelId, mois, annee, netCible);
      if (ok) {
        reset();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer depuis le net à payer</DialogTitle>
          <DialogDescription>
            Indiquez le montant net que l'employé doit recevoir pour la période sélectionnée.
            Le salaire brut, les retenues et les charges seront calculés automatiquement selon les barèmes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            Période : <strong>{String(mois).padStart(2, "0")}/{annee}</strong>
          </div>
          <div className="space-y-2">
            <Label>Membre du personnel *</Label>
            <SearchableSelect
              value={personnelId}
              onValueChange={setPersonnelId}
              placeholder="Choisir un employé..."
              searchPlaceholder="Rechercher un employé..."
              options={personnel}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="net-cible">Net à payer souhaité (FCFA) *</Label>
            <Input
              id="net-cible"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={net}
              onChange={(event) => setNet(event.target.value)}
              placeholder="Ex. 150000"
            />
            <p className="text-xs text-muted-foreground">
              Un brouillon sera créé. Vous pourrez contrôler tous les calculs avant de le valider.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={loading} onClick={submit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Générer le brouillon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
