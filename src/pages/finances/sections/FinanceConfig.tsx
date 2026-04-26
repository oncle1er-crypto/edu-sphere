import { Settings2, Wallet } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const tuitionByLevel = [
  { level: "Maternelle", amount: 60000 },
  { level: "Primaire", amount: 75000 },
  { level: "Collège", amount: 150000 },
  { level: "Lycée", amount: 225000 },
  { level: "Université", amount: 350000 },
];

const paymentMethods = [
  { id: "cash", label: "Espèces" },
  { id: "momo", label: "MTN Mobile Money" },
  { id: "om", label: "Orange Money" },
  { id: "bank", label: "Virement bancaire" },
  { id: "stripe", label: "Carte bancaire (Stripe)" },
  { id: "check", label: "Chèque" },
];

export default function FinanceConfig() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Frais de scolarité par cycle"
        description="Montants trimestriels facturés automatiquement aux familles."
        icon={<Wallet className="h-5 w-5" />}
      >
        {tuitionByLevel.map((t) => (
          <FieldRow key={t.level} label={t.level}>
            <div className="flex items-center gap-2">
              <Input type="number" defaultValue={t.amount} className="w-40" />
              <span className="text-sm text-muted-foreground">FCFA / trimestre</span>
            </div>
          </FieldRow>
        ))}
      </SettingsSection>

      <SettingsSection
        title="Numérotation & paiements"
        description="Préfixes de documents et modes acceptés."
        icon={<Settings2 className="h-5 w-5" />}
      >
        <FieldRow label="Devise">
          <Select defaultValue="XAF">
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">Franc CFA (FCFA)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="USD">Dollar US ($)</SelectItem>
              <SelectItem value="MAD">Dirham (DH)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Préfixe facture">
          <Input defaultValue="FAC-2025-" className="w-40" />
        </FieldRow>
        <FieldRow label="Préfixe reçu">
          <Input defaultValue="REC-2025-" className="w-40" />
        </FieldRow>
        <FieldRow label="Préfixe dépense">
          <Input defaultValue="DEP-" className="w-40" />
        </FieldRow>
        <FieldRow label="Modes de paiement acceptés">
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox id={m.id} defaultChecked={["cash", "momo", "om", "bank"].includes(m.id)} />
                <Label htmlFor={m.id} className="text-sm cursor-pointer">{m.label}</Label>
              </div>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Pénalité de retard (%)">
          <Input type="number" defaultValue={5} className="w-32" />
        </FieldRow>
        <FieldRow label="Rappel auto J-3 avant échéance">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Génération auto des reçus">
          <Switch defaultChecked />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
