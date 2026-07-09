import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { KpiCard } from "@/components/KpiCard";
import { LayoutDashboard, Users, UtensilsCrossed, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function CanteenDashboard() {
  const { ecoleId } = useEcoleId();
  const [stats, setStats] = useState({ abonnes: 0, menus: 0, stocks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const [abRes, menuRes, stockRes] = await Promise.all([
        supabase.from("abonnements_cantine").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
        supabase.from("menus_cantine").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
        supabase.from("stocks_cantine").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
      ]);
      setStats({
        abonnes: abRes.count ?? 0,
        menus: menuRes.count ?? 0,
        stocks: stockRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, [ecoleId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Abonnés actifs", value: stats.abonnes.toString(), icon: Users, color: "text-primary" },
    { label: "Menus planifiés", value: stats.menus.toString(), icon: UtensilsCrossed, color: "text-emerald-600" },
    { label: "Produits en stock", value: stats.stocks.toString(), icon: Package, color: "text-blue-600" },
  ];

  return (
    <SettingsSection icon={<LayoutDashboard className="h-5 w-5" />} title="Vue d'ensemble Cantine" description="Indicateurs clés." hideSave>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} index={i} />
        ))}
      </div>
    </SettingsSection>
  );
}
