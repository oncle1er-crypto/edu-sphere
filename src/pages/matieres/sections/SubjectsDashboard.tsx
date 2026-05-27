import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, Library, Layers, Clock, Users, Loader2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function SubjectsDashboard() {
  const { matieres, loading } = useMatieres();
  const { ecoleId } = useEcoleId();
  const [volume, setVolume] = useState(0);
  const [nbEns, setNbEns] = useState(0);

  useEffect(() => {
    if (!ecoleId) return;
    (async () => {
      const { data: cm } = await supabase.from("classe_matieres").select("volume_horaire_hebdo").eq("ecole_id", ecoleId);
      const total = (cm ?? []).reduce((s: number, r: any) => s + (Number(r.volume_horaire_hebdo) || 0), 0);
      setVolume(cm && cm.length ? Math.round(total / cm.length) : 0);
      const { count } = await supabase.from("enseignant_matieres").select("enseignant_id", { count: "exact", head: true }).eq("ecole_id", ecoleId);
      setNbEns(count ?? 0);
    })();
  }, [ecoleId]);

  const total = matieres.length;
  const actives = matieres.filter((m) => m.active).length;
  const categories = Array.from(new Set(matieres.map((m) => m.categorie).filter(Boolean)));

  const kpis = [
    { label: "Total matières", value: String(total), trend: `${actives} actives`, icon: Library, color: "text-primary" },
    { label: "Catégories", value: String(categories.length), trend: "Disciplines", icon: Layers, color: "text-emerald-600" },
    { label: "Volume hebdo moyen", value: `${volume} h`, trend: "Affectations classes", icon: Clock, color: "text-blue-600" },
    { label: "Affectations enseignants", value: String(nbEns), trend: "Total liaisons", icon: Users, color: "text-accent-foreground" },
  ];

  const repartition = categories.map((cat) => ({ nom: cat as string, nb: matieres.filter((m) => m.categorie === cat).length }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <SettingsSection icon={<LayoutDashboard className="h-5 w-5" />} title="Vue d'ensemble" description="Synthèse des matières enseignées." hideSave>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-2xl font-extrabold font-display">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{k.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={<Layers className="h-5 w-5" />} title="Répartition par catégorie" description="Nombre de matières par grande discipline." hideSave>
        {repartition.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune matière enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {repartition.map((r) => {
              const pct = total ? Math.round((r.nb / total) * 100) : 0;
              return (
                <div key={r.nom}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{r.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.nb}</span>
                      <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
