import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, MessageSquare, Plus, Calendar, History, Bell, Tag, Receipt, Download, Printer, Loader2, Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { fcfa, type EleveScolarite, type Tranche, type PaiementHistorique } from "../scolarite-data";
import VentilationScolariteCard from "./VentilationScolariteCard";

import { downloadReceiptFor, shareReceiptWhatsApp } from "@/lib/downloadReceipt";
import { downloadGlobalReceipt } from "@/lib/downloadGlobalReceipt";
import { useRelances, formatRelanceDate } from "@/hooks/useRelances";
import { PaymentDialog } from "./PaymentDialog";
import { DiscountDialog } from "./DiscountDialog";
import { EditPaymentDialog } from "./EditPaymentDialog";
import { CancelPaymentDialog, type CancelPaymentTarget } from "./CancelPaymentDialog";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ConfirmButton";
import { pickTrancheCible, renderTemplate, getTemplate } from "../sms-templates-store";
import { CustomFeeOverride } from "./CustomFeeOverride";
import { HelpTooltip } from "@/components/help";
import { usePermissions } from "@/hooks/usePermissions";
import { messageErreurBase } from "@/lib/dbErrorMessages";


interface Props {
  eleve: EleveScolarite | null;
  openTrancheNum?: number;
  onOpenChange: (open: boolean) => void;
  ecoleId?: string | null;
  onPaymentRecorded?: () => void;
  refetching?: boolean;
}

function buildSmsRelance(e: EleveScolarite): string {
  const { key, tranche } = pickTrancheCible(e);
  return renderTemplate(getTemplate(key).message, e, tranche);
}

