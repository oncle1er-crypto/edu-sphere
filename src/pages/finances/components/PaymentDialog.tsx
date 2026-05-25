import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Loader2 } from "lucide-react";
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
  onPaymentRecorded?: () => void;
  ecoleId?: string | null;
}

const MOYENS: { label: string; value: string }[] = [
  { label: "Espèces", value: "especes" },
  { label: "Wave", value: "wave" },
  { label: "Orange Money", value: "orange_money" },
  { label: "MTN MoMo", value: "mtn_money" },
  { label: "Moov Money", value: "moov_money" },
  { label: "Virement", value: "virement" },
  { label: "Chèque", value: "cheque" },
];

export function PaymentDialog({ eleve, defaultTrancheNum, open, onOpenChange, onPaymentRecorded, ecoleId }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const tranchesPayables = useMemo(() => {
    if (!eleve) return [];
    // Seule la 1ère tranche non soldée est encaissable (séquentiel)
    const sorted = [...eleve.tranches].sort((a, b) => a.num - b.num);
    const next = sorted.find((t) => t.statut !== "payee");
    return next ? [next] : [];
  }, [eleve]);

  const [trancheNum, setTrancheNum] = useState<string>("");
  const [montant, setMontant] = useState<string>("");
  const [moyen, setMoyen] = useState<string>("wave");
  const [reference, setReference] = useState<string>("");

  useEffect(() => {
    if (!open || !eleve) return;
    submittingRef.current = false;
    const target =
      tranchesPayables.find((t) => t.num === defaultTrancheNum) ?? tranchesPayables[0];
    if (target) {
      setTrancheNum(String(target.num));
      setMontant(String(Math.max(0, target.montant - target.paye)));
    }
    setMoyen("wave");
    setReference("");
  }, [open, eleve, defaultTrancheNum, tranchesPayables]);

  if (!eleve) return null;

  const tranche = eleve.tranches.find((t) => t.num === Number(trancheNum));
  const restantTranche = tranche ? tranche.montant - tranche.paye : 0;
  const montantNum = Number(montant) || 0;
  const valid = !!tranche && montantNum > 0 && montantNum <= restantTranche;

  const handleSubmit = async () => {
    if (!valid || !tranche || !ecoleId) return;
    if (submittingRef.current) return; // anti double-clic infaillible
    submittingRef.current = true;
    setSaving(true);

    try {
      const trancheId = (tranche as any).id;
      if (!trancheId) throw new Error("Tranche sans identifiant en base");

      const { data: paiementId, error } = await supabase.rpc("enregistrer_paiement", {
        _ecole_id: ecoleId,
        _eleve_id: eleve.id,
        _tranche_id: trancheId,
        _montant: montantNum,
        _mode: moyen,
        _reference: reference || null,
        _recu_par: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Encaissement enregistré", {
        description: `${fcfa(montantNum)} FCFA · ${MOYENS.find(m => m.value === moyen)?.label} · ${eleve.prenom} ${eleve.nom} (T${tranche.num})`,
      });

      // Génère + télécharge automatiquement le reçu PDF
      if (paiementId && typeof paiementId === "string") {
        downloadReceiptFor({ ecoleId, eleveId: eleve.id, paiementId, type: "encaissement" });
      }

      onOpenChange(false);
      onPaymentRecorded?.();
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Encaissement refusé", { description: friendlyRpcError(err) });
      onPaymentRecorded?.();
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
            <Wallet className="h-5 w-5" />Enregistrer un encaissement
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
              <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground uppercase">Tranche</p><p className="text-xs font-bold">{fcfa(tranche.montant)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Déjà versé</p><p className="text-xs font-bold text-primary">{fcfa(tranche.paye)}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Restant</p><p className="text-xs font-bold text-destructive">{fcfa(restantTranche)}</p></div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Montant encaissé (FCFA)</Label>
            <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {tranche && montantNum > restantTranche && (
              <p className="text-[11px] text-destructive">Le montant dépasse le reste de la tranche.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Moyen de paiement</Label>
              <Select value={moyen} onValueChange={setMoyen}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOYENS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Référence</Label>
              <Input placeholder="N° reçu / transaction" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          {tranche && montantNum > 0 && montantNum <= restantTranche && (
            <Badge variant="outline" className="bg-accent/10 text-primary border-accent/30">
              Statut après paiement : {montantNum >= restantTranche ? "✓ Payée" : "◐ Partielle"}
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Enregistrer l'encaissement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
