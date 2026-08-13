import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2 } from "lucide-react";
import { fcfa, friendlyRpcError, type EleveScolarite } from "../scolarite-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { downloadReceiptFor } from "@/lib/downloadReceipt";
import { toast } from "sonner";

interface Props {
  eleve: EleveScolarite | null;
  defaultTrancheNum?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
  ecoleId?: string | null;
}

const TYPES: { label: string; value: "remise" | "bourse" | "prise_en_charge"; hint: string }[] = [
  { label: "Remise commerciale", value: "remise", hint: "Geste commercial accordé à la famille." },
  { label: "Bourse", value: "bourse", hint: "Bourse d'études (mérite, sociale, diocésaine)." },
  { label: "Prise en charge", value: "prise_en_charge", hint: "Tiers payeur (entreprise, paroisse, ONG…)." },
];

export function DiscountDialog({ eleve, defaultTrancheNum, open, onOpenChange, onApplied, ecoleId }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const tranchesPayables = useMemo(
    () => (eleve ? eleve.tranches.filter((t) => t.statut !== "payee") : []),
    [eleve],
  );

  const [trancheNum, setTrancheNum] = useState<string>("");
  const [montant, setMontant] = useState<string>("");
  const [type, setType] = useState<"remise" | "bourse" | "prise_en_charge">("remise");
  const [motif, setMotif] = useState<string>("");

  useEffect(() => {
    if (!open || !eleve) return;
    submittingRef.current = false;
    const target =
      tranchesPayables.find((t) => t.num === defaultTrancheNum) ?? tranchesPayables[0];
    if (target) {
      setTrancheNum(String(target.num));
      setMontant(String(Math.max(0, target.montant - target.paye)));
    }
    setType("remise");
    setMotif("");
  }, [open, eleve, defaultTrancheNum, tranchesPayables]);

  if (!eleve) return null;

  const tranche = eleve.tranches.find((t) => t.num === Number(trancheNum));
  const restantTranche = tranche ? tranche.montant - tranche.paye : 0;
  const montantNum = Number(montant) || 0;
  const motifTrim = motif.trim();
  const valid = !!tranche && montantNum > 0 && montantNum <= restantTranche && motifTrim.length >= 3;

  const handleSubmit = async () => {
    if (!valid || !tranche || !ecoleId) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    try {
      const trancheId = tranche.id;
      if (!trancheId) throw new Error("Tranche sans identifiant en base");

      const { data: paiementId, error } = await supabase.rpc("appliquer_remise", {
        _ecole_id: ecoleId,
        _eleve_id: eleve.id,
        _tranche_id: trancheId,
        _montant: montantNum,
        _type_remise: type,
        _motif: motifTrim,
        _accorde_par: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Remise appliquée", {
        description: `${fcfa(montantNum)} FCFA · ${TYPES.find(t => t.value === type)?.label} · ${eleve.nom} ${eleve.prenom} (T${tranche.num})`,
      });

      if (paiementId && typeof paiementId === "string") {
        downloadReceiptFor({ ecoleId, eleveId: eleve.id, paiementId, type });
      }

      onOpenChange(false);
      onApplied?.();
    } catch (err) {
      console.error("Discount error:", err);
      toast.error("Remise refusée", { description: friendlyRpcError(err) });
      onApplied?.();
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
            <Tag className="h-5 w-5" />Appliquer une remise / bourse
          </DialogTitle>
          <DialogDescription>
            {eleve.nom} {eleve.prenom} — {eleve.classe} · Reste annuel : <span className="font-bold text-destructive">{fcfa(eleve.resteDu)} FCFA</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Tranche concernée</Label>
            <Select value={trancheNum} onValueChange={(v) => {
              setTrancheNum(v);
              const t = eleve.tranches.find((x) => x.num === Number(v));
              if (t) setMontant(String(Math.max(0, t.montant - t.paye)));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tranchesPayables.map((t) => (
                  <SelectItem key={t.num} value={String(t.num)}>
                    T{t.num} · {t.label} — reste {fcfa(t.montant - t.paye)} FCFA
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tranche && (
            <Card className="border bg-muted/30">
              <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground uppercase">Tranche</p><p className="text-xs font-bold">{fcfa(tranche.montant)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Déjà couvert</p><p className="text-xs font-bold text-primary">{fcfa(tranche.paye)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Restant</p><p className="text-xs font-bold text-destructive">{fcfa(restantTranche)}</p></div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "remise" | "bourse" | "prise_en_charge")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{TYPES.find(t => t.value === type)?.hint}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Montant accordé (FCFA)</Label>
            <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {tranche && montantNum > restantTranche && (
              <p className="text-[11px] text-destructive">Le montant dépasse le reste de la tranche.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Motif <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Ex: Bourse au mérite — moyenne annuelle ≥ 16/20 — décision conseil du 12/04/2026"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">{motifTrim.length}/500 · obligatoire (min. 3 caractères)</p>
          </div>

          {valid && (
            <Badge variant="outline" className="bg-accent/10 text-primary border-accent/30">
              Après application : {montantNum >= restantTranche ? "✓ Tranche soldée" : "◐ Tranche partielle"}
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
            Appliquer la remise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