const STATUT_BADGE: Record<Tranche["statut"], string> = {
  payee: "bg-green-500/15 text-green-700 border-green-500/30",
  partielle: "bg-yellow-400/20 text-yellow-700 border-yellow-500/40",
  retard: "bg-destructive/15 text-destructive border-destructive/30",
  due: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUT_LABEL: Record<Tranche["statut"], string> = {
  payee: "✓ Soldée",
  partielle: "◐ Partielle",
  retard: "⚠ Non soldée",
  due: "Non soldée",
};

export function StudentDetailDrawer({ eleve, openTrancheNum, onOpenChange, ecoleId, onPaymentRecorded, refetching }: Props) {

  const { relances, fetchRelances, addRelance } = useRelances(eleve?.id);
  const { isAdmin } = usePermissions();
  const trancheRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [payTrancheNum, setPayTrancheNum] = useState<number | undefined>(undefined);
  const [payOpen, setPayOpen] = useState(false);
  const [discountTrancheNum, setDiscountTrancheNum] = useState<number | undefined>(undefined);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [editPaiement, setEditPaiement] = useState<PaiementHistorique | null>(null);
  const [cancelPaiement, setCancelPaiement] = useState<CancelPaymentTarget | null>(null);

  useEffect(() => {
    if (eleve) {
      fetchRelances();
      // Refetch données finance à chaque ouverture pour éviter d'afficher un état périmé
      // (paiement effectué depuis un autre module non encore reflété).
      onPaymentRecorded?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleve?.id]);

  useEffect(() => {
    if (eleve && openTrancheNum) {
      const t = setTimeout(() => {
        const el = trancheRefs.current[openTrancheNum];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [eleve, openTrancheNum]);

  const handleSendSms = async () => {
    if (!eleve) return;
    const result = await addRelance({
      eleveId: eleve.id,
      canal: "SMS",
      message: buildSmsRelance(eleve),
      destinataire: eleve.telephone,
    });
    if (result) toast.success(`SMS envoyé à ${eleve.parent}`, { description: eleve.telephone });
  };

  const handleSendEmail = async () => {
    if (!eleve) return;
    await addRelance({
      eleveId: eleve.id,
      canal: "Email",
      message: `Relance scolarité - reste dû ${fcfa(eleve.resteDu)} FCFA`,
      destinataire: eleve.parent,
    });
    toast.success(`Email envoyé à ${eleve.parent}`);
  };

  const handleLogCall = async () => {
    if (!eleve) return;
    await addRelance({
      eleveId: eleve.id,
      canal: "Appel",
      message: `Appel téléphonique de relance.`,
      destinataire: eleve.telephone,
    });
    toast.success(`Appel enregistré dans l'historique`);
  };

  const enRetard = !!eleve && eleve.tranches.some((t) => t.statut === "retard");

  const canalLabel = (type: string) => {
    if (type === "sms") return "SMS";
    if (type === "email") return "Email";
    return "Appel";
  };

  return (
    <>
      <Sheet open={!!eleve} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {eleve && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <SheetTitle className="text-primary flex items-center gap-2">
                      <span>{eleve.nom} {eleve.prenom}</span>
                      {refetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Actualisation en cours" />}
                    </SheetTitle>
                    <SheetDescription>
                      {eleve.classe} · {eleve.cycle} · <span className="font-mono">{eleve.matricule}</span>
                    </SheetDescription>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {((eleve.paiements?.length ?? 0) > 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        title="Réimprimer uniquement le premier versement, avec sa date et ses cumuls d'origine"
                        onClick={async () => {
                          if (!ecoleId) return;
                          const encaissements = (eleve.paiements ?? []).filter((p) => p.kind === "encaissement");
                          if (encaissements.length === 0) {
                            toast.error("Aucun paiement d'inscription à réimprimer");
                            return;
                          }
                          const premier = [...encaissements].sort((a, b) => a.date.localeCompare(b.date))[0];
                          try {
                            await downloadReceiptFor({
                              ecoleId,
                              eleveId: eleve.id,
                              paiementId: premier.id,
                              type: "encaissement",
                            });
                            toast.success("Duplicata du premier versement généré");
                          } catch (err) {
                            console.error(err);
                            toast.error("Impossible de générer le reçu", { description: messageErreurBase(err) });
                          }
                        }}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Reçu du 1er versement
                      </Button>
                    )}
                    {((eleve.paiements?.length ?? 0) > 0 || (eleve.totalPaye ?? 0) > 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        title="Imprimer un reçu récapitulatif de tous les versements"
                        onClick={async () => {
                          if (!ecoleId) return;
                          try {
                            await downloadGlobalReceipt({ ecoleId, eleve });
                          } catch (err) {
                            console.error(err);
                            toast.error("Impossible de générer le reçu global");
                          }
                        }}
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1" />
                        Reçu global
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact + actions de relance 1-clic */}
                <Card className="border">
                  <CardContent className="p-4">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Parent / Tuteur</p>
                    <p className="font-semibold">{eleve.parent}</p>
                    <p className="text-sm text-muted-foreground">{eleve.telephone}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        confirmTitle="Enregistrer l'appel ?"
                        confirmDescription={`Consigner un appel de relance vers ${eleve.parent} (${eleve.telephone}) dans l'historique ?`}
                        confirmLabel="Enregistrer"
                        onConfirm={handleLogCall}
                      >
                        <Phone className="h-4 w-4" />Appeler
                      </ConfirmButton>
                      <ConfirmButton
                        size="sm"
                        className={enRetard ? "bg-primary hover:bg-primary/90" : ""}
                        variant={enRetard ? "default" : "outline"}
                        confirmTitle="Envoyer le SMS de relance ?"
                        confirmDescription={`Un SMS pré-rédigé sera envoyé à ${eleve.parent} (${eleve.telephone}).`}
                        confirmLabel="Envoyer"
                        onConfirm={handleSendSms}
                      >
                        <MessageSquare className="h-4 w-4" />SMS
                      </ConfirmButton>
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        confirmTitle="Envoyer l'email de relance ?"
                        confirmDescription={`Un email de relance sera envoyé à ${eleve.parent}.`}
                        confirmLabel="Envoyer"
                        onConfirm={handleSendEmail}
                      >
                        <Mail className="h-4 w-4" />Email
                      </ConfirmButton>
                    </div>
                    {enRetard && (
                      <p className="text-[11px] text-muted-foreground mt-2 italic">
                        💡 Cliquer sur SMS envoie immédiatement le message pré-rédigé de relance.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Synthèse */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Card className="border"><CardContent className="p-3">
                    <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground uppercase">Total</p><HelpTooltip text="Frais annuels dus selon la grille tarifaire appliquée à cet élève." /></div>
                    <p className="text-sm font-bold text-foreground">{fcfa(eleve.fraisAnnuel)}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3">
                    <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground uppercase">Couvert</p><HelpTooltip text="Part du total prise en charge : versements en caisse + remises / bourses." /></div>
                    <p className="text-sm font-bold text-success">{fcfa(eleve.totalPaye)}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3">
                    <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground uppercase">dont Encaissé</p><HelpTooltip text="Sommes réellement reçues en caisse (hors remises et bourses)." /></div>
                    <p className="text-sm font-bold text-primary">{fcfa(eleve.totalEncaisse ?? 0)}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3">
                    <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground uppercase">dont Remises</p><HelpTooltip text="Réductions accordées : remises commerciales, bourses ou prise en charge externe." /></div>
                    <p className="text-sm font-bold text-orange-600">{fcfa(eleve.totalRemises ?? 0)}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3">
                    <div className="flex items-center gap-1"><p className="text-[10px] text-muted-foreground uppercase">Reste</p><HelpTooltip text="Montant qu'il reste à payer par la famille (Total − Couvert)." /></div>
                    <p className="text-sm font-bold text-destructive">{fcfa(eleve.resteDu)}</p>
                  </CardContent></Card>
                </div>

                {/* Ventilation par poste (inscription → scolarité → annexes) */}
                <VentilationScolariteCard total={eleve.fraisAnnuel} couvert={eleve.totalPaye} />



                {/* Historique des paiements & remises */}
                {eleve.paiements && eleve.paiements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      Paiements & remises
                      <Badge variant="secondary" className="ml-1">{eleve.paiements.length}</Badge>
                    </h4>
                    <div className="border rounded-lg divide-y">
                      {eleve.paiements.map((p) => {
                        const isCancelled = !!p.annuleLe;
                        return (
                        <div
                          key={p.id}
                          className={cn("p-3 flex items-start gap-3", isCancelled && "bg-muted/40 opacity-70")}
                          title={isCancelled ? `Annulé le ${new Date(p.annuleLe!).toLocaleDateString("fr-FR")}${p.motifAnnulation ? ` — ${p.motifAnnulation}` : ""}` : undefined}
                        >
                          <div className={cn(
                            "h-9 w-9 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0",
                            isCancelled ? "bg-muted text-muted-foreground"
                              : p.kind === "remise" ? "bg-orange-500/15 text-orange-600" : "bg-green-500/15 text-green-700",
                          )}>
                            {p.kind === "remise" ? <Tag className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("text-xs font-bold", isCancelled && "line-through text-muted-foreground")}>
                                {p.modeLabel}
                                {p.trancheNum && <span className="text-muted-foreground font-normal"> · T{p.trancheNum}</span>}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                {isCancelled && (
                                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[9px]">ANNULÉ</Badge>
                                )}
                                <p className={cn(
                                  "text-sm font-bold",
                                  isCancelled ? "line-through text-muted-foreground"
                                    : p.kind === "remise" ? "text-orange-600" : "text-green-700",
                                )}>
                                  {fcfa(p.montant)} FCFA
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(p.date).toLocaleDateString("fr-FR")} {p.reference && `· réf. ${p.reference}`}
                            </p>
                            {isCancelled && p.motifAnnulation && (
                              <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-2">Annulation : « {p.motifAnnulation} »</p>
                            )}
                            {p.motif && (
                              <p className="text-[11px] text-foreground italic mt-1 line-clamp-2">« {p.motif} »</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 sm:h-7 sm:w-7"
                              title="Télécharger le reçu PDF (avec souche)"
                              onClick={() => ecoleId && downloadReceiptFor({
                                ecoleId, eleveId: eleve.id, paiementId: p.id,
                                type: (p.kind === "remise"
                                  ? (p.mode === "bourse" ? "bourse" : p.mode === "prise_en_charge" ? "prise_en_charge" : "remise")
                                  : "encaissement"),
                              })}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && !isCancelled && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 sm:h-7 sm:w-7 text-primary hover:bg-primary/10"
                                title="Corriger ce paiement (admin)"
                                onClick={() => setEditPaiement(p)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isAdmin && !isCancelled && p.kind === "encaissement" && p.trancheNum && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 sm:h-7 sm:w-7 text-destructive hover:bg-destructive/10"
                                title="Annuler cet encaissement (admin)"
                                onClick={() => setCancelPaiement({
                                  id: p.id,
                                  date: p.date,
                                  montant: p.montant,
                                  modeLabel: p.modeLabel,
                                  reference: p.reference ?? null,
                                  trancheNum: p.trancheNum ?? null,
                                  eleveLabel: `${eleve.nom} ${eleve.prenom}`,
                                })}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 sm:h-7 sm:w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              title="Envoyer le reçu par WhatsApp (sans souche)"
                              onClick={async () => {
                                if (!ecoleId) return;
                                const res = await shareReceiptWhatsApp({
                                  ecoleId, eleveId: eleve.id, paiementId: p.id,
                                  type: (p.kind === "remise"
                                    ? (p.mode === "bourse" ? "bourse" : p.mode === "prise_en_charge" ? "prise_en_charge" : "remise")
                                    : "encaissement"),
                                  telephone: eleve.telephone,
                                });
                                if (res === "fallback") {
                                  toast.message("PDF téléchargé", { description: "Joignez-le depuis WhatsApp Web qui vient de s'ouvrir." });
                                } else if (res === "error") {
                                  toast.error("Impossible de partager le reçu");
                                }
                              }}
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.821 11.821 0 0 1 3.48 8.414c-.003 6.555-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.523 5.276l-.999 3.648 3.965-1.04zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                              </svg>
                            </Button>
                          </div>
                        </div>
                        );
                      })}

                    </div>
                  </div>
                )}


                {ecoleId && (
                  <CustomFeeOverride
                    eleveId={eleve.id}
                    ecoleId={ecoleId}
                    onChanged={onPaymentRecorded}
                  />
                )}

                {/* Détail tranches */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />Détail des tranches
                  </h4>

                  <div className="space-y-3">
                    {eleve.tranches.map((t) => {
                      const isHighlighted = openTrancheNum === t.num;
                      const prevUnpaid = eleve.tranches.some((p) => p.num < t.num && p.statut !== "payee");
                      const locked = t.statut !== "payee" && prevUnpaid;
                      return (
                        <div key={t.num} ref={(el) => { trancheRefs.current[t.num] = el; }}>
                          <Card className={cn("border transition-all", isHighlighted && "border-primary ring-2 ring-primary/30 shadow-lg")}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-mono",
                                        t.statut === "payee" && "bg-green-500/15 text-green-700 border-green-500/40",
                                        t.statut === "partielle" && "bg-yellow-400/20 text-yellow-700 border-yellow-500/40",
                                        (t.statut === "retard" || t.statut === "due") && "bg-destructive/15 text-destructive border-destructive/40",
                                      )}
                                    >T{t.num}</Badge>
                                    <p className="font-semibold text-sm">{t.label}</p>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-1">📅 Échéance : {t.echeance}</p>
                                </div>
                                <Badge variant="outline" className={STATUT_BADGE[t.statut]}>{STATUT_LABEL[t.statut]}</Badge>
                              </div>
                              <div className="mt-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Versé</span>
                                  <span className="font-semibold">{fcfa(t.paye)} / {fcfa(t.montant)} FCFA</span>
                                </div>
                                <Progress value={(t.paye / t.montant) * 100} className="h-2" />
                              </div>
                              {t.statut !== "payee" && (
                                <>
                                  {locked ? (
                                    <p className="mt-3 text-[11px] text-muted-foreground italic text-center bg-muted/40 border rounded p-2">
                                      🔒 Soldez d'abord la tranche précédente pour pouvoir encaisser T{t.num}.
                                    </p>
                                  ) : (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => { setPayTrancheNum(t.num); setPayOpen(true); }}
                                      >
                                        <Plus className="h-4 w-4" />Encaisser
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setDiscountTrancheNum(t.num); setDiscountOpen(true); }}
                                      >
                                        <Tag className="h-4 w-4" />Remise / bourse
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Historique des relances */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Historique des relances
                    <Badge variant="secondary" className="ml-1">{relances.length}</Badge>
                  </h4>
                  {relances.length === 0 ? (
                    <Card className="border border-dashed">
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                        Aucune relance envoyée à cette famille.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="border rounded-lg divide-y">
                      {relances.map((r) => {
                        const canal = canalLabel(r.type);
                        return (
                          <div key={r.id} className="p-3 flex items-start gap-3">
                            <div className={cn(
                              "h-9 w-9 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0",
                              canal === "SMS" ? "bg-primary/15 text-primary" :
                              canal === "Email" ? "bg-accent/15 text-primary" :
                              "bg-orange-500/15 text-orange-600"
                            )}>
                              {canal === "SMS" ? <MessageSquare className="h-4 w-4" /> :
                               canal === "Email" ? <Mail className="h-4 w-4" /> :
                               <Phone className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold">{canal}</p>
                                <p className="text-[10px] text-muted-foreground">{formatRelanceDate(r.date_envoi)}</p>
                              </div>
                              <p className="text-xs text-foreground mt-1 line-clamp-2">{r.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <PaymentDialog
        eleve={eleve}
        defaultTrancheNum={payTrancheNum}
        open={payOpen}
        onOpenChange={(o) => { if (!o) { setPayOpen(false); setPayTrancheNum(undefined); } }}
        ecoleId={ecoleId}
        onPaymentRecorded={onPaymentRecorded}
      />

      <DiscountDialog
        eleve={eleve}
        defaultTrancheNum={discountTrancheNum}
        open={discountOpen}
        onOpenChange={(o) => { if (!o) { setDiscountOpen(false); setDiscountTrancheNum(undefined); } }}
        ecoleId={ecoleId}
        onApplied={onPaymentRecorded}
      />

      <EditPaymentDialog
        eleve={eleve}
        paiement={editPaiement}
        open={!!editPaiement}
        onOpenChange={(o) => { if (!o) setEditPaiement(null); }}
        onSaved={onPaymentRecorded}
      />

      <CancelPaymentDialog
        paiement={cancelPaiement}
        open={!!cancelPaiement}
        onOpenChange={(o) => { if (!o) setCancelPaiement(null); }}
        onCancelled={onPaymentRecorded}
      />
    </>
  );
}
