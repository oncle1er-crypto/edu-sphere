import { useEffect, useMemo, useState } from "react";
import { Wallet, AlertTriangle, Info, Save, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useFinanceSettings } from "@/hooks/useFinanceSettings";
import { validateVentilationParams } from "@/lib/ventilationValidation";

const FIELDS = [
  { key: "frais_inscription", label: "Frais d'inscription / réinscription (FCFA)", hint: "Servis en priorité par tout versement" },
  { key: "frais_uniformes", label: "Frais d'uniformes & fournitures (FCFA)" },
  { key: "frais_activites", label: "Frais d'activités extrascolaires (FCFA)" },
] as const;

/**
 * Section "Composition & ventilation de la scolarité" réutilisable
 * (Finances → Configuration et Paramètres → Finances).
 */
export default function VentilationSettingsSection() {
  const { settings, isLoading, save, isSaving } = useFinanceSettings();
  const { ecoleId } = useEcoleId();
  const [raw, setRaw] = useState<Record<string, string>>({});

  useEffect(() => {
    setRaw({
      frais_inscription: String(settings.frais_inscription ?? ""),
      frais_uniformes: String(settings.frais_uniformes ?? ""),
      frais_activites: String(settings.frais_activites ?? ""),
    });
  }, [settings]);

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

  const validation = useMemo(
    () => validateVentilationParams(raw, { totalMinScolarite: tarifMin?.total ?? null, totalMinLabel: tarifMin?.libelle }),
    [raw, tarifMin],
  );

  const n = (k: string) => Number(raw[k]) || 0;
  const socle = n("frais_inscription") + n("frais_uniformes") + n("frais_activites");

  const handleSave = () => {
    if (!validation.ok) {
      toast.error("Ventilation incohérente", { description: validation.errors[0].message });
      return;
    }
    save({
      frais_inscription: n("frais_inscription"),
      frais_uniformes: n("frais_uniformes"),
      frais_activites: n("frais_activites"),
    });
  };

  if (isLoading) return null;

  return (
    <SettingsSection
      title="Composition & ventilation de la scolarité"
      description="Répartition automatique des encaissements : Frais d'inscription → Frais de scolarité → Frais annexes (uniformes, activités)."
      icon={<Wallet className="h-5 w-5" />}
      hideSave
    >
      {FIELDS.map((f) => (
        <FieldRow key={f.key} label={f.label} hint={"hint" in f ? f.hint : undefined}>
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={raw[f.key] ?? ""}
              onChange={(e) => setRaw((p) => ({ ...p, [f.key]: e.target.value }))}
              aria-invalid={!!validation.byField[f.key]}
              className={`w-40 ${validation.byField[f.key] ? "border-destructive" : ""}`}
            />
            {validation.byField[f.key] && <p className="text-[11px] text-destructive">{validation.byField[f.key]}</p>}
          </div>
        </FieldRow>
      ))}

      <FieldRow label="Total frais annexes" hint="Uniformes + activités extrascolaires">
        <div className="text-sm font-bold text-primary">
          {(n("frais_uniformes") + n("frais_activites")).toLocaleString("fr-FR")} FCFA
        </div>
      </FieldRow>

      {tarifMin && (
        <FieldRow
          label="Frais de scolarité résiduels (tarif le plus bas)"
          hint={`${tarifMin.libelle} — ${tarifMin.total.toLocaleString("fr-FR")} FCFA`}
        >
          <div className={`text-sm font-bold ${tarifMin.total - socle < 0 ? "text-destructive" : "text-foreground"}`}>
            {(tarifMin.total - socle).toLocaleString("fr-FR")} FCFA
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

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving || !validation.ok}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer la ventilation
        </Button>
      </div>
    </SettingsSection>
  );
}
