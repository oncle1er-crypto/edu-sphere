import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings2, Loader2, Save } from "lucide-react";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Params = {
  format_code_classe: string;
  capacite_defaut: number;
  effectif_min_alerte: number;
  heure_debut_cours: string;
  heure_fin_cours: string;
  duree_cours_min: number;
  alerte_classe_pleine: boolean;
  detection_conflits: boolean;
  cours_samedi: boolean;
};

const DEFAULTS: Params = {
  format_code_classe: "CL-{###}",
  capacite_defaut: 40,
  effectif_min_alerte: 15,
  heure_debut_cours: "08:00",
  heure_fin_cours: "17:00",
  duree_cours_min: 55,
  alerte_classe_pleine: true,
  detection_conflits: true,
  cours_samedi: false,
};

export default function ClassesConfig() {
  const { ecoleId } = useEcoleId();
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("parametres_classes")
        .select("*")
        .eq("ecole_id", ecoleId)
        .maybeSingle();
      if (data) {
        setParams({
          format_code_classe: data.format_code_classe,
          capacite_defaut: data.capacite_defaut,
          effectif_min_alerte: data.effectif_min_alerte,
          heure_debut_cours: (data.heure_debut_cours as string).slice(0, 5),
          heure_fin_cours: (data.heure_fin_cours as string).slice(0, 5),
          duree_cours_min: data.duree_cours_min,
          alerte_classe_pleine: data.alerte_classe_pleine,
          detection_conflits: data.detection_conflits,
          cours_samedi: data.cours_samedi,
        });
      }
      setLoading(false);
    })();
  }, [ecoleId]);

  const set = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!ecoleId) return;
    setSaving(true);
    const { error } = await supabase
      .from("parametres_classes")
      .upsert({ ecole_id: ecoleId, ...params }, { onConflict: "ecole_id" });
    setSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Paramètres sauvegardés");
  };

  return (
    <SettingsSection
      icon={<Settings2 className="h-5 w-5" />}
      title="Configuration du module"
      description="Paramètres généraux pour la gestion des classes."
    >
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <FieldRow label="Format code classe">
            <Input value={params.format_code_classe} onChange={(e) => set("format_code_classe", e.target.value)} />
          </FieldRow>
          <FieldRow label="Capacité par défaut">
            <Input type="number" value={params.capacite_defaut} onChange={(e) => set("capacite_defaut", Number(e.target.value))} className="w-32" />
          </FieldRow>
          <FieldRow label="Effectif minimum (alerte)">
            <Input type="number" value={params.effectif_min_alerte} onChange={(e) => set("effectif_min_alerte", Number(e.target.value))} className="w-32" />
          </FieldRow>
          <FieldRow label="Heure de début des cours">
            <Input type="time" value={params.heure_debut_cours} onChange={(e) => set("heure_debut_cours", e.target.value)} className="w-32" />
          </FieldRow>
          <FieldRow label="Heure de fin des cours">
            <Input type="time" value={params.heure_fin_cours} onChange={(e) => set("heure_fin_cours", e.target.value)} className="w-32" />
          </FieldRow>
          <FieldRow label="Durée d'un cours (min)">
            <Input type="number" value={params.duree_cours_min} onChange={(e) => set("duree_cours_min", Number(e.target.value))} className="w-32" />
          </FieldRow>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Alerte classe pleine</p>
                <p className="text-xs text-muted-foreground">Bloquer les inscriptions si capacité atteinte</p>
              </div>
              <Switch checked={params.alerte_classe_pleine} onCheckedChange={(v) => set("alerte_classe_pleine", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Détection automatique des conflits d'emploi du temps</p>
                <p className="text-xs text-muted-foreground">Salle, prof ou classe en double</p>
              </div>
              <Switch checked={params.detection_conflits} onCheckedChange={(v) => set("detection_conflits", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Cours le samedi</p>
                <p className="text-xs text-muted-foreground">Activer la 6ème journée d'enseignement</p>
              </div>
              <Switch checked={params.cours_samedi} onCheckedChange={(v) => set("cours_samedi", v)} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
