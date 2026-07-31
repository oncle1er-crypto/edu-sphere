import { useState, useEffect, useMemo } from "react";
import { Wallet, Save, Loader2, AlertTriangle, Info } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFinanceSettings, type FinanceSettingsData } from "@/hooks/useFinanceSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { validateVentilationParams } from "@/lib/ventilationValidation";
import { toast } from "sonner";


const PAYMENT_METHODS = [
  { id: "cash", label: "Espèces" },
  { id: "momo", label: "MTN Mobile Money" },
  { id: "om", label: "Orange Money" },
  { id: "bank", label: "Virement bancaire" },
  { id: "stripe", label: "Carte bancaire (Stripe)" },
  { id: "check", label: "Chèque" },
];

const VENT_FIELDS = ["frais_inscription", "frais_uniformes", "frais_activites"] as const;

export default function FinanceSettings() {
  const { settings, isLoading, save, isSaving } = useFinanceSettings();
  const { ecoleId } = useEcoleId();
  const [form, setForm] = useState<FinanceSettingsData>(settings);
  const [dirty, setDirty] = useState(false);
  const [raw, setRaw] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(settings);
    setRaw({
      frais_inscription: String(settings.frais_inscription ?? ""),
      frais_uniformes: String(settings.frais_uniformes ?? ""),
      frais_activites: String(settings.frais_activites ?? ""),
    });
    setDirty(false);
  }, [settings]);

  // Plus petit total annuel de la grille tarifaire (garde-fou anti-solde négatif)
  const { data: tarifMin } = useQuery({
    queryKey: ["frais_scolarite_min", ecoleId],
    enabled: !!ecoleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("frais_scolarite")
        .select("libelle, montant_annuel")
        .eq("ecole_id", ecoleId!)
        .order("montant_annuel", { ascending: true })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      return row ? { total: Number(row.montant_annuel), libelle: row.libelle as string } : null;
    },
  });

  const update = <K extends keyof FinanceSettingsData>(key: K, value: FinanceSettingsData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateVent = (key: (typeof VENT_FIELDS)[number], value: string) => {
    setRaw((prev) => ({ ...prev, [key]: value }));
    setForm((prev) => ({ ...prev, [key]: Number(value) }));
    setDirty(true);
  };

  const validation = useMemo(
    () =>
      validateVentilationParams(
        {
          frais_inscription: raw.frais_inscription ?? form.frais_inscription,
          frais_uniformes: raw.frais_uniformes ?? form.frais_uniformes,
          frais_activites: raw.frais_activites ?? form.frais_activites,
        },
        { totalMinScolarite: tarifMin?.total ?? null, totalMinLabel: tarifMin?.libelle },
      ),
    [raw, form.frais_inscription, form.frais_uniformes, form.frais_activites, tarifMin],
  );

  const togglePayment = (id: string, checked: boolean) => {
    const next = checked
      ? [...form.modes_paiement, id]
      : form.modes_paiement.filter((m) => m !== id);
    update("modes_paiement", next);
  };

  const handleSave = () => {
    if (!validation.ok) {
      toast.error("Ventilation incohérente", { description: validation.errors[0].message });
      return;
    }
    save({
      ...form,
      frais_inscription: Number(form.frais_inscription) || 0,
      frais_uniformes: Number(form.frais_uniformes) || 0,
      frais_activites: Number(form.frais_activites) || 0,
    });
  };


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

      <SettingsSection
        title="Composition & ventilation de la scolarité"
        description="Répartition automatique des encaissements : Frais d'inscription → Frais de scolarité → Frais annexes."
        icon={<Wallet className="h-5 w-5" />}
      >
        <FieldRow label="Frais d'inscription / réinscription (FCFA)" hint="Servis en priorité par tout versement">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={raw.frais_inscription ?? ""}
              onChange={(e) => updateVent("frais_inscription", e.target.value)}
              aria-invalid={!!validation.byField.frais_inscription}
              className={`w-40 ${validation.byField.frais_inscription ? "border-destructive" : ""}`}
            />
            {validation.byField.frais_inscription && (
              <p className="text-[11px] text-destructive">{validation.byField.frais_inscription}</p>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Frais d'uniformes & fournitures (FCFA)">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={raw.frais_uniformes ?? ""}
              onChange={(e) => updateVent("frais_uniformes", e.target.value)}
              aria-invalid={!!validation.byField.frais_uniformes}
              className={`w-40 ${validation.byField.frais_uniformes ? "border-destructive" : ""}`}
            />
            {validation.byField.frais_uniformes && (
              <p className="text-[11px] text-destructive">{validation.byField.frais_uniformes}</p>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Frais d'activités extrascolaires (FCFA)">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={raw.frais_activites ?? ""}
              onChange={(e) => updateVent("frais_activites", e.target.value)}
              aria-invalid={!!validation.byField.frais_activites}
              className={`w-40 ${validation.byField.frais_activites ? "border-destructive" : ""}`}
            />
            {validation.byField.frais_activites && (
              <p className="text-[11px] text-destructive">{validation.byField.frais_activites}</p>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Total frais annexes" hint="Uniformes + activités extrascolaires">
          <div className="text-sm font-bold text-primary">
            {(Number(form.frais_uniformes) + Number(form.frais_activites)).toLocaleString("fr-FR")} FCFA
          </div>
        </FieldRow>
        {tarifMin && (
          <FieldRow
            label="Frais de scolarité résiduels (tarif le plus bas)"
            hint={`${tarifMin.libelle} — ${tarifMin.total.toLocaleString("fr-FR")} FCFA`}
          >
            <div
              className={`text-sm font-bold ${
                tarifMin.total -
                  ((Number(form.frais_inscription) || 0) +
                    (Number(form.frais_uniformes) || 0) +
                    (Number(form.frais_activites) || 0)) <
                0
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {(
                tarifMin.total -
                ((Number(form.frais_inscription) || 0) +
                  (Number(form.frais_uniformes) || 0) +
                  (Number(form.frais_activites) || 0))
              ).toLocaleString("fr-FR")}{" "}
              FCFA
            </div>
          </FieldRow>
        )}

        {validation.issues.filter((i) => i.field === "global").length > 0 && (
          <div className="space-y-2 pt-2">
            {validation.issues
              .filter((i) => i.field === "global")
              .map((i, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-md border p-2.5 text-[12px] ${
                    i.level === "error"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-warning/40 bg-warning/10 text-warning-foreground"
                  }`}
                >
                  {i.level === "error" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{i.message}</span>
                </div>
              ))}
          </div>
        )}
      </SettingsSection>


      <div className="flex flex-col items-end gap-2">
        {!validation.ok && (
          <p className="text-[12px] text-destructive">
            Corrigez les incohérences de ventilation avant d'enregistrer.
          </p>
        )}
        <Button onClick={handleSave} disabled={!dirty || isSaving || !validation.ok} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les paramètres
        </Button>
      </div>

    </div>
  );
}
