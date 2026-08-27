import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { GrilleService, TrancheService, Periodicite } from "@/hooks/useGrilleServices";
import { MOIS_LABELS } from "@/hooks/useGrilleTarifs";
import { fcfa } from "../scolarite-data";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: GrilleService | null;
  onSave: (data: {
    id?: string;
    libelle: string;
    periodicite: Periodicite;
    tranches: TrancheService[];
    jours_alerte_renouvellement: number;
  }) => void;
  saving?: boolean;
}

const DEFAULT_TRANCHES_TRIM: TrancheService[] = [
  { numero: 1, label: "1er Trimestre", mois: 10, jour: 15, montant: 0 },
  { numero: 2, label: "2e Trimestre", mois: 1, jour: 15, montant: 0 },
  { numero: 3, label: "3e Trimestre", mois: 4, jour: 15, montant: 0 },
];

const DEFAULT_TRANCHES_MENS: TrancheService[] = Array.from({ length: 9 }, (_, i) => {
  const mois = ((9 + i) % 12) + 1;
  return { numero: i + 1, label: MOIS_LABELS[mois], mois, jour: 5, montant: 0 };
});

export default function GrilleServiceEditor({ open, onOpenChange, initial, onSave, saving }: Props) {
  const [libelle, setLibelle] = useState("");
  const [periodicite, setPeriodicite] = useState<Periodicite>("trimestriel");
  const [tranches, setTranches] = useState<TrancheService[]>(DEFAULT_TRANCHES_TRIM);
  const [joursAlerte, setJoursAlerte] = useState(7);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setLibelle(initial.libelle);
      setPeriodicite(initial.periodicite);
      setTranches(initial.tranches?.length ? initial.tranches : DEFAULT_TRANCHES_TRIM);
      setJoursAlerte(initial.jours_alerte_renouvellement ?? 7);
    } else {
      setLibelle("");
      setPeriodicite("trimestriel");
      setTranches(DEFAULT_TRANCHES_TRIM);
      setJoursAlerte(7);
    }
  }, [open, initial]);

  const changePeriodicite = (v: Periodicite) => {
    setPeriodicite(v);
    if (!initial) setTranches(v === "mensuel" ? DEFAULT_TRANCHES_MENS : DEFAULT_TRANCHES_TRIM);
  };

  const total = tranches.reduce((s, t) => s + (Number(t.montant) || 0), 0);
  const updateT = (i: number, patch: Partial<TrancheService>) =>
    setTranches((arr) => arr.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addT = () =>
    setTranches((arr) => [...arr, { numero: arr.length + 1, label: "", mois: 1, jour: 15, montant: 0 }]);
  const removeT = (i: number) =>
    setTranches((arr) => arr.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, numero: idx + 1 })));

  const canSave = libelle.trim().length > 0 && tranches.length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          <DialogDescription>
            Définissez les échéances de paiement. Une tranche payée reste valide jusqu'à l'échéance suivante ; la dernière reste valide jusqu'à la fin de l'année scolaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Libellé</Label>
              <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Cantine Maternelle" />
            </div>
            <div>
              <Label>Périodicité</Label>
              <Select value={periodicite} onValueChange={(v) => changePeriodicite(v as Periodicite)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trimestriel">Trimestriel (3 échéances)</SelectItem>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-w-xs">
            <Label>Délai d'alerte avant expiration</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={30} value={joursAlerte}
                onChange={(e) => setJoursAlerte(Math.min(30, Math.max(1, Number(e.target.value) || 7)))} />
              <span className="text-sm text-muted-foreground whitespace-nowrap">jour(s) avant</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">L'utilisateur sera averti avant la fin de la période déjà payée.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Échéances de paiement</Label>
              <Button type="button" variant="outline" size="sm" onClick={addT}>
                <Plus className="h-3.5 w-3.5" />Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {tranches.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2 bg-muted/30">
                  <div className="col-span-1 text-center text-sm font-bold pt-2">#{i + 1}</div>
                  <div className="col-span-3">
                    <Label className="text-xs">Libellé</Label>
                    <Input value={t.label} onChange={(e) => updateT(i, { label: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Mois</Label>
                    <Select value={String(t.mois)} onValueChange={(v) => updateT(i, { mois: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOIS_LABELS.slice(1).map((m, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Jour</Label>
                    <Input type="number" min={1} max={31} value={t.jour}
                      onChange={(e) => updateT(i, { jour: Number(e.target.value) || 1 })} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Montant (FCFA)</Label>
                    <Input type="number" min={0} value={t.montant}
                      onChange={(e) => updateT(i, { montant: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeT(i)} disabled={tranches.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end pt-1 text-sm">
              <span className="text-muted-foreground mr-2">Total :</span>
              <span className="font-bold text-primary text-base tabular-nums">{fcfa(total)} F</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!canSave}
            onClick={() => onSave({
              id: initial?.id,
              libelle: libelle.trim(),
              periodicite,
              tranches,
              jours_alerte_renouvellement: joursAlerte,
            })}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
