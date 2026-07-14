import { SettingsSection } from "@/components/settings/SettingsSection";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoles } from "@/context/EcoleContext";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function CanteenStats() {
  const { ecoles } = useEcoles();
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [state, setState] = useState({
    abonnes: 0,
    repasServis: 0,
    incidents: 0,
    tauxFreq: 0,
    parEcole: [] as { label: string; value: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    const debut = new Date();
    debut.setDate(debut.getDate() - 30);
    const debutISO = debut.toISOString().slice(0, 10);

    Promise.all([
      supabase.from("abonnements_cantine").select("ecole_id, statut"),
      supabase.from("cantine_planning").select("effectif_realise, effectif_inscrits, capacite_prevue").gte("date_service", debutISO),
      supabase.from("cantine_incidents").select("id", { count: "exact", head: true }).gte("date_incident", debutISO),
    ]).then(([abRes, plRes, incRes]) => {
      const abList = (abRes.data ?? []).filter((a: any) => a.statut === "actif");
      const abonnes = abList.length;
      const parEcoleMap: Record<string, number> = {};
      abList.forEach((a: any) => { parEcoleMap[a.ecole_id] = (parEcoleMap[a.ecole_id] ?? 0) + 1; });

      const planning = plRes.data ?? [];
      const repasServis = planning.reduce((s: number, p: any) => s + (Number(p.effectif_realise) || Number(p.effectif_inscrits) || 0), 0);
      const capaciteTotale = planning.reduce((s: number, p: any) => s + (Number(p.capacite_prevue) || 0), 0);
      const tauxFreq = capaciteTotale > 0 ? Math.round((repasServis / capaciteTotale) * 100) : 0;

      const parEcole = ecoles.map((e) => ({ label: e.nom, value: parEcoleMap[e.ecole_id] ?? 0 })).filter((r) => r.value > 0);

      setState({ abonnes, repasServis, incidents: incRes.count ?? 0, tauxFreq, parEcole });
      setLoading(false);
    });
  }, [ecoleId, ecoles]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      title="Statistiques — Cantine"
      description="Abonnés, repas servis et incidents (30 derniers jours)."
      icon={<UtensilsCrossed className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Repas servis (30j)" value={state.repasServis.toLocaleString("fr-FR")} icon={UtensilsCrossed} />
        <KpiCard label="Abonnés actifs" value={state.abonnes.toLocaleString("fr-FR")} icon={UtensilsCrossed} color="text-primary" />
        <KpiCard label="Incidents (30j)" value={state.incidents} icon={UtensilsCrossed} color="text-destructive" />
        <KpiCard label="Taux de fréquentation" value={state.tauxFreq > 0 ? `${state.tauxFreq}%` : "—"} icon={UtensilsCrossed} color="text-primary" />
      </div>
      {state.parEcole.length > 0 && (
        <BarChart title="Abonnés cantine par école" data={state.parEcole} />
      )}
    </SettingsSection>
  );
}
