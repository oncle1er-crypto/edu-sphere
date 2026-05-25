import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Save } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SubjectsVolumes() {
  const { matieres } = useMatieres();
  const { classes } = useClasses();
  const { ecoleId } = useEcoleId();
  const [vols, setVols] = useState<Record<string, number>>({}); // key: classe_id|matiere_id
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("classe_matieres").select("classe_id, matiere_id, volume_horaire_hebdo").eq("ecole_id", ecoleId);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[`${r.classe_id}|${r.matiere_id}`] = Number(r.volume_horaire_hebdo) || 0; });
      setVols(map);
      setLoading(false);
    })();
  }, [ecoleId]);

  const change = (classe_id: string, matiere_id: string, v: number) => {
    const key = `${classe_id}|${matiere_id}`;
    setVols((p) => ({ ...p, [key]: v }));
    setDirty((d) => new Set(d).add(key));
  };

  const saveAll = async () => {
    if (!ecoleId || dirty.size === 0) return;
    setSaving(true);
    let ok = 0, ko = 0;
    for (const key of dirty) {
      const [classe_id, matiere_id] = key.split("|");
      const { error } = await supabase.from("classe_matieres")
        .update({ volume_horaire_hebdo: vols[key] })
        .eq("ecole_id", ecoleId).eq("classe_id", classe_id).eq("matiere_id", matiere_id);
      if (error) ko++; else ok++;
    }
    setSaving(false);
    setDirty(new Set());
    toast.success(`${ok} volume(s) sauvegardé(s)${ko ? `, ${ko} échec(s)` : ""}`);
  };

  // n'afficher que les couples affectés
  const cells = matieres.map((m) => ({
    matiere: m,
    classes: classes.filter((c) => vols[`${c.id}|${m.id}`] !== undefined),
  })).filter((r) => r.classes.length > 0);

  return (
    <SettingsSection
      icon={<Clock className="h-5 w-5" />}
      title="Volumes horaires hebdomadaires"
      description="Heures d'enseignement par matière et par classe (basé sur les affectations)."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer ({dirty.size})
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : cells.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune affectation matière-classe. Créez-les d'abord dans "Affectation aux classes".</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-center">Heures / semaine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cells.flatMap(({ matiere, classes: cs }) => cs.map((c) => {
                const key = `${c.id}|${matiere.id}`;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${matiere.couleur || "bg-primary"}`} />
                        {matiere.nom}
                      </div>
                    </TableCell>
                    <TableCell>{c.nom}</TableCell>
                    <TableCell className="text-center">
                      <Input type="number" min={0} value={vols[key] ?? 0}
                        onChange={(e) => change(c.id, matiere.id, Number(e.target.value))}
                        className="w-20 mx-auto h-8 text-center" />
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
