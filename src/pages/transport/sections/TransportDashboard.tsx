import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Bus, Users, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function TransportDashboard() {
  const { ecoleId } = useEcoleId();
  const [stats, setStats] = useState({ lignes: 0, vehicules: 0, abonnes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const [lRes, vRes, aRes] = await Promise.all([
        supabase.from("lignes_transport").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
        supabase.from("vehicules").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
        supabase.from("abonnements_transport").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
      ]);
      setStats({ lignes: lRes.count ?? 0, vehicules: vRes.count ?? 0, abonnes: aRes.count ?? 0 });
      setLoading(false);
    })();
  }, [ecoleId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Lignes", value: stats.lignes.toString(), icon: MapPin, color: "text-primary" },
    { label: "Véhicules", value: stats.vehicules.toString(), icon: Bus, color: "text-blue-600" },
    { label: "Abonnés actifs", value: stats.abonnes.toString(), icon: Users, color: "text-emerald-600" },
  ];

  return (
    <SettingsSection icon={<LayoutDashboard className="h-5 w-5" />} title="Vue d'ensemble Transport" description="Indicateurs clés." hideSave>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-extrabold font-display">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
