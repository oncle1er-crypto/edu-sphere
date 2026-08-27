import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { envoyerWhatsAppZindua, premierEchec, ZINDUA_MAX_DESTINATAIRES } from "@/lib/sendWhatsAppZindua";
import { formatCoverageEnd, type RenewalTarget } from "@/lib/serviceRenewal";
import { toast } from "sonner";

interface Props {
  cibles: RenewalTarget[];
  ecoleId: string | null;
  service: "cantine" | "transport";
  onDone?: () => void;
}

interface Recipient extends RenewalTarget {
  parent: string;
  telephone: string | null;
}

const SERVICE_LABEL = { cantine: "la cantine", transport: "le transport scolaire" } as const;

export function ServiceRenewalAlert({ cibles, ecoleId, service, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const expired = cibles.filter((c) => c.statut === "expire").length;

  useEffect(() => {
    if (!open || cibles.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("eleve_parents")
        .select("eleve_id, est_contact_principal, parents(nom, prenom, telephone, telephone2)")
        .in("eleve_id", cibles.map((c) => c.eleve_id));
      if (cancelled) return;
      if (error) {
        toast.error("Impossible de charger les contacts des parents");
        setRecipients([]);
        setLoading(false);
        return;
      }
      const byStudent = new Map<string, { parent: string; telephone: string | null }>();
      ((data ?? []) as any[])
        .sort((a, b) => Number(b.est_contact_principal) - Number(a.est_contact_principal))
        .forEach((link) => {
          if (byStudent.has(link.eleve_id) || !link.parents) return;
          const parent = link.parents;
          byStudent.set(link.eleve_id, {
            parent: `${parent.nom ?? ""} ${parent.prenom ?? ""}`.trim() || "Parent",
            telephone: parent.telephone || parent.telephone2 || null,
          });
        });
      setRecipients(cibles.map((c) => ({
        ...c,
        parent: byStudent.get(c.eleve_id)?.parent ?? "Parent",
        telephone: byStudent.get(c.eleve_id)?.telephone ?? null,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, cibles]);

  if (cibles.length === 0) return null;

  const reachable = recipients.filter(
    (recipient, index) => !!recipient.telephone &&
      recipients.findIndex((other) => other.eleve_id === recipient.eleve_id && other.telephone === recipient.telephone) === index,
  );

  const send = async () => {
    if (!ecoleId || reachable.length === 0) return;
    setSending(true);
    let sent = 0;
    let viaWhatsApp = 0;
    let lastError: string | null = null;
    const label = SERVICE_LABEL[service];

    const messages = reachable.map((recipient) => {
      const end = formatCoverageEnd(recipient.date_fin_validite);
      const timing = recipient.statut === "expire" ? `a expiré le ${end}` : `expire le ${end}`;
      return {
        to: recipient.telephone as string,
        variables: {
          parent: recipient.parent,
          eleve: recipient.eleve_nom,
          classe: recipient.classe_nom,
          service: label,
          date: end,
        },
        sms: `GSP - Bonjour ${recipient.parent}, la période payée pour ${label} de ${recipient.eleve_nom} (${recipient.classe_nom}) ${timing}. Merci de renouveler la prochaine tranche au secrétariat. Foi, Savoir, Excellence.`,
      };
    });

    for (let i = 0; i < messages.length; i += ZINDUA_MAX_DESTINATAIRES) {
      try {
        const result = await envoyerWhatsAppZindua({
          ecoleId,
          usage: "echeance",
          destinataires: messages.slice(i, i + ZINDUA_MAX_DESTINATAIRES),
          fallbackSms: true,
        });
        sent += result.envoyes;
        viaWhatsApp += result.whatsapp;
        lastError = premierEchec(result) ?? lastError;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    if (sent > 0) {
      const table = service === "cantine" ? "abonnements_cantine" : "abonnements_transport";
      await (supabase as any).from(table)
        .update({ derniere_relance_at: new Date().toISOString() })
        .in("id", reachable.map((recipient) => recipient.abonnement_id));
      toast.success(`${sent} rappel(s) envoyé(s) — ${viaWhatsApp} par WhatsApp, ${sent - viaWhatsApp} par SMS`);
      setOpen(false);
      onDone?.();
    } else {
      toast.error(lastError ?? "Aucun rappel n'a pu être envoyé");
    }
    setSending(false);
  };

  return (
    <>
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex flex-wrap items-center gap-2">
        <BellRing className="h-4 w-4 text-amber-700 shrink-0" />
        <span>
          <b>{cibles.length}</b> abonnement{cibles.length > 1 ? "s" : ""} à renouveler
          {expired > 0 && <> — <b>{expired}</b> déjà expiré{expired > 1 ? "s" : ""}</>}.
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpen(true)}>
          <Send className="h-3.5 w-3.5" /> Voir et informer les parents
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Renouvellements — {service === "cantine" ? "Cantine" : "Transport"}
            </DialogTitle>
            <DialogDescription>
              Ces élèves approchent de la fin de leur période payée. Vérifiez la liste avant d'envoyer les rappels.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {recipients.map((recipient) => (
                <div key={recipient.abonnement_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{recipient.eleve_nom} <span className="text-muted-foreground">· {recipient.classe_nom}</span></p>
                    <p className="text-xs text-muted-foreground truncate">
                      {recipient.parent} — {recipient.telephone ?? <span className="text-destructive">aucun numéro</span>}
                    </p>
                  </div>
                  <Badge variant={recipient.statut === "expire" ? "destructive" : "secondary"}>
                    {recipient.statut === "expire" ? "Expiré" : "Expire"} le {formatCoverageEnd(recipient.date_fin_validite)}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="items-center">
            <p className="text-xs text-muted-foreground mr-auto">{reachable.length} parent(s) joignable(s) sur {recipients.length}</p>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button onClick={send} disabled={sending || reachable.length === 0}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer les rappels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ServiceRenewalAlert;
