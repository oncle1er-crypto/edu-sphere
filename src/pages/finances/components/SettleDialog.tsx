import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { fcfa, friendlyRpcError, type EleveScolarite } from "../scolarite-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ecoleId?: string | null;
  /** Solde un seul élève */
  eleve?: EleveScolarite | null;
  /** Solde un ensemble d'élèves (ex: une classe entière) */
  eleves?: EleveScolarite[];
  /** Libellé du contexte (ex: "Classe CM2 A") */
  contexteLabel?: string;
  onCompleted?: () => void;
}

const MOYENS = [
  { label: "Espèces", value: "especes" },
  { label: "Wave", value: "wave" },
  { label: "Orange Money", value: "orange_money" },
  { label: "MTN MoMo", value: "mtn_money" },
  { label: "Moov Money", value: "moov_money" },
  { label: "Virement", value: "virement" },
  { label: "Chèque", value: "cheque" },
];

export function SettleDialog({ open, onOpenChange, ecoleId, eleve, eleves, contexteLabel, onCompleted }: Props) {
  const { user } = useAuth();
  const [moyen, setMoyen] = useState("especes");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const submittingRef = useRef(false);

  const cibles = useMemo<EleveScolarite[]>(() => {
    if (eleves && eleves.length > 0) return eleves.filter((e) => e.resteDu > 0);
    if (eleve && eleve.resteDu > 0) return [eleve];
    return [];
  }, [eleve, eleves]);

  const totalReste = useMemo(() => cibles.reduce((s, e) => s + e.resteDu, 0), [cibles]);
  const totalTranches = useMemo(
    () => cibles.reduce((s, e) => s + e.tranches.filter((t) => t.statut !== "payee").length, 0),
    [cibles],
  );

  useEffect(() => {
    if (!open) return;
    submittingRef.current = false;
    setMoyen("especes");
    setReference("");
    setProgress({ done: 0, total: totalTranches, current: "" });
  }, [open, totalTranches]);

  const handleSubmit = async () => {
    if (!ecoleId || cibles.length === 0) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    let okCount = 0;
    const errors: string[] = [];
    let processed = 0;

    try {
      for (const el of cibles) {
        const tranchesAPayer = [...el.tranches]
          .filter((t) => t.statut !== "payee")
          .sort((a, b) => a.num - b.num);

        for (const t of tranchesAPayer) {
          const trancheId = (t as any).id;
          const restant = Math.max(0, t.montant - t.paye);
          if (!trancheId || restant <= 0) {
            processed++;
            continue;
          }
          setProgress({ done: processed, total: totalTranches, current: `${el.nom} ${el.prenom} · T${t.num}` });

          const { error } = await supabase.rpc("enregistrer_paiement", {
            _ecole_id: ecoleId,
            _eleve_id: el.id,
            _tranche_id: trancheId,
            _montant: restant,
            _mode: moyen,
            _reference: reference || `SOLDE-${el.matricule}-T${t.num}`,
            _recu_par: user?.id ?? null,
          });
          processed++;
          if (error) {
            errors.push(`${el.nom} ${el.prenom} (T${t.num}) : ${friendlyRpcError(error)}`);
            break; // tranches suivantes bloquées par séquentiel
          } else {
            okCount++;
          }
        }
      }
      setProgress({ done: processed, total: totalTranches, current: "" });

      if (errors.length === 0) {
        toast.success("Scolarité soldée", {
          description: `${okCount} tranche(s) encaissée(s) · ${contexteLabel ?? `${cibles.length} élève(s)`}`,
        });
      } else {
        toast.warning(`Soldé partiellement (${okCount} OK / ${errors.length} erreur(s))`, {
          description: errors.slice(0, 3).join(" · "),
        });
      }

      onCompleted?.();
      if (errors.length === 0) onOpenChange(false);
    } catch (err: any) {
      toast.error("Échec du solde", { description: friendlyRpcError(err) });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  if (cibles.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" /> Rien à solder
            </DialogTitle>
            <DialogDescription>
              {contexteLabel ?? "Cet élève"} n'a aucune tranche restant à payer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" /> Solder entièrement la scolarité
          </DialogTitle>
          <DialogDescription>
            {contexteLabel ?? `${cibles.length} élève(s)`} · {totalTranches} tranche(s) à solder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border bg-muted/30">
            <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-muted-foreground uppercase">Élèves</p><p className="text-xs font-bold">{cibles.length}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Tranches</p><p className="text-xs font-bold">{totalTranches}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-xs font-bold text-destructive">{fcfa(totalReste)}</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Moyen de paiement</Label>
              <Select value={moyen} onValueChange={setMoyen} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOYENS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Référence (facultative)</Label>
              <Input placeholder="Bordereau / N° lot" value={reference} onChange={(e) => setReference(e.target.value)} disabled={saving} />
            </div>
          </div>

          {saving && (
            <div className="space-y-2">
              <Progress value={pct} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-center">
                {progress.done}/{progress.total} tranche(s) · {progress.current || "…"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Solder {fcfa(totalReste)} FCFA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
