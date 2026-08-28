import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Loader2, ArrowRight } from "lucide-react";
import { fcfa, friendlyRpcError, type EleveScolarite } from "../scolarite-data";
import { supabase } from "@/integrations/supabase/client";
import { downloadReceiptOperationFor } from "@/lib/downloadReceipt";
import { initialPaymentAmount } from "@/lib/receiptOperation";

import { sendPaymentConfirmationSms } from "@/lib/sendPaymentSms";
import { envoyerRecuWhatsApp } from "@/lib/sendReceiptWhatsApp";
import { useParentContactGuard } from "@/hooks/useParentContactGuard";
import type { ContactParent } from "@/components/finances/ParentInfoRequiredDialog";
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

interface LigneVentilation {
  trancheId?: string;
  num: number;
  label: string;
  montant: number;
  resteApres: number;
}

export function PaymentDialog({ eleve, defaultTrancheNum, open, onOpenChange, onPaymentRecorded, ecoleId }: Props) {
  const [saving, setSaving] = useState(false);
  const { dialog: parentGuardDialog, verifierAvant } = useParentContactGuard();
  const submittingRef = useRef(false);

  const [montant, setMontant] = useState<string>("");
  const [moyen, setMoyen] = useState<string>("wave");
  const [reference, setReference] = useState<string>("");

  useEffect(() => {
    if (!open || !eleve) return;
    submittingRef.current = false;
    setMontant(String(initialPaymentAmount(eleve.tranches, defaultTrancheNum, eleve.resteDu)));
    setMoyen("wave");
    setReference("");
  }, [open, eleve, defaultTrancheNum]);

  const montantNum = Number(montant) || 0;
  const resteDu = eleve?.resteDu ?? 0;

  /** Aperçu de la ventilation : tranches non soldées, par numéro croissant. */
  const ventilation = useMemo<LigneVentilation[]>(() => {
    if (!eleve || montantNum <= 0) return [];
    let restant = Math.min(montantNum, resteDu);
    const lignes: LigneVentilation[] = [];
    const tranches = [...eleve.tranches].sort((a, b) => a.num - b.num);
    for (const t of tranches) {
      if (restant <= 0) break;
      const du = Math.max(0, t.montant - t.paye);
      if (du <= 0) continue;
      const affecte = Math.min(du, restant);
      restant -= affecte;
      lignes.push({
        trancheId: t.id,
        num: t.num,
        label: t.label,
        montant: affecte,
        resteApres: du - affecte,
      });
    }
    return lignes;
  }, [eleve, montantNum, resteDu]);

  if (!eleve) return null;

  const valid = montantNum > 0 && montantNum <= resteDu && !!ecoleId;

  const handleSubmit = () => {
    if (!valid || !ecoleId || !eleve) return;
    verifierAvant(
      { ecoleId, eleveId: eleve.id, nomEleve: `${eleve.nom} ${eleve.prenom}`.trim(), parent: eleve.parent, telephone: eleve.telephone },
      (contact) => { void executerPaiement(contact); },
    );
  };

  const executerPaiement = async (contact: ContactParent) => {
    if (!valid || !ecoleId) return;
    if (submittingRef.current) return; // anti double-clic infaillible
    submittingRef.current = true;
    setSaving(true);

    try {
      const { data, error } = await supabase.rpc("solder_scolarite", {
        _ecole_id: ecoleId,
        _eleve_id: eleve.id,
        _montant: montantNum,
        _mode: moyen,
        _reference: reference || undefined,
      });
      if (error) throw error;

      const res = (data ?? {}) as {
        reference?: string;
        montant_total?: number;
        nb_tranches?: number;
        reste_du_apres?: number;
        ventilation?: { paiement_id: string; tranche_id: string; tranche_numero: number; tranche_label: string; montant: number }[];
      };
      const ref = res.reference ?? reference ?? null;
      const lignes = res.ventilation ?? [];
      const resteApres = Number(res.reste_du_apres ?? Math.max(0, resteDu - montantNum));

      toast.success("Encaissement enregistré", {
        description: `${fcfa(montantNum)} FCFA · ${MOYENS.find((m) => m.value === moyen)?.label} · ${eleve.nom} ${eleve.prenom}` +
          (lignes.length > 1 ? ` (${lignes.length} tranches)` : ""),
      });

      // Un reçu de l'opération : une seule ligne si une tranche est concernée,
      // ou un reçu global détaillé si l'encaissement couvre plusieurs tranches.
      const paiementIds = lignes.map((ligne) => ligne.paiement_id);
      if (paiementIds.length > 0) {
        const receiptDownloaded = await downloadReceiptOperationFor({
          ecoleId,
          eleveId: eleve.id,
          paiementIds,
          type: "encaissement",
        });
        if (!receiptDownloaded) {
          toast.warning("Paiement enregistré, mais reçu non téléchargé", {
            description: "Le reçu reste disponible dans l'historique des paiements.",
          });
        }
      }

      // SMS de confirmation au parent (best-effort)
      sendPaymentConfirmationSms({
        ecoleId,
        telephone: eleve.telephone,
        parent: eleve.parent,
        nomEleve: eleve.nom,
        prenomEleve: eleve.prenom,
        classe: eleve.classe,
        module: "scolarite",
        montant: montantNum,
        resteDu: resteApres,
        reference: ref,
      }).then((ok) => {
        if (ok) toast.success("SMS de confirmation envoyé au parent");
      });

      // Envoi automatique du reçu au parent par WhatsApp (repli SMS)
      const premierPaiementId = lignes[0]?.paiement_id;
      if (premierPaiementId) {
        envoyerRecuWhatsApp({
          ecoleId,
          eleveId: eleve.id,
          paiementId: premierPaiementId,
          paiementIds,
          type: "encaissement",
          telephone: contact.telephone,
          parent: contact.nomComplet,
          nomEleve: eleve.nom,
          prenomEleve: eleve.prenom,
          montant: montantNum,
          reference: ref,
          objet: "scolarité",
        }).then((r) => {
          if (r.ok) {
            toast.success(
              r.canal === "sms" ? "Reçu envoyé au parent par SMS" : "Reçu envoyé au parent par WhatsApp",
            );
          } else if (r.detail) {
            toast.warning("Reçu non envoyé au parent", { description: r.detail });
          }
        });
      }


      onOpenChange(false);
      onPaymentRecorded?.();
    } catch (err) {
      console.error("Payment error:", err);
      const msg = String((err as { message?: unknown } | null)?.message ?? "");
      let friendly = friendlyRpcError(err);
      if (msg.includes("not_authorized")) friendly = "Vous n'êtes pas autorisé à encaisser";
      else if (msg.includes("rien_a_encaisser")) friendly = "Aucune tranche à encaisser pour cet élève";
      else if (msg.includes("montant_depasse_reste")) friendly = "Le montant dépasse le reste dû annuel";
      else if (msg.includes("montant_invalide")) friendly = "Montant invalide";
      toast.error("Encaissement refusé", { description: friendly });
      onPaymentRecorded?.();
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
    {parentGuardDialog}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" />Enregistrer un encaissement
          </DialogTitle>
          <DialogDescription>
            {eleve.nom} {eleve.prenom} — {eleve.classe} · Reste annuel : <span className="font-bold text-destructive">{fcfa(resteDu)} FCFA</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Montant encaissé (FCFA)</Label>
            <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {montantNum > resteDu && (
              <p className="text-[11px] text-destructive">Le montant dépasse le reste dû annuel ({fcfa(resteDu)} FCFA).</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Le montant est ventilé automatiquement sur les tranches non soldées, par ordre croissant.
            </p>
          </div>

          {ventilation.length > 0 && montantNum <= resteDu && (
            <Card className="border bg-muted/30">
              <CardContent className="p-3 space-y-1.5">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Aperçu de la ventilation</p>
                {ventilation.map((l) => (
                  <div key={l.num} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-primary">T{l.num}</span>
                    <span className="text-muted-foreground truncate">· {l.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-semibold ml-auto shrink-0">{fcfa(l.montant)} FCFA</span>
                    <span className={l.resteApres === 0 ? "text-green-700 shrink-0" : "text-orange-600 shrink-0"}>
                      ({l.resteApres === 0 ? "soldée" : `reste ${fcfa(l.resteApres)}`})
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
    </>
  );
}
