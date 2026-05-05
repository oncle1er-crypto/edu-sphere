import { useState, useEffect } from "react";
import { Smartphone, Send, TestTube2, Loader2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSmsConfig } from "@/hooks/useSmsConfig";

export default function SmsSettings() {
  const { config, loading, save, testSms } = useSmsConfig();

  const [apiToken, setApiToken] = useState("");
  const [senderId, setSenderId] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://panel.yellikasms.com/api/v3/sms/send");
  const [isActive, setIsActive] = useState(false);
  const [coutUnitaire, setCoutUnitaire] = useState(25);
  const [testPhone, setTestPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setApiToken(config.api_token || "");
      setSenderId(config.sender_id || "");
      setBaseUrl(config.base_url || "https://panel.yellikasms.com/api/v3/sms/send");
      setIsActive(config.is_active);
      setCoutUnitaire(config.cout_unitaire);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await save({ api_token: apiToken, sender_id: senderId, base_url: baseUrl, is_active: isActive, cout_unitaire: coutUnitaire });
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setTesting(true);
    try { await testSms(testPhone); } catch {}
    setTesting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

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
          <Input
            type="password"
            placeholder="Votre clé API..."
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Sender ID" hint="Nom qui apparaît comme expéditeur (max 11 car.)">
          <Input
            placeholder="GSP"
            maxLength={11}
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
          />
        </FieldRow>

        <FieldRow label="URL de l'API">
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Coût unitaire SMS (FCFA)">
          <Input
            type="number"
            value={coutUnitaire}
            onChange={(e) => setCoutUnitaire(Number(e.target.value))}
            className="w-32"
          />
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
        <FieldRow label="Numéro de test" hint="Format international : +225XXXXXXXXXX">
          <Input
            placeholder="+2250700000000"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
        </FieldRow>
        <Button
          onClick={handleTest}
          disabled={testing || !testPhone || !isActive || !apiToken}
          variant="outline"
          className="gap-2"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
          Envoyer SMS de test
        </Button>
        {(!isActive || !apiToken) && (
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Activez le service et renseignez la clé API avant de tester.
          </p>
        )}
      </SettingsSection>
    </div>
  );
}
