import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  NIVEAU_LABELS, MOIS_LABELS,
  type GrilleLigne, type NiveauCode, type Variant, type TrancheGrille,
} from "@/hooks/useGrilleTarifs";
import { fcfa } from "../scolarite-data";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: GrilleLigne | null;
  existingCodes: Array<{ niveau_code: NiveauCode; variant: Variant }>;
  onSave: (data: {
    id?: string;
    niveau_code: NiveauCode;
    variant: Variant;
    libelle: string;
    tranches: TrancheGrille[];
  }) => void;
  saving?: boolean;
}

const DEFAULT_TRANCHE: TrancheGrille = { numero: 1, label: "Octobre", mois: 10, jour: 15, montant: 0 };

export default function GrilleTarifEditor({
  open, onOpenChange, initial, existingCodes, onSave, saving,
}: Props) {
  const [niveau, setNiveau] = useState<NiveauCode>("CP");
  const [variant, setVariant] = useState<Variant>(null);
  const [libelle, setLibelle] = useState("");
  const [tranches, setTranches] = useState<TrancheGrille[]>([{ ...DEFAULT_TRANCHE }]);

  useEffect(() => {
    if (open) {
      if (initial) {
        setNiveau(initial.niveau_code);
        setVariant(initial.variant);
        setLibelle(initial.libelle);
        setTranches(initial.tranches.length ? initial.tranches : [{ ...DEFAULT_TRANCHE }]);
      } else {
        setNiveau("CP"); setVariant(null); setLibelle(""); setTranches([{ ...DEFAULT_TRANCHE }]);
      }
    }
  }, [open, initial]);

  // Auto-suggest libelle
  useEffect(() => {
    if (!initial && open) {
      const v = variant ? ` — ${variant === "ancien" ? "Ancien" : "Nouveau"}` : "";
      setLibelle(`${NIVEAU_LABELS[niveau]}${v}`);
    }
  }, [niveau, variant, initial, open]);

  const total = tranches.reduce((s, t) => s + (Number(t.montant) || 0), 0);

  const updateTranche = (i: number, patch: Partial<TrancheGrille>) =>
    setTranches((arr) => arr.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const addTranche = () =>
    setTranches((arr) => [
      ...arr,
      { numero: arr.length + 1, label: "", mois: 11, jour: 15, montant: 0 },
    ]);
  const removeTranche = (i: number) =>
    setTranches((arr) => arr.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, numero: idx + 1 })));

  const conflict = !initial && existingCodes.some(
    (c) => c.niveau_code === niveau && c.variant === variant,
  );

  const canSave = !!libelle.trim() && tranches.length > 0 && !conflict && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          <DialogDescription>
            Définissez le niveau, les tranches et leur date d'échéance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Niveau</Label>
              <Select value={niveau} onValueChange={(v) => setNiveau(v as NiveauCode)} disabled={!!initial}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEAU_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Variante {niveau !== "GS" && <span className="text-xs text-muted-foreground">(GS uniquement)</span>}</Label>
              <Select
                value={variant ?? "none"}
                onValueChange={(v) => setVariant(v === "none" ? null : (v as Variant))}
                disabled={niveau !== "GS" || !!initial}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="ancien">Ancien élève</SelectItem>
                  <SelectItem value="nouveau">Nouvel élève</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Libellé</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>

          {conflict && (
            <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 p-2 rounded">
              Un tarif existe déjà pour cette combinaison niveau/variante.
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tranches</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTranche}>
                <Plus className="h-3.5 w-3.5" />Ajouter une tranche
              </Button>
            </div>

            <div className="space-y-2">
              {tranches.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2 bg-muted/30">
                  <div className="col-span-1 text-center text-sm font-bold pt-2">#{i + 1}</div>
                  <div className="col-span-3">
                    <Label className="text-xs">Libellé</Label>
                    <Input
                      value={t.label}
                      onChange={(e) => updateTranche(i, { label: e.target.value })}
                      placeholder="Octobre"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Mois</Label>
                    <Select value={String(t.mois)} onValueChange={(v) => updateTranche(i, { mois: Number(v) })}>
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
                    <Input
                      type="number" min={1} max={31}
                      value={t.jour}
                      onChange={(e) => updateTranche(i, { jour: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Montant (FCFA)</Label>
                    <Input
                      type="number" min={0}
                      value={t.montant}
                      onChange={(e) => updateTranche(i, { montant: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => removeTranche(i)}
                      disabled={tranches.length <= 1}
                    >
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
            onClick={() => onSave({
              id: initial?.id,
              niveau_code: niveau,
              variant,
              libelle: libelle.trim(),
              tranches,
            })}
            disabled={!canSave}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
