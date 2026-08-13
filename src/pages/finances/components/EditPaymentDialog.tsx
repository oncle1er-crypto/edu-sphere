import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fcfa, type EleveScolarite, type PaiementHistorique } from "../scolarite-data";

interface Props {
  eleve: EleveScolarite | null;
  paiement: PaiementHistorique | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const MOYENS_ENCAISSEMENT = [
  { label: "Espèces", value: "especes" },
  { label: "Wave", value: "wave" },
  { label: "Orange Money", value: "orange_money" },
  { label: "MTN MoMo", value: "mtn_money" },
  { label: "Moov Money", value: "moov_money" },
  { label: "Virement", value: "virement" },
  { label: "Chèque", value: "cheque" },
];

const MOYENS_REMISE = [
  { label: "Remise commerciale", value: "remise" },
  { label: "Bourse", value: "bourse" },
  { label: "Prise en charge", value: "prise_en_charge" },
];

export function EditPaymentDialog({ eleve, paiement, open, onOpenChange, onSaved }: Props) {
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("");
  const [reference, setReference] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !paiement) return;
    setMontant(String(paiement.montant));
    setMode(paiement.mode);
    setReference(paiement.reference ?? "");
    setMotif("");
  }, [open, paiement]);

  const tranche = useMemo(() => {
    if (!eleve || !paiement?.trancheNum) return null;
    return eleve.tranches.find((t) => t.num === paiement.trancheNum) ?? null;
  }, [eleve, paiement]);

  // Reste disponible sur la tranche si on remplaçait ce paiement.
  // Autres paiements = paye total - ce paiement
  const restePourCePaiement = useMemo(() => {
    if (!tranche || !paiement) return Infinity;
    const autres = Math.max(0, tranche.paye - paiement.montant);
    return Math.max(0, tranche.montant - autres);
  }, [tranche, paiement]);

  const montantNum = Number(montant) || 0;
  const motifOk = motif.trim().length >= 5;
  const montantOk = montantNum > 0 && montantNum <= restePourCePaiement;
  const canSave = !!paiement && motifOk && montantOk && !!mode;

  const moyens = paiement?.kind === "remise" ? MOYENS_REMISE : MOYENS_ENCAISSEMENT;

  const handleSubmit = async () => {
    if (!paiement || !canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("modifier_paiement", {
        _paiement_id: paiement.id,
        _montant: montantNum,
        _mode: mode,
        _reference: reference || null,
        _motif: motif.trim(),
      });
      if (error) throw error;
      toast.success("Paiement corrigé", {
        description: `Nouveau montant : ${fcfa(montantNum)} FCFA`,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const msg = String((err as { message?: unknown } | null)?.message ?? "");
      let friendly = "Impossible de corriger le paiement";
      if (msg.includes("not_authorized")) friendly = "Réservé aux administrateurs";
      else if (msg.includes("montant_depasse_tranche")) friendly = "Le nouveau montant dépasse le total de la tranche";
      else if (msg.includes("motif_requis")) friendly = "Le motif est obligatoire (min. 5 caractères)";
      else if (msg.includes("montant_invalide")) friendly = "Montant invalide";
      else if (msg.includes("paiement_introuvable")) friendly = "Paiement introuvable";
      toast.error(friendly, { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!paiement || !eleve) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Pencil className="h-5 w-5" /> Corriger un paiement
          </DialogTitle>
          <DialogDescription>
            {eleve.nom} {eleve.prenom} — {new Date(paiement.date).toLocaleDateString("fr-FR")}
            {paiement.trancheNum ? ` · T${paiement.trancheNum}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border border-amber-300 bg-amber-50">
            <CardContent className="p-3 flex gap-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Cette correction est <strong>tracée dans le journal d'audit</strong>.
                Renseignez un motif clair (ex. « erreur de saisie : 100 000 au lieu de 10 000 »).
              </div>
            </CardContent>
          </Card>

          {tranche && (
            <Card className="border bg-muted/30">
              <CardContent className="p-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="text-[10px] uppercase text-muted-foreground">Tranche</p><p className="font-bold">{fcfa(tranche.montant)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Ancien montant</p><p className="font-bold text-primary">{fcfa(paiement.montant)}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Max possible</p><p className="font-bold text-destructive">{fcfa(restePourCePaiement)}</p></div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Nouveau montant (FCFA)</Label>
            <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {montantNum > restePourCePaiement && (
              <p className="text-[11px] text-destructive">Le montant dépasse le total de la tranche.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {moyens.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Référence</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° reçu / transaction" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Motif de la correction <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. Erreur de saisie : le parent a payé 10 000 FCFA, pas 100 000 FCFA."
            />
            {!motifOk && motif.length > 0 && (
              <p className="text-[11px] text-destructive">Le motif doit contenir au moins 5 caractères.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Enregistrer la correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
