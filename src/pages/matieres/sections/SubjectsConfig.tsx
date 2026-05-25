import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2, Save } from "lucide-react";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Params = {
  echelle_defaut: number;
  note_passage_defaut: number;
  coefficient_defaut: number;
  matieres_optionnelles: boolean;
  education_religieuse: boolean;
  afficher_code_bulletin: boolean;
  verrouiller_coefficients: boolean;
};

const DEFAULTS: Params = {
  echelle_defaut: 20, note_passage_defaut: 10, coefficient_defaut: 1,
  matieres_optionnelles: true, education_religieuse: true,
  afficher_code_bulletin: true, verrouiller_coefficients: false,
};

export default function SubjectsConfig() {
  const { ecoleId } = useEcoleId();
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("parametres_matieres").select("*").eq("ecole_id", ecoleId).maybeSingle();
      if (data) setParams({
        echelle_defaut: data.echelle_defaut,
        note_passage_defaut: Number(data.note_passage_defaut),
        coefficient_defaut: Number(data.coefficient_defaut),
        matieres_optionnelles: data.matieres_optionnelles,
        education_religieuse: data.education_religieuse,
        afficher_code_bulletin: data.afficher_code_bulletin,
        verrouiller_coefficients: data.verrouiller_coefficients,
      });
      setLoading(false);
    })();
  }, [ecoleId]);

  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!ecoleId) return;
    setSaving(true);
    const { error } = await supabase.from("parametres_matieres").upsert({ ecole_id: ecoleId, ...params }, { onConflict: "ecole_id" });
    setSaving(false);
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Paramètres sauvegardés");
  };

  return (
    <SettingsSection icon={<Settings2 className="h-5 w-5" />} title="Configuration des matières" description="Paramètres généraux du module Matières.">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <FieldRow label="Échelle de notation par défaut">
            <Select value={String(params.echelle_defaut)} onValueChange={(v) => set("echelle_defaut", Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="20">/ 20 (MENA)</SelectItem>
                <SelectItem value="10">/ 10</SelectItem>
                <SelectItem value="100">/ 100</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Note minimale de passage">
            <Input type="number" step="0.5" value={params.note_passage_defaut} onChange={(e) => set("note_passage_defaut", Number(e.target.value))} className="w-24" />
          </FieldRow>
          <FieldRow label="Coefficient par défaut">
            <Input type="number" step="0.5" value={params.coefficient_defaut} onChange={(e) => set("coefficient_defaut", Number(e.target.value))} className="w-24" />
          </FieldRow>
          <FieldRow label="Activer les matières optionnelles" hint="Espagnol, Informatique, etc.">
            <Switch checked={params.matieres_optionnelles} onCheckedChange={(v) => set("matieres_optionnelles", v)} />
          </FieldRow>
          <FieldRow label="Inclure l'éducation religieuse" hint="Catéchèse — établissement catholique">
            <Switch checked={params.education_religieuse} onCheckedChange={(v) => set("education_religieuse", v)} />
          </FieldRow>
          <FieldRow label="Afficher le code matière sur les bulletins">
            <Switch checked={params.afficher_code_bulletin} onCheckedChange={(v) => set("afficher_code_bulletin", v)} />
          </FieldRow>
          <FieldRow label="Verrouiller la modification des coefficients" hint="Réservé à l'administration">
            <Switch checked={params.verrouiller_coefficients} onCheckedChange={(v) => set("verrouiller_coefficients", v)} />
          </FieldRow>
          <div className="flex justify-end pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Enregistrer
            </Button>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
