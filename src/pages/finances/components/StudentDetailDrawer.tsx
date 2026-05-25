import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, MessageSquare, Plus, Calendar, History, Bell, Tag, Receipt, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { fcfa, type EleveScolarite, type Tranche } from "../scolarite-data";
import { downloadReceiptFor } from "@/lib/downloadReceipt";
import { useRelances, formatRelanceDate } from "@/hooks/useRelances";
import { PaymentDialog } from "./PaymentDialog";
import { DiscountDialog } from "./DiscountDialog";
import { toast } from "sonner";

interface Props {
  eleve: EleveScolarite | null;
  openTrancheNum?: number;
  onOpenChange: (open: boolean) => void;
  ecoleId?: string | null;
  onPaymentRecorded?: () => void;
}

function buildSmsRelance(e: EleveScolarite): string {
  const trancheRetard = e.tranches.find((t) => t.statut === "retard");
  const lib = trancheRetard ? `${trancheRetard.label} (échue le ${trancheRetard.echeance})` : "scolarité";
  return `CSP - Bonjour ${e.parent}, rappel : ${fcfa(e.resteDu)} FCFA dus pour ${e.prenom} ${e.nom} (${e.classe}) au titre de ${lib}. Merci de régulariser. Foi, Savoir, Excellence.`;
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

export function StudentDetailDrawer({ eleve, openTrancheNum, onOpenChange, ecoleId, onPaymentRecorded }: Props) {
  const { relances, fetchRelances, addRelance } = useRelances(eleve?.id);
  const trancheRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [payTrancheNum, setPayTrancheNum] = useState<number | undefined>(undefined);
  const [payOpen, setPayOpen] = useState(false);
  const [discountTrancheNum, setDiscountTrancheNum] = useState<number | undefined>(undefined);
  const [discountOpen, setDiscountOpen] = useState(false);

  useEffect(() => {
    if (eleve) fetchRelances();
  }, [eleve, fetchRelances]);

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
    await addRelance({
      eleveId: eleve.id,
      canal: "SMS",
      message: buildSmsRelance(eleve),
      destinataire: eleve.telephone,
    });
    toast.success(`SMS envoyé à ${eleve.parent}`, { description: eleve.telephone });
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
                <SheetTitle className="text-primary">{eleve.prenom} {eleve.nom}</SheetTitle>
                <SheetDescription>
                  {eleve.classe} · {eleve.cycle} · <span className="font-mono">{eleve.matricule}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact + actions de relance 1-clic */}
                <Card className="border">
                  <CardContent className="p-4">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Parent / Tuteur</p>
                    <p className="font-semibold">{eleve.parent}</p>
                    <p className="text-sm text-muted-foreground">{eleve.telephone}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={handleLogCall}>
                        <Phone className="h-4 w-4" />Appeler
                      </Button>
                      <Button
                        size="sm"
                        className={enRetard ? "bg-primary hover:bg-primary/90" : ""}
                        variant={enRetard ? "default" : "outline"}
                        onClick={handleSendSms}
                      >
                        <MessageSquare className="h-4 w-4" />SMS
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSendEmail}>
                        <Mail className="h-4 w-4" />Email
                      </Button>
                    </div>
                    {enRetard && (
                      <p className="text-[11px] text-muted-foreground mt-2 italic">
                        💡 Cliquer sur SMS envoie immédiatement le message pré-rédigé de relance.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Synthèse */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-sm font-bold text-foreground">{fcfa(eleve.fraisAnnuel)}</p></CardContent></Card>
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Payé</p><p className="text-sm font-bold text-success">{fcfa(eleve.totalPaye)}</p></CardContent></Card>
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Reste</p><p className="text-sm font-bold text-destructive">{fcfa(eleve.resteDu)}</p></CardContent></Card>
                </div>

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
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
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
    </>
  );
}
