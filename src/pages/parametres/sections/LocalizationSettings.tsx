import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const DEFAULTS = {
  langue: "fr", fuseau: "africa-abidjan", format_date: "dd-mm-yyyy",
  format_heure: "24h", premier_jour: "monday", separateur_decimal: "comma",
};

export default function LocalizationSettings() {
  const { ecoleId, loading: loadingId } = useEcoleId();
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { if (!loadingId) setLoading(false); return; }
    supabase.from("parametres_localisation").select("*").eq("ecole_id", ecoleId).maybeSingle()
      .then(({ data: row }) => {
        if (row) setData({
          langue: row.langue, fuseau: row.fuseau, format_date: row.format_date,
          format_heure: row.format_heure, premier_jour: row.premier_jour,
          separateur_decimal: row.separateur_decimal,
        });
        setLoading(false);
      });
  }, [ecoleId, loadingId]);

  const update = (k: keyof typeof DEFAULTS, v: string) => setData(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!ecoleId) return;
    const { error } = await supabase.from("parametres_localisation")
      .upsert({ ecole_id: ecoleId, ...data }, { onConflict: "ecole_id" });
    if (error) toast.error(error.message);
    else toast.success("Paramètres de localisation enregistrés");
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <SettingsSection
      title="Localisation & affichage"
      description="Langue, fuseau horaire et formats régionaux."
      icon={<Globe className="h-5 w-5" />}
      onSave={handleSave}
    >
      <FieldRow label="Langue de l'interface">
        <Select value={data.langue} onValueChange={v => update("langue", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Fuseau horaire">
        <Select value={data.fuseau} onValueChange={v => update("fuseau", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="africa-abidjan">Africa/Abidjan (UTC+0)</SelectItem>
            <SelectItem value="africa-dakar">Africa/Dakar (UTC+0)</SelectItem>
            <SelectItem value="africa-lagos">Africa/Lagos (UTC+1)</SelectItem>
            <SelectItem value="europe-paris">Europe/Paris (UTC+1/+2)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Format de date">
        <Select value={data.format_date} onValueChange={v => update("format_date", v)}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dd-mm-yyyy">JJ/MM/AAAA (24/04/2026)</SelectItem>
            <SelectItem value="mm-dd-yyyy">MM/JJ/AAAA (04/24/2026)</SelectItem>
            <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ (2026-04-24)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Format de l'heure">
        <Select value={data.format_heure} onValueChange={v => update("format_heure", v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 heures (14:30)</SelectItem>
            <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Premier jour de la semaine">
        <Select value={data.premier_jour} onValueChange={v => update("premier_jour", v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monday">Lundi</SelectItem>
            <SelectItem value="sunday">Dimanche</SelectItem>
            <SelectItem value="saturday">Samedi</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Séparateur décimal">
        <Select value={data.separateur_decimal} onValueChange={v => update("separateur_decimal", v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comma">Virgule (1 234,56)</SelectItem>
            <SelectItem value="dot">Point (1,234.56)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </SettingsSection>
  );
}
