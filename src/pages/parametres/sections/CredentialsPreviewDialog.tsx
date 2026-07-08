import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Mail, MessageCircle, Send, ShieldAlert, KeyRound, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  fullName: string;
  identifier: string;
  password: string;
  channel: "email" | "phone";
}

export function CredentialsPreviewDialog({ open, onClose, fullName, identifier, password, channel }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<{ key: string; label: string; value: string } | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);

  const message = `Bonjour ${fullName},

Votre compte GSP a été créé.
Identifiant : ${identifier}
Mot de passe temporaire : ${password}

Vous devrez le changer à la 1ère connexion.`;

  useEffect(() => {
    if (!manualCopy) return;

    const frame = window.requestAnimationFrame(() => {
      manualCopyRef.current?.focus();
      manualCopyRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [manualCopy]);

  const selectManualCopy = (value: string, key: string, label: string) => {
    setCopied(null);
    setManualCopy({ key, label, value });

    window.setTimeout(() => {
      const textarea = manualCopyRef.current;
      if (!textarea) return;

      textarea.focus();
      textarea.select();

      try {
        document.execCommand("copy");
      } catch {
        // Clipboard access can be blocked in embedded previews.
      }
    }, 0);

    toast.info("Texte sélectionné — appuyez sur Ctrl+C ou Cmd+C");
  };

  const copy = async (value: string, key: string, label: string) => {
    const isEmbeddedPreview = window.self !== window.top;

    if (isEmbeddedPreview) {
      selectManualCopy(value, key, label);
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        setManualCopy(null);
        setCopied(key);
        toast.success("Copié");
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        return;
      }
    } catch {
      // Fall back below to manual selection when native clipboard is denied.
    }

    selectManualCopy(value, key, label);
  };


  const smsHref = channel === "phone" ? `sms:${identifier}?body=${encodeURIComponent(message)}` : "";
  const waHref = channel === "phone"
    ? `https://wa.me/225${identifier.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : "";
  const mailHref = channel === "email"
    ? `mailto:${identifier}?subject=${encodeURIComponent("Vos identifiants GSP")}&body=${encodeURIComponent(message)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Identifiants du compte
          </DialogTitle>
          <DialogDescription>
            Transmettez ces informations à l'utilisateur. <strong>Le mot de passe ne sera plus affiché après fermeture.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
              <User className="h-3.5 w-3.5" /> Nom
            </div>
            <div className="font-medium">{fullName}</div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              {channel === "phone" ? "Téléphone (identifiant)" : "Email (identifiant)"}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm break-all">{identifier}</code>
              <Button size="sm" variant="outline" onClick={() => copy(identifier, "id", "identifiant")}>
                {copied === "id" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Mot de passe temporaire</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-2xl tracking-[0.35em] text-primary font-bold text-center py-1">
                {password}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(password, "pwd", "mot de passe")}>
                {copied === "pwd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-800 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>L'utilisateur devra changer ce mot de passe à sa 1ère connexion.</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => copy(message, "all", "message complet")} className="col-span-2">
              {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copier tout le message
            </Button>

            {channel === "phone" ? (
              <>
                <Button variant="outline" asChild>
                  <a href={smsHref}><Send className="h-4 w-4" />SMS</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />WhatsApp
                  </a>
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild className="col-span-2">
                <a href={mailHref}><Mail className="h-4 w-4" />Envoyer par email</a>
              </Button>
            )}
          </div>

          {manualCopy && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Copie manuelle — {manualCopy.label}
              </div>
              <Textarea
                ref={manualCopyRef}
                readOnly
                value={manualCopy.value}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="min-h-20 resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Si le collage reste vide, le navigateur bloque le presse-papiers : le texte ci-dessus est sélectionné pour une copie clavier.
              </p>
            </div>
          )}

          <Button onClick={onClose} className="w-full">J'ai transmis les identifiants</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
