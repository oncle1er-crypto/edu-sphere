import { Wallet } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const paymentMethods = [
  { id: "cash", label: "Espèces" },
  { id: "momo", label: "MTN Mobile Money" },
  { id: "om", label: "Orange Money" },
  { id: "bank", label: "Virement bancaire" },
  { id: "stripe", label: "Carte bancaire (Stripe)" },
  { id: "check", label: "Chèque" },
];

export default function FinanceSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Devise & taxes"
        description="Configuration monétaire de votre établissement."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Devise">
          <Select defaultValue="XAF">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">Franc CFA (FCFA)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="USD">Dollar US ($)</SelectItem>
              <SelectItem value="MAD">Dirham (DH)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Position du symbole">
          <Select defaultValue="after">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Avant (€100)</SelectItem>
              <SelectItem value="after">Après (100 FCFA)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Taux de TVA (%)">
          <Input type="number" defaultValue={0} className="w-32" />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Coordonnées bancaires"
        description="Affichées sur les factures et reçus."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Banque">
          <Input defaultValue="Afriland First Bank" />
        </FieldRow>
        <FieldRow label="Numéro de compte (RIB)">
          <Input defaultValue="10001 09876 12345678901 23" />
        </FieldRow>
        <FieldRow label="N° MTN Mobile Money">
          <Input defaultValue="+237 6 99 00 00 00" />
        </FieldRow>
        <FieldRow label="N° Orange Money">
          <Input defaultValue="+237 6 95 00 00 00" />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Facturation"
        description="Numérotation et modes de paiement acceptés."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Préfixe de facture" hint="Ex: FAC-2025-0001">
          <Input defaultValue="FAC-2025-" className="w-40" />
        </FieldRow>
        <FieldRow label="Prochain numéro">
          <Input type="number" defaultValue={142} className="w-32" />
        </FieldRow>
        <FieldRow label="Préfixe de reçu">
          <Input defaultValue="REC-2025-" className="w-40" />
        </FieldRow>
        <FieldRow label="Modes de paiement acceptés">
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox id={m.id} defaultChecked={["cash", "momo", "bank"].includes(m.id)} />
                <Label htmlFor={m.id} className="text-sm cursor-pointer">{m.label}</Label>
              </div>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Rappel de paiement automatique" hint="Email envoyé J-3 avant échéance">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Pénalité de retard (%)">
          <Input type="number" defaultValue={5} className="w-32" />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
