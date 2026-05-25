import { useState, useEffect } from "react";
import { Smartphone, Send, TestTube2, Loader2, Eye, EyeOff, ShieldCheck, MessageCircle } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSmsConfig, maskToken } from "@/hooks/useSmsConfig";
import { toast } from "sonner";

const PHONE_REGEX = /^\+225\d{10}$/;
const URL_REGEX = /^https:\/\/.+/;

interface FormErrors {
  apiToken?: string;
  senderId?: string;
  baseUrl?: string;
  coutUnitaire?: string;
  testPhone?: string;
}

export default function SmsSettings() {
  const { config, loading, save, testSms } = useSmsConfig();

  const [apiToken, setApiToken] = useState("");
  const [apiTokenTouched, setApiTokenTouched] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://panel.yellikasms.com/api/v3/sms/send");
  const [isActive, setIsActive] = useState(false);
  const [coutUnitaire, setCoutUnitaire] = useState(25);
  const [testPhone, setTestPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (config) {
      setApiToken(config.api_token || "");
      setApiTokenTouched(false);
      setSenderId(config.sender_id || "");
      setBaseUrl(config.base_url || "https://panel.yellikasms.com/api/v3/sms/send");
      setIsActive(config.is_active);
      setCoutUnitaire(config.cout_unitaire);
    }
  }, [config]);

  const validate = (): boolean => {
    const e: FormErrors = {};
    const tokenToCheck = apiTokenTouched ? apiToken : config?.api_token;
    if (isActive && (!tokenToCheck || tokenToCheck.trim().length < 10)) {
      e.apiToken = "La clé API doit comporter au moins 10 caractères.";
    }
    if (isActive && (!senderId || senderId.trim().length === 0)) {
      e.senderId = "Le Sender ID est requis.";
    } else if (senderId.length > 11) {
      e.senderId = "Le Sender ID ne doit pas dépasser 11 caractères.";
    } else if (senderId && !/^[A-Za-z0-9 _-]+$/.test(senderId)) {
      e.senderId = "Caractères autorisés : lettres, chiffres, espaces, tirets.";
    }
    if (!URL_REGEX.test(baseUrl)) {
      e.baseUrl = "L'URL doit commencer par https://.";
    }
    if (coutUnitaire < 0 || coutUnitaire > 1000) {
      e.coutUnitaire = "Le coût doit être entre 0 et 1 000 FCFA.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Veuillez corriger les erreurs avant d'enregistrer.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      sender_id: senderId.trim(),
      base_url: baseUrl.trim(),
      is_active: isActive,
      cout_unitaire: coutUnitaire,
    };
    // Only send api_token if user actually changed it
    if (apiTokenTouched) {
      payload.api_token = apiToken.trim();
    }
    await save(payload);
    setApiTokenTouched(false);
    setShowToken(false);
    setSaving(false);
  };

  const validateTestPhone = (): boolean => {
    if (!PHONE_REGEX.test(testPhone)) {
      setErrors((prev) => ({ ...prev, testPhone: "Format requis : +225 suivi de 10 chiffres." }));
      return false;
    }
    setErrors((prev) => ({ ...prev, testPhone: undefined }));
    return true;
  };

  const handleTest = async () => {
    if (!validateTestPhone()) return;
    setTesting(true);
    try { await testSms(testPhone); } catch { /* toast handled in hook */ }
    setTesting(false);
  };

  /** Display value for the API token field */
  const displayToken = (() => {
    if (apiTokenTouched) return apiToken; // user is editing — show raw
    if (showToken) return config?.api_token || "";
    return maskToken(config?.api_token || "");
  })();

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const hasExistingToken = !!config?.api_token;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Configuration YellikaSMS"
        description="Paramétrez votre compte YellikaSMS pour l'envoi de SMS depuis la plateforme."
        icon={<Smartphone className="h-5 w-5" />}
        hideSave
      >
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Service SMS</span>
            {isActive ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Actif</Badge>
            ) : (
              <Badge variant="secondary">Inactif</Badge>
            )}
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <FieldRow label="Clé API YellikaSMS" hint="Disponible dans votre tableau de bord YellikaSMS → Paramètres → API">
          <div className="space-y-1">
            <div className="relative">
              <Input
                type={apiTokenTouched || showToken ? "text" : "password"}
                placeholder={hasExistingToken ? "••••••••(inchangée)" : "Collez votre clé API..."}
                value={apiTokenTouched ? apiToken : (showToken ? (config?.api_token || "") : "")}
                onChange={(e) => {
                  setApiTokenTouched(true);
                  setApiToken(e.target.value);
                  setErrors((prev) => ({ ...prev, apiToken: undefined }));
                }}
                onFocus={() => {
                  if (!apiTokenTouched && hasExistingToken) {
                    // Don't auto-fill — let the user type a new one or leave empty to keep current
                  }
                }}
                className="pr-10"
              />
              {hasExistingToken && !apiTokenTouched && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? "Masquer" : "Afficher"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            {hasExistingToken && !apiTokenTouched && (
              <p className="text-xs text-muted-foreground">
                Clé actuelle : <code className="bg-muted px-1 rounded">{maskToken(config?.api_token || "")}</code> — laissez vide pour conserver.
              </p>
            )}
            {errors.apiToken && <p className="text-xs text-destructive">{errors.apiToken}</p>}
          </div>
        </FieldRow>

        <FieldRow label="Sender ID" hint="Nom qui apparaît comme expéditeur (max 11 car.)">
          <div className="space-y-1">
            <Input
              placeholder="CSP"
              maxLength={11}
              value={senderId}
              onChange={(e) => {
                setSenderId(e.target.value);
                setErrors((prev) => ({ ...prev, senderId: undefined }));
              }}
            />
            {errors.senderId && <p className="text-xs text-destructive">{errors.senderId}</p>}
          </div>
        </FieldRow>

        <FieldRow label="URL de l'API">
          <div className="space-y-1">
            <Input
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setErrors((prev) => ({ ...prev, baseUrl: undefined }));
              }}
            />
            {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl}</p>}
          </div>
        </FieldRow>

        <FieldRow label="Coût unitaire SMS (FCFA)">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              max={1000}
              value={coutUnitaire}
              onChange={(e) => {
                setCoutUnitaire(Number(e.target.value));
                setErrors((prev) => ({ ...prev, coutUnitaire: undefined }));
              }}
              className="w-32"
            />
            {errors.coutUnitaire && <p className="text-xs text-destructive">{errors.coutUnitaire}</p>}
          </div>
        </FieldRow>

        <div className="flex gap-3 border-t pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Test d'envoi"
        description="Envoyez un SMS de test pour vérifier votre configuration."
        icon={<TestTube2 className="h-5 w-5" />}
        hideSave
      >
        <FieldRow label="Numéro de test" hint="Format : +225XXXXXXXXXX (10 chiffres après +225)">
          <div className="space-y-1">
            <Input
              placeholder="+2250700000000"
              value={testPhone}
              onChange={(e) => {
                setTestPhone(e.target.value);
                setErrors((prev) => ({ ...prev, testPhone: undefined }));
              }}
            />
            {errors.testPhone && <p className="text-xs text-destructive">{errors.testPhone}</p>}
          </div>
        </FieldRow>
        <Button
          onClick={handleTest}
          disabled={testing || !testPhone || !isActive || !hasExistingToken}
          variant="outline"
          className="gap-2"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
          Envoyer SMS de test
        </Button>
        {(!isActive || !hasExistingToken) && (
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Activez le service et renseignez la clé API avant de tester.
          </p>
        )}
      </SettingsSection>
    </div>
  );
}
