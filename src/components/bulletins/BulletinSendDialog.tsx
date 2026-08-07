import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { normalizeSmsText } from "@/lib/smsText";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import {
  envoyerWhatsAppZindua, premierEchec, ZINDUA_MAX_DESTINATAIRES,
} from "@/lib/sendWhatsAppZindua";

interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  lien?: string;
  principal?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ecoleId: string;
  eleveId: string;
  eleveNom: string;
  elevePrenom: string;
  classeNom: string;
  periodeNom: string;
  /** PDF binaire pour upload + lien signé */
  pdfBlob: Blob | null;
  /** Audit id (pour traçabilité) */
  bulletinAuditId?: string | null;
  /** À jour scolarité */
  aJour: boolean;
  onSent?: () => void;
}

export function BulletinSendDialog(props: Props) {
  const { open, onOpenChange, ecoleId, eleveId, eleveNom, elevePrenom, classeNom, periodeNom, pdfBlob, bulletinAuditId, aJour, onSent } = props;

  const [parents, setParents] = useState<Parent[]>([]);
  const [selected, setSelected] = useState<Record<string, { email: boolean; sms: boolean; wa: boolean }>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !eleveId) return;
    (async () => {
      const { data } = await supabase
        .from("eleve_parents")
        .select("est_contact_principal, lien, parents(id, nom, prenom, email, telephone)")
        .eq("eleve_id", eleveId);
      const list: Parent[] = (data ?? []).map((r: any) => ({
        id: r.parents.id, nom: r.parents.nom, prenom: r.parents.prenom,
        email: r.parents.email, telephone: r.parents.telephone,
        lien: r.lien, principal: r.est_contact_principal,
      }));
      setParents(list);
      const init: typeof selected = {};
      for (const p of list) {
        init[p.id] = {
          email: !!p.email && !!p.principal,
          sms: !!p.telephone && !!p.principal,
          wa: false,
        };
      }
      setSelected(init);
    })();
  }, [open, eleveId]);

  const totalChannels = useMemo(() => {
    return Object.values(selected).reduce(
      (acc, s) => acc + (s.email ? 1 : 0) + (s.sms ? 1 : 0) + (s.wa ? 1 : 0), 0);
  }, [selected]);

  const toggle = (pid: string, ch: "email" | "sms" | "wa") => {
    setSelected((s) => ({ ...s, [pid]: { ...s[pid], [ch]: !s[pid]?.[ch] } }));
  };

  const uploadPdf = async (): Promise<{ path: string; signedUrl: string } | null> => {
    if (!pdfBlob) return null;
    const path = `${ecoleId}/${eleveId}/${periodeNom.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("bulletins").upload(path, pdfBlob, {
      contentType: "application/pdf", upsert: true,
    });
    if (error) { toast.error("Upload PDF: " + messageErreurBase(error)); return null; }
    const { data: signed } = await supabase.storage.from("bulletins").createSignedUrl(path, 60 * 60 * 24 * 7);
    return { path, signedUrl: signed?.signedUrl ?? "" };
  };

  const handleSend = async () => {
    if (!aJour) { toast.error("Élève non à jour : envoi bloqué."); return; }
    if (totalChannels === 0) { toast.error("Sélectionnez au moins un destinataire."); return; }
    if (!pdfBlob) { toast.error("PDF du bulletin indisponible."); return; }

    setSending(true);
    try {
      const upload = await uploadPdf();
      if (!upload) { setSending(false); return; }
      const link = upload.signedUrl;

      const baseTxt =
        `GSP — Bulletin de ${eleveNom} ${elevePrenom} (${classeNom}) — ${periodeNom}.\n` +
        `Téléchargez le bulletin : ${link}\n(Lien valable 7 jours) — Foi, Savoir, Excellence.`;
      const smsTxt = normalizeSmsText(baseTxt);

      const emails: string[] = [];
      const smsNums: string[] = [];
      const waNums: string[] = [];

      for (const p of parents) {
        const s = selected[p.id];
        if (!s) continue;
        if (s.email && p.email) emails.push(p.email);
        if (s.sms && p.telephone) smsNums.push(p.telephone);
        if (s.wa && p.telephone) waNums.push(p.telephone);
      }

      const channelsLog: string[] = [];
      const recipientsLog: any[] = [];

      // SMS
      if (smsNums.length > 0) {
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { ecole_id: ecoleId, destinataires: smsNums, message: smsTxt },
        });
        if (error || data?.error) toast.error("SMS: " + (messageErreurBase(error) ?? data?.error));
        else { channelsLog.push("sms"); recipientsLog.push(...smsNums.map((t) => ({ ch: "sms", to: t }))); }
      }

      // WhatsApp (Zindua, modèle approuvé) avec repli SMS
      if (waNums.length > 0) {
        try {
          for (let i = 0; i < waNums.length; i += ZINDUA_MAX_DESTINATAIRES) {
            const lot = waNums.slice(i, i + ZINDUA_MAX_DESTINATAIRES);
            const r = await envoyerWhatsAppZindua({
              ecoleId: ecoleId as string,
              usage: "bulletin",
              destinataires: lot,
              variables: {
                eleve: `${eleveNom} ${elevePrenom}`.trim(),
                classe: classeNom,
                periode: periodeNom,
                lien: link,
              },
              sms: smsTxt,
              fallbackSms: true,
            });
            if (r.envoyes > 0) {
              channelsLog.push("whatsapp");
              recipientsLog.push(...lot.map((t) => ({ ch: "whatsapp", to: t })));
            }
            const echec = premierEchec(r);
            if (echec) toast.error("WhatsApp: " + echec);
          }
        } catch (e) {
          toast.error("WhatsApp: " + (e instanceof Error ? e.message : String(e)));
        }
      }


      // Email — fallback mailto (à connecter à un provider plus tard)
      if (emails.length > 0) {
        const subject = encodeURIComponent(`Bulletin ${periodeNom} — ${eleveNom} ${elevePrenom}`);
        const body = encodeURIComponent(baseTxt);
        const mailto = `mailto:${emails.join(",")}?subject=${subject}&body=${body}`;
        window.open(mailto, "_blank");
        channelsLog.push("email");
        recipientsLog.push(...emails.map((e) => ({ ch: "email", to: e })));
      }

      // Traçabilité audit
      if (bulletinAuditId && channelsLog.length > 0) {
        await supabase.rpc("tracer_envoi_bulletin", {
          _id: bulletinAuditId,
          _channels: channelsLog as any,
          _recipients: recipientsLog as any,
        });
      }

      if (channelsLog.length > 0) {
        toast.success(`Bulletin envoyé (${channelsLog.join(", ")}).`);
        onSent?.();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error("Erreur envoi : " + (messageErreurBase(err) ?? "inconnue"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer le bulletin — {eleveNom} {elevePrenom}</DialogTitle>
        </DialogHeader>

        {!aJour && (
          <Alert variant="destructive">
            <AlertDescription>
              Élève non à jour de sa scolarité. L'envoi du bulletin est bloqué tant que les tranches échues ne sont pas réglées.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cochez les canaux à utiliser pour chaque parent. Le PDF est archivé puis un lien signé (7 jours) est transmis.
          </p>

          {parents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun parent lié à cet élève.</p>
          ) : (
            <div className="space-y-2">
              {parents.map((p) => (
                <div key={p.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{p.nom} {p.prenom} {p.principal && <span className="text-xs text-primary">(principal)</span>}</p>
                      <p className="text-xs text-muted-foreground">{p.email ?? "—"} · {p.telephone ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!!selected[p.id]?.email} disabled={!p.email} onCheckedChange={() => toggle(p.id, "email")} />
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!!selected[p.id]?.sms} disabled={!p.telephone} onCheckedChange={() => toggle(p.id, "sms")} />
                      <MessageSquare className="h-3.5 w-3.5" /> SMS
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!!selected[p.id]?.wa} disabled={!p.telephone} onCheckedChange={() => toggle(p.id, "wa")} />
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending || !aJour || totalChannels === 0} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer ({totalChannels})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
