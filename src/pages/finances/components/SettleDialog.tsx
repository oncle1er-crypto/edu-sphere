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

/** Forme réelle du JSON renvoyé par la RPC solder_scolarite (typée `Json` côté Supabase). */
interface SolderScolariteResult {
  nb_tranches?: number;
  lignes?: { paiement_id: string }[];
}

function friendlySolde(err: unknown): string {
  const msg = String((err as { message?: unknown })?.message ?? "");
  if (msg.includes("not_authorized")) return "Non autorisé";
  if (msg.includes("rien_a_encaisser")) return "Rien à encaisser";
  if (msg.includes("montant_depasse_reste")) return "Montant supérieur au reste dû";
  if (msg.includes("montant_invalide")) return "Montant invalide";
  return friendlyRpcError(err);
}

import { envoyerRecuWhatsApp } from "@/lib/sendReceiptWhatsApp";
import { useParentContactGuard } from "@/hooks/useParentContactGuard";
import type { ContactParent } from "@/components/finances/ParentInfoRequiredDialog";

export function SettleDialog({ open, onOpenChange, ecoleId, eleve, eleves, contexteLabel, onCompleted }: Props) {
  const [moyen, setMoyen] = useState("especes");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const submittingRef = useRef(false);
  const { dialog: parentGuardDialog, verifierAvant } = useParentContactGuard();

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
    setProgress({ done: 0, total: cibles.length, current: "" });
  }, [open, cibles.length]);

  const handleSubmit = () => {
    if (!ecoleId || cibles.length === 0) return;
    // Encaissement individuel : coordonnées parent obligatoires
    if (cibles.length === 1) {
      const el = cibles[0];
      verifierAvant(
        { ecoleId, eleveId: el.id, nomEleve: `${el.nom} ${el.prenom}`.trim(), parent: el.parent, telephone: el.telephone },
        (contact) => { void executerSolde(contact); },
      );
      return;
    }
    void executerSolde(null);
  };

  const executerSolde = async (contact: ContactParent | null) => {
    if (!ecoleId || cibles.length === 0) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    let okCount = 0;
    let tranchesCount = 0;
    const errors: string[] = [];
    let processed = 0;

    try {
      for (const el of cibles) {
        setProgress({ done: processed, total: cibles.length, current: `${el.nom} ${el.prenom}` });

        const { data, error } = await supabase.rpc("solder_scolarite", {
          _ecole_id: ecoleId,
          _eleve_id: el.id,
          _montant: el.resteDu,
          _mode: moyen,
          _reference: reference || `SOLDE-${el.matricule}`,
        });
        processed++;

        if (error) {
          errors.push(`${el.nom} ${el.prenom} : ${friendlySolde(error)}`);
        } else {
          okCount++;
          const result = data as unknown as SolderScolariteResult | null;
          tranchesCount += Number(result?.nb_tranches ?? 0);

          // Envoi automatique du reçu au parent (WhatsApp, repli SMS)
          const paiementId = result?.lignes?.[0]?.paiement_id;
          const parentNom = contact?.nomComplet ?? el.parent;
          const parentTel = contact?.telephone ?? el.telephone;
          if (paiementId && parentNom && parentTel) {
            void envoyerRecuWhatsApp({
              ecoleId,
              eleveId: el.id,
              paiementId,
              type: "encaissement",
              telephone: parentTel,
              parent: parentNom,
              nomEleve: el.nom,
              prenomEleve: el.prenom,
              montant: el.resteDu,
              reference: reference || `SOLDE-${el.matricule}`,
              objet: "scolarité",
            });
          }
        }
      }
      setProgress({ done: processed, total: cibles.length, current: "" });

      if (errors.length === 0) {
        toast.success("Scolarité soldée", {
          description: `${okCount} élève(s) · ${tranchesCount} tranche(s) encaissée(s) · ${contexteLabel ?? ""}`.trim(),
        });
      } else {
        toast.warning(`Soldé partiellement (${okCount} OK / ${errors.length} erreur(s))`, {
          description: errors.slice(0, 3).join(" · "),
        });
      }

      onCompleted?.();
      if (errors.length === 0) onOpenChange(false);
    } catch (err) {
      toast.error("Échec du solde", { description: friendlySolde(err) });
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
    <>
    {parentGuardDialog}
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
            <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-center">
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
                {progress.done}/{progress.total} élève(s) · {progress.current || "…"}
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
    </>
  );
}
