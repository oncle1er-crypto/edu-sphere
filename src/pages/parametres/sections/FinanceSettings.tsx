import { useState, useEffect } from "react";
import { Wallet, Save, Loader2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFinanceSettings, type FinanceSettingsData } from "@/hooks/useFinanceSettings";
import { Skeleton } from "@/components/ui/skeleton";

const PAYMENT_METHODS = [
  { id: "cash", label: "Espèces" },
  { id: "momo", label: "MTN Mobile Money" },
  { id: "om", label: "Orange Money" },
  { id: "bank", label: "Virement bancaire" },
  { id: "stripe", label: "Carte bancaire (Stripe)" },
  { id: "check", label: "Chèque" },
];

export default function FinanceSettings() {
  const { settings, isLoading, save, isSaving } = useFinanceSettings();
  const [form, setForm] = useState<FinanceSettingsData>(settings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(settings);
    setDirty(false);
  }, [settings]);

  const update = <K extends keyof FinanceSettingsData>(key: K, value: FinanceSettingsData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const togglePayment = (id: string, checked: boolean) => {
    const next = checked
      ? [...form.modes_paiement, id]
      : form.modes_paiement.filter((m) => m !== id);
    update("modes_paiement", next);
  };

  const handleSave = () => save(form);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Devise & taxes"
        description="Configuration monétaire de votre établissement."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Devise">
          <Select value={form.devise} onValueChange={(v) => update("devise", v)}>
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
          <Select value={form.position_symbole} onValueChange={(v) => update("position_symbole", v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Avant (€100)</SelectItem>
              <SelectItem value="after">Après (100 FCFA)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Taux de TVA (%)">
          <Input
            type="number"
            value={form.taux_tva}
            onChange={(e) => update("taux_tva", Number(e.target.value))}
            className="w-32"
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Coordonnées bancaires"
        description="Affichées sur les factures et reçus."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Banque">
          <Input value={form.banque} onChange={(e) => update("banque", e.target.value)} />
        </FieldRow>
        <FieldRow label="Numéro de compte (RIB)">
          <Input value={form.rib} onChange={(e) => update("rib", e.target.value)} />
        </FieldRow>
        <FieldRow label="N° MTN Mobile Money">
          <Input value={form.numero_momo} onChange={(e) => update("numero_momo", e.target.value)} />
        </FieldRow>
        <FieldRow label="N° Orange Money">
          <Input value={form.numero_om} onChange={(e) => update("numero_om", e.target.value)} />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Facturation"
        description="Numérotation et modes de paiement acceptés."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Préfixe de facture" hint="Ex: FAC-2025-0001">
          <Input value={form.prefixe_facture} onChange={(e) => update("prefixe_facture", e.target.value)} className="w-40" />
        </FieldRow>
        <FieldRow label="Prochain numéro">
          <Input
            type="number"
            value={form.prochain_numero_facture}
            onChange={(e) => update("prochain_numero_facture", Number(e.target.value))}
            className="w-32"
          />
        </FieldRow>
        <FieldRow label="Préfixe de reçu">
          <Input value={form.prefixe_recu} onChange={(e) => update("prefixe_recu", e.target.value)} className="w-40" />
        </FieldRow>
        <FieldRow label="Modes de paiement acceptés">
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox
                  id={`pm-${m.id}`}
                  checked={form.modes_paiement.includes(m.id)}
                  onCheckedChange={(checked) => togglePayment(m.id, !!checked)}
                />
                <Label htmlFor={`pm-${m.id}`} className="text-sm cursor-pointer">{m.label}</Label>
              </div>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Rappel de paiement automatique" hint="Email envoyé J-3 avant échéance">
          <Switch checked={form.rappel_auto} onCheckedChange={(v) => update("rappel_auto", v)} />
        </FieldRow>
        <FieldRow label="Pénalité de retard (%)">
          <Input
            type="number"
            value={form.penalite_retard}
            onChange={(e) => update("penalite_retard", Number(e.target.value))}
            className="w-32"
          />
        </FieldRow>
      </SettingsSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}
