import { useState, useEffect } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

interface Config {
  format_matricule: string;
  age_min_maternelle: number;
  age_max_lycee: number;
  capacite_classe_defaut: number;
  nb_documents_obligatoires: number;
  photo_obligatoire: boolean;
  notification_sms: boolean;
  generation_carnet: boolean;
  archivage_auto: boolean;
}

const DEFAULTS: Config = {
  format_matricule: "ELV-{YYYY}-{####}",
  age_min_maternelle: 3,
  age_max_lycee: 20,
  capacite_classe_defaut: 40,
  nb_documents_obligatoires: 3,
  photo_obligatoire: true,
  notification_sms: true,
  generation_carnet: true,
  archivage_auto: true,
};

export default function StudentsConfig() {
  const { ecoleId, loading: loadingEcole } = useEcoleId();
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    setLoading(true);
    supabase
      .from("config_module_eleves")
      .select("*")
      .eq("ecole_id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            format_matricule: (data as any).format_matricule,
            age_min_maternelle: (data as any).age_min_maternelle,
            age_max_lycee: (data as any).age_max_lycee,
            capacite_classe_defaut: (data as any).capacite_classe_defaut,
            nb_documents_obligatoires: (data as any).nb_documents_obligatoires,
            photo_obligatoire: (data as any).photo_obligatoire,
            notification_sms: (data as any).notification_sms,
            generation_carnet: (data as any).generation_carnet,
            archivage_auto: (data as any).archivage_auto,
          });
        }
        setLoading(false);
      });
  }, [ecoleId]);

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!ecoleId) return;
    setSaving(true);
    const payload = { ecole_id: ecoleId, ...config } as any;
    const { error } = await supabase
      .from("config_module_eleves")
      .upsert(payload, { onConflict: "ecole_id" });

    if (error) {
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } else {
      toast.success("Configuration enregistrée avec succès");
    }
    setSaving(false);
  };

  if (loading || loadingEcole) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion des élèves."
      onSave={handleSave}
      
    >
      <FieldRow label="Format du matricule" hint="Préfixe + année + numéro">
        <Input
          value={config.format_matricule}
          onChange={(e) => set("format_matricule", e.target.value)}
        />
      </FieldRow>
      <FieldRow label="Âge minimum (Maternelle PS)">
        <Input
          type="number"
          value={config.age_min_maternelle}
          onChange={(e) => set("age_min_maternelle", parseInt(e.target.value) || 0)}
          className="w-32"
        />
      </FieldRow>
      <FieldRow label="Âge maximum (Lycée)">
        <Input
          type="number"
          value={config.age_max_lycee}
          onChange={(e) => set("age_max_lycee", parseInt(e.target.value) || 0)}
          className="w-32"
        />
      </FieldRow>
      <FieldRow label="Capacité par défaut d'une classe">
        <Input
          type="number"
          value={config.capacite_classe_defaut}
          onChange={(e) => set("capacite_classe_defaut", parseInt(e.target.value) || 0)}
          className="w-32"
        />
      </FieldRow>
      <FieldRow label="Documents obligatoires à l'inscription">
        <Select
          value={config.nb_documents_obligatoires.toString()}
          onValueChange={(v) => set("nb_documents_obligatoires", parseInt(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 documents</SelectItem>
            <SelectItem value="3">3 documents</SelectItem>
            <SelectItem value="4">4 documents</SelectItem>
            <SelectItem value="6">Tous (6)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <div className="space-y-3 pt-2">
        {[
          { key: "photo_obligatoire" as const, title: "Photo obligatoire à l'inscription", desc: "Bloquer si la photo n'est pas téléversée" },
          { key: "notification_sms" as const, title: "Notification SMS aux parents", desc: "Inscription, absence, sanction" },
          { key: "generation_carnet" as const, title: "Génération automatique du carnet", desc: "PDF imprimable après inscription" },
          { key: "archivage_auto" as const, title: "Archivage automatique des sortants", desc: "Vers la base \"Anciens élèves\"" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={config[item.key]}
              onCheckedChange={(v) => set(item.key, v)}
            />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
