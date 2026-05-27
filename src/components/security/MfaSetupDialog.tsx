import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Copy, Check, Download } from "lucide-react";
import { useMfa } from "@/hooks/useMfa";
import { useAuth } from "@/context/AuthContext";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";
import { toast } from "sonner";

type Step = "enroll" | "verify" | "backup" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export default function MfaSetupDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { enroll, verifyEnrollment, generateBackupCodes, refresh } = useMfa();
  const [step, setStep] = useState<Step>("enroll");
  const [factorId, setFactorId] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("enroll");
      setCode("");
      setBackupCodes([]);
    }
  }, [open]);

  const startEnroll = async () => {
    setLoading(true);
    try {
      const data = await enroll(`GSP - ${new Date().toLocaleDateString("fr-FR")}`);
      const totp = (data as any).totp;
      setFactorId((data as any).id);
      setSecret(totp.secret);
      // Génère QR code à partir de l'URI otpauth
      const png = await QRCode.toDataURL(totp.uri, { width: 256, margin: 1 });
      setQrDataUrl(png);
      setStep("verify");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'activation");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return toast.error("Code à 6 chiffres requis");
    setLoading(true);
    try {
      await verifyEnrollment(factorId, code);
      await logSecurityEvent("mfa_enabled", "info", { factor_id: factorId });
      // Générer backup codes
      if (user?.id) {
        const codes = await generateBackupCodes(user.id);
        setBackupCodes(codes);
      }
      setStep("backup");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Code invalide");
      await logSecurityEvent("mfa_enrollment_failed", "warning");
    } finally {
      setLoading(false);
    }
  };

  const copyBackup = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackup = () => {
    const blob = new Blob(
      [
        `GROUPE SCOLAIRE LA PROVIDENCE - Codes de secours MFA\n` +
        `Généré le ${new Date().toLocaleString("fr-FR")}\n\n` +
        `⚠️ Conservez ces codes en lieu sûr. Chaque code n'est utilisable qu'une fois.\n\n` +
        backupCodes.join("\n"),
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gsp-backup-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const finish = () => {
    setStep("done");
    onSuccess?.();
    onOpenChange(false);
    toast.success("MFA activé avec succès");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Configurer l'authentification à deux facteurs
          </DialogTitle>
          <DialogDescription>
            Renforcez la sécurité de votre compte avec un code à usage unique.
          </DialogDescription>
        </DialogHeader>

        {step === "enroll" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Vous aurez besoin d'une app TOTP :</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy / 1Password</li>
              </ul>
            </div>
            <Button onClick={startEnroll} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Commencer la configuration
            </Button>
          </motion.div>
        )}

        {step === "verify" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code MFA" className="rounded-lg border border-border bg-white p-2 w-56 h-56" />
              )}
              <div className="w-full">
                <Label className="text-xs">Ou saisissez la clé manuellement :</Label>
                <code className="block mt-1 p-2 text-xs bg-muted rounded font-mono break-all">{secret}</code>
              </div>
            </div>
            <div>
              <Label>Code à 6 chiffres affiché par l'app</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em] font-mono mt-1"
              />
            </div>
            <Button onClick={handleVerify} disabled={loading || code.length < 6} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Vérifier et activer
            </Button>
          </motion.div>
        )}

        {step === "backup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-bold text-destructive mb-2">⚠️ Codes de secours — affichés une seule fois</p>
              <p className="text-muted-foreground">Conservez-les hors ligne. Ils vous permettent de récupérer l'accès si vous perdez votre téléphone.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted/40 rounded-lg font-mono text-sm">
              {backupCodes.map((c) => <div key={c} className="text-center">{c}</div>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyBackup} className="flex-1">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copier
              </Button>
              <Button variant="outline" onClick={downloadBackup} className="flex-1">
                <Download className="h-4 w-4" /> Télécharger
              </Button>
            </div>
            <Button onClick={finish} className="w-full">J'ai sauvegardé mes codes</Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
