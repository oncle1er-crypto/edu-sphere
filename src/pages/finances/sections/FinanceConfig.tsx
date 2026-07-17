import { Settings2, Info, Save, Loader2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useFinanceSettings, type FinanceSettingsData } from "@/hooks/useFinanceSettings";
import { fcfa } from "../scolarite-data";
import GrilleTarifaireSection from "../components/GrilleTarifaireSection";
import GrilleServicesSection from "../components/GrilleServicesSection";

const paymentMethods = [
  { id: "cash", label: "Espèces" },
  { id: "momo", label: "MTN Mobile Money" },
  { id: "om", label: "Orange Money" },
  { id: "wave", label: "Wave" },
  { id: "moov", label: "Moov Money" },
  { id: "bank", label: "Virement bancaire" },
  { id: "check", label: "Chèque" },
];

export default function FinanceConfig() {
  const { settings, isLoading, save, isSaving } = useFinanceSettings();
  const [form, setForm] = useState<FinanceSettingsData>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = <K extends keyof FinanceSettingsData>(k: K, v: FinanceSettingsData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleMode = (id: string, checked: boolean) => {
    const current = form.modes_paiement ?? [];
    update("modes_paiement", checked ? [...new Set([...current, id])] : current.filter((m) => m !== id));
  };

  const handleSave = () => {
    save({
      devise: form.devise,
      prefixe_facture: form.prefixe_facture,
      prefixe_recu: form.prefixe_recu,
      modes_paiement: form.modes_paiement,
      penalite_retard: Number(form.penalite_retard) || 0,
      rappel_auto: form.rappel_auto,
      taux_tva: Number(form.taux_tva) || 0,
      banque: form.banque,
      rib: form.rib,
      numero_momo: form.numero_momo,
      numero_om: form.numero_om,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ─── Grille tarifaire scolarité (CRUD en base) ─── */}
      <GrilleTarifaireSection />

      {/* ─── Grille tarifaire Cantine (CRUD en base) ─── */}
      <GrilleServicesSection serviceType="cantine" />

      {/* ─── Grille tarifaire Transport / Car (CRUD en base) ─── */}
      <GrilleServicesSection serviceType="transport" />

      {/* ─── Numérotation & paiements ─── */}
      <SettingsSection
        title="Numérotation & paiements"
        description="Préfixes de documents, modes de paiement acceptés et coordonnées de règlement."
        icon={<Settings2 className="h-5 w-5" />}
        hideSave
      >
        <FieldRow label="Devise">
          <Select value={form.devise} onValueChange={(v) => update("devise", v)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">Franc CFA (FCFA)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="USD">Dollar US ($)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Préfixe facture">
          <Input value={form.prefixe_facture} onChange={(e) => update("prefixe_facture", e.target.value)} className="w-40" />
        </FieldRow>
        <FieldRow label="Préfixe reçu">
          <Input value={form.prefixe_recu} onChange={(e) => update("prefixe_recu", e.target.value)} className="w-40" />
        </FieldRow>
        <FieldRow label="Modes de paiement acceptés">
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox
                  id={m.id}
                  checked={(form.modes_paiement ?? []).includes(m.id)}
                  onCheckedChange={(c) => toggleMode(m.id, !!c)}
                />
                <Label htmlFor={m.id} className="text-sm cursor-pointer">{m.label}</Label>
              </div>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="N° MTN Mobile Money">
          <Input value={form.numero_momo} onChange={(e) => update("numero_momo", e.target.value)} placeholder="+225 05 xx xx xx xx" className="w-56" />
        </FieldRow>
        <FieldRow label="N° Orange Money / Wave">
          <Input value={form.numero_om} onChange={(e) => update("numero_om", e.target.value)} placeholder="+225 07 xx xx xx xx" className="w-56" />
        </FieldRow>
        <FieldRow label="Banque">
          <Input value={form.banque} onChange={(e) => update("banque", e.target.value)} placeholder="Ex. SGCI, NSIA, BACI…" className="w-56" />
        </FieldRow>
        <FieldRow label="RIB / IBAN">
          <Input value={form.rib} onChange={(e) => update("rib", e.target.value)} placeholder="CI93 CI00 ..." className="w-80" />
        </FieldRow>
        <FieldRow label="Taux TVA (%)">
          <Input type="number" value={form.taux_tva} onChange={(e) => update("taux_tva", Number(e.target.value))} className="w-32" />
        </FieldRow>
        <FieldRow label="Pénalité de retard (%)">
          <Input type="number" value={form.penalite_retard} onChange={(e) => update("penalite_retard", Number(e.target.value))} className="w-32" />
        </FieldRow>
        <FieldRow label="Rappel auto J-3 avant échéance">
          <Switch checked={form.rappel_auto} onCheckedChange={(c) => update("rappel_auto", c)} />
        </FieldRow>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
