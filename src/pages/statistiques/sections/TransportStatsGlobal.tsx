import { SettingsSection } from "@/components/settings/SettingsSection";
import { Bus, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoles } from "@/context/EcoleContext";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function TransportStats() {
  const { ecoles } = useEcoles();
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [state, setState] = useState({
    vehicules: 0,
    lignes: 0,
    transportes: 0,
    remplissage: 0,
    parEcole: [] as { label: string; value: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    Promise.all([
      supabase.from("vehicules").select("ecole_id, capacite, statut"),
      supabase.from("lignes_transport").select("id", { count: "exact", head: true }),
      supabase.from("abonnements_transport").select("ecole_id, statut"),
    ]).then(([vRes, lRes, abRes]) => {
      const veh = (vRes.data ?? []).filter((v: any) => v.statut === "actif");
      const capaciteTotale = veh.reduce((s: number, v: any) => s + (Number(v.capacite) || 0), 0);
      const abActifs = (abRes.data ?? []).filter((a: any) => a.statut === "actif");
      const transportes = abActifs.length;
      const remplissage = capaciteTotale > 0 ? Math.min(100, Math.round((transportes / capaciteTotale) * 100)) : 0;

      const parEcoleMap: Record<string, number> = {};
      abActifs.forEach((a: any) => { parEcoleMap[a.ecole_id] = (parEcoleMap[a.ecole_id] ?? 0) + 1; });
      const parEcole = ecoles.map((e) => ({ label: e.nom, value: parEcoleMap[e.ecole_id] ?? 0 })).filter((r) => r.value > 0);

      setState({ vehicules: veh.length, lignes: lRes.count ?? 0, transportes, remplissage, parEcole });
      setLoading(false);
    });
  }, [ecoleId, ecoles]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      title="Statistiques — Transport"
      description="Flotte, lignes et taux de remplissage."
      icon={<Bus className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Véhicules actifs" value={state.vehicules} icon={Bus} />
        <KpiCard label="Lignes actives" value={state.lignes} icon={Bus} color="text-primary" />
        <KpiCard label="Élèves transportés" value={state.transportes.toLocaleString("fr-FR")} icon={Bus} />
        <KpiCard label="Taux de remplissage" value={state.remplissage > 0 ? `${state.remplissage}%` : "—"} icon={Bus} color="text-primary" />
      </div>
      {state.parEcole.length > 0 && (
        <BarChart title="Élèves transportés par école" data={state.parEcole} />
      )}
    </SettingsSection>
  );
}
