import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Copy, Check, Download, Smartphone, KeyRound, ArrowLeft } from "lucide-react";
import { useMfa } from "@/hooks/useMfa";
import { useSmsMfa } from "@/hooks/useSmsMfa";
import { useAuth } from "@/context/AuthContext";
import { useEcoleId } from "@/hooks/useEcoleId";
import { logSecurityEvent } from "@/hooks/useSecurityAudit";
import { toast } from "sonner";

type Method = "choose" | "totp" | "sms";
type Step = "enroll" | "verify" | "backup" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export default function MfaSetupDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { ecoleId } = useEcoleId();
  const { enroll, verifyEnrollment, generateBackupCodes, refresh } = useMfa();
  const sms = useSmsMfa();

  const [method, setMethod] = useState<Method>("choose");
  const [step, setStep] = useState<Step>("enroll");

  // TOTP
  const [factorId, setFactorId] = useState("");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // SMS
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("choose");
      setStep("enroll");
      setCode("");
      setBackupCodes([]);
      setOtpSent(false);
      setPhone("");
    }
  }, [open]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  /* ============ TOTP ============ */
  const startTotp = async () => {
    setLoading(true);
    try {
      const data = await enroll(`GSP - ${new Date().toLocaleDateString("fr-FR")}`);
      const totp = (data as any).totp;
      setFactorId((data as any).id);
      setSecret(totp.secret);
      const png = await QRCode.toDataURL(totp.uri, { width: 256, margin: 1 });
      setQrDataUrl(png);
      setStep("verify");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'activation");
    } finally { setLoading(false); }
  };

  const verifyTotp = async () => {
    if (code.length < 6) return toast.error("Code à 6 chiffres requis");
    setLoading(true);
    try {
      await verifyEnrollment(factorId, code);
      await logSecurityEvent("mfa_enabled", "info", { factor_id: factorId, method: "totp" });
      if (user?.id) setBackupCodes(await generateBackupCodes(user.id));
      setStep("backup");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Code invalide");
      await logSecurityEvent("mfa_enrollment_failed", "warning");
    } finally { setLoading(false); }
  };

  /* ============ SMS ============ */
  const sendSms = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) return toast.error("Numéro invalide (ex. +225 0707070707)");
    setLoading(true);
    try {
      await sms.sendOtp({ phone: cleaned, ecole_id: ecoleId ?? undefined, purpose: "enroll" });
      setOtpSent(true);
      setStep("verify");
      setResendIn(60);
      toast.success("Code envoyé par SMS");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur envoi SMS");
    } finally { setLoading(false); }
  };

  const verifySms = async () => {
    if (code.length < 6) return toast.error("Code à 6 chiffres requis");
    setLoading(true);
    try {
      await sms.verifyOtp(code, "enroll");
      if (user?.id) setBackupCodes(await generateBackupCodes(user.id));
      setStep("backup");
    } catch (e: any) {
      toast.error(e.message ?? "Code invalide");
    } finally { setLoading(false); }
  };

  /* ============ Backup ============ */
  const copyBackup = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const downloadBackup = () => {
    const blob = new Blob([
      `GROUPE SCOLAIRE LA PROVIDENCE - Codes de secours MFA\n` +
      `Généré le ${new Date().toLocaleString("fr-FR")}\n\n` +
      `⚠️ Conservez ces codes en lieu sûr. Chaque code n'est utilisable qu'une fois.\n\n` +
      backupCodes.join("\n"),
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gsp-backup-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  };
  const finish = () => {
    onSuccess?.();
    onOpenChange(false);
    toast.success("MFA activé avec succès");
  };

  const backToChoose = () => { setMethod("choose"); setStep("enroll"); setCode(""); setOtpSent(false); };

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

        {/* ============== CHOIX MÉTHODE ============== */}
        {method === "choose" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <button
              onClick={() => setMethod("totp")}
              className="w-full text-left rounded-xl border border-border/60 bg-muted/30 p-4 hover:bg-muted/50 transition flex gap-3"
            >
              <KeyRound className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Application Authenticator (TOTP)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Google Authenticator, Microsoft Authenticator, Authy, 1Password…
                </p>
              </div>
            </button>

            <button
              onClick={() => setMethod("sms")}
              className="w-full text-left rounded-xl border border-border/60 bg-muted/30 p-4 hover:bg-muted/50 transition flex gap-3"
            >
              <Smartphone className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Code par SMS</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recevez un code à 6 chiffres sur votre téléphone à chaque connexion.
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* ============== TOTP ============== */}
        {method === "totp" && step === "enroll" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Button variant="ghost" size="sm" onClick={backToChoose}>
              <ArrowLeft className="h-4 w-4" /> Changer de méthode
            </Button>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Vous aurez besoin d'une app TOTP :</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Google Authenticator</li>
                <li>Microsoft Authenticator</li>
                <li>Authy / 1Password</li>
              </ul>
            </div>
            <Button onClick={startTotp} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Commencer la configuration
            </Button>
          </motion.div>
        )}

        {method === "totp" && step === "verify" && (
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
                inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em] font-mono mt-1"
              />
            </div>
            <Button onClick={verifyTotp} disabled={loading || code.length < 6} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Vérifier et activer
            </Button>
          </motion.div>
        )}

        {/* ============== SMS ============== */}
        {method === "sms" && step === "enroll" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Button variant="ghost" size="sm" onClick={backToChoose}>
              <ArrowLeft className="h-4 w-4" /> Changer de méthode
            </Button>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm flex gap-3">
              <Smartphone className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-muted-foreground">
                Saisissez le numéro qui recevra le code à 6 chiffres lors de chaque connexion.
              </p>
            </div>
            <div>
              <Label>Numéro de téléphone (format international)</Label>
              <Input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 07 07 07 07 07" className="mt-1"
              />
            </div>
            <Button onClick={sendSms} disabled={loading || !phone} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer le code par SMS
            </Button>
          </motion.div>
        )}

        {method === "sms" && step === "verify" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              Code envoyé à <span className="font-mono">{phone}</span>. Il expire dans 10 minutes.
            </div>
            <div>
              <Label>Code à 6 chiffres reçu par SMS</Label>
              <Input
                inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em] font-mono mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" disabled={resendIn > 0 || loading}
                onClick={sendSms} className="flex-1"
              >
                {resendIn > 0 ? `Renvoyer (${resendIn}s)` : "Renvoyer le code"}
              </Button>
              <Button onClick={verifySms} disabled={loading || code.length < 6} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Vérifier
              </Button>
            </div>
          </motion.div>
        )}

        {/* ============== BACKUP CODES ============== */}
        {step === "backup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-bold text-destructive mb-2">⚠️ Codes de secours — affichés une seule fois</p>
              <p className="text-muted-foreground">Conservez-les hors ligne. Ils permettent de récupérer l'accès si vous perdez votre téléphone.</p>
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
