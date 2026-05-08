import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSmsConfig } from "@/hooks/useSmsConfig";
import { Badge } from "@/components/ui/badge";

export default function CommunicationConfig() {
  const { config } = useSmsConfig();
  const isReady = config?.is_active && !!config?.api_token;

  return (
    <SettingsSection
      title="Configuration"
      description="Paramètres de messagerie et fournisseurs."
      icon={<Settings2 className="h-5 w-5" />}
      hideSave
    >
      <FieldRow label="Adresse expéditeur (Email)">
        <Input type="email" defaultValue="contact@laprovidence.ci" />
      </FieldRow>
      <FieldRow label="Nom expéditeur">
        <Input defaultValue="Complexe Scolaire La Providence" />
      </FieldRow>
      <FieldRow label="Fournisseur SMS">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">YellikaSMS</span>
          {isReady ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">Connecté</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Non configuré</Badge>
          )}
        </div>
      </FieldRow>
      <FieldRow label="Sender ID">
        <Input value={config?.sender_id || "—"} disabled />
      </FieldRow>
      <FieldRow label="Coût unitaire SMS (FCFA)">
        <Input type="number" value={config?.cout_unitaire ?? 25} disabled />
      </FieldRow>
      <FieldRow label="Bloquer envois nuit (20h - 7h)">
        <Switch defaultChecked />
      </FieldRow>
      <p className="text-xs text-muted-foreground">
        Modifiez la configuration SMS dans <strong>Paramètres → SMS (YellikaSMS)</strong>.
      </p>
    </SettingsSection>
  );
}
