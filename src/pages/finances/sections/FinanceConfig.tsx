import { Settings2, Wallet, Bus, Info, Save, Loader2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useFinanceSettings, type FinanceSettingsData } from "@/hooks/useFinanceSettings";
import {
  TARIFS_SCOLARITE, TARIFS_SERVICES,
  ECHEANCES_SCOLARITE, ECHEANCES_SERVICES,
  fcfa,
} from "../scolarite-data";

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
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ─── Grille tarifaire scolarité ─── */}
      <SettingsSection
        title="Grille tarifaire — Scolarité"
        description="Tarifs indicatifs incluant inscription + scolarité annuelle + frais annexes."
        icon={<Wallet className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left py-3 px-3 font-bold text-foreground">Niveau</th>
                {ECHEANCES_SCOLARITE.map((e) => (
                  <th key={e} className="text-right py-3 px-3 font-bold text-foreground">{e}</th>
                ))}
                <th className="text-right py-3 px-3 font-extrabold text-primary">Total</th>
              </tr>
            </thead>
            <tbody>
              {TARIFS_SCOLARITE.map((t, i) => (
                <tr key={t.niveau} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="py-2.5 px-3 font-medium italic text-foreground">{t.niveau}</td>
                  {t.tranches.map((m, j) => (
                    <td key={j} className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                      {fcfa(m)}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-primary">
                    {fcfa(t.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
          <p className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span><strong>Grande Section :</strong> Ancien = {fcfa(140_000)} F / Nouveau = {fcfa(150_000)} F</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Tarifs indicatifs incluant inscription + scolarité annuelle + frais annexes.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>L'achat des papiers hygiéniques, crayons de couleur et des feutres pour la maternelle ainsi que le paquet de papiers rames et cansons sont compris dans les frais annexes, même les fêtes de l'école.</span>
          </p>
        </div>
      </SettingsSection>

      {/* ─── Grille tarifaire Car & Cantine ─── */}
      <SettingsSection
        title="Grille tarifaire — Car & Cantine"
        description="Frais de transport scolaire et de restauration par trimestre."
        icon={<Bus className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-left py-3 px-3 font-bold text-foreground">Désignation</th>
                {ECHEANCES_SERVICES.map((e) => (
                  <th key={e} className="text-right py-3 px-3 font-bold text-foreground">{e}</th>
                ))}
                <th className="text-right py-3 px-3 font-extrabold text-primary">Total</th>
              </tr>
            </thead>
            <tbody>
              {TARIFS_SERVICES.map((t, i) => (
                <tr key={t.designation} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="py-2.5 px-3 font-medium text-foreground">{t.designation}</td>
                  {t.tranches.map((m, j) => (
                    <td key={j} className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                      {fcfa(m)}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-primary">
                    {fcfa(t.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Les frais du car et de la cantine sont payés au début de chaque trimestre de préférence avant le 27 du mois antérieur. Les places sont limitées et la priorité est accordée aux plus petits et plus éloignés.</span>
          </p>
        </div>
      </SettingsSection>

      {/* ─── Numérotation & paiements ─── */}
      <SettingsSection
        title="Numérotation & paiements"
        description="Préfixes de documents et modes de paiement acceptés."
        icon={<Settings2 className="h-5 w-5" />}
      >
        <FieldRow label="Devise">
          <Select defaultValue="XAF">
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">Franc CFA (FCFA)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="USD">Dollar US ($)</SelectItem>
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
                <Checkbox id={m.id} defaultChecked={["cash", "momo", "om", "wave", "bank"].includes(m.id)} />
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
