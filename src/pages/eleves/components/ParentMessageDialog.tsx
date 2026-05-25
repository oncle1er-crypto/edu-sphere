import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { useSmsConfig } from "@/hooks/useSmsConfig";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipients: { nom: string; telephone: string }[];
  eleveLabel?: string;
}

export function ParentSmsDialog({ open, onOpenChange, recipients, eleveLabel }: Props) {
  const { sendSms } = useSmsConfig();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(
        eleveLabel
          ? `Bonjour, message de l'école GSP concernant ${eleveLabel}. `
          : "Bonjour, message de l'école GSP. "
      );
    }
  }, [open, eleveLabel]);

  const validRecipients = recipients.filter((r) => r.telephone && r.telephone.trim().length > 0);

  const handleSend = async () => {
    const msg = message.trim();
    if (msg.length < 5) { toast.error("Message trop court"); return; }
    if (msg.length > 480) { toast.error("Message trop long (max 480)"); return; }
    if (validRecipients.length === 0) { toast.error("Aucun numéro valide"); return; }
    setSending(true);
    try {
      const res = await sendSms(validRecipients.map((r) => r.telephone), msg);
      toast.success(`SMS envoyés : ${res.sent}/${res.total}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un SMS aux parents</DialogTitle>
          <DialogDescription>
            Le message sera envoyé via YellikaSMS aux numéros sélectionnés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Destinataires ({validRecipients.length})</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {validRecipients.map((r, i) => (
                <Badge key={i} variant="secondary" className="text-[11px]">
                  {r.nom} — {r.telephone}
                </Badge>
              ))}
              {validRecipients.length === 0 && (
                <p className="text-xs text-destructive">Aucun parent avec téléphone sélectionné.</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message ({message.length}/480)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={480}
              placeholder="Votre message…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending || validRecipients.length === 0} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
