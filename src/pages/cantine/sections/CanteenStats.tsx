import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { aggregateByMonth, buildRollingSixMonths } from "@/lib/dateBuckets";

export default function CanteenStats() {
  const { ecoleId } = useEcoleId();
  const { keepClasse } = useNiveauFilters();
  const [loading, setLoading] = useState(true);
  const [repasParMois, setRepasParMois] = useState<{ mois: string; nb: number }[]>([]);
  const [abonnes, setAbonnes] = useState(0);
  const [incidents, setIncidents] = useState(0);
  const [alertesStock, setAlertesStock] = useState(0);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const buckets = buildRollingSixMonths();
      const [planning, ab, inc, st] = await Promise.all([
        supabase.from("cantine_planning").select("date_service, effectif_realise, effectif_inscrits").eq("ecole_id", ecoleId).gte("date_service", buckets[0].from).lte("date_service", buckets.at(-1)!.to),
        supabase.from("abonnements_cantine").select("id, eleves(classe_id)").eq("ecole_id", ecoleId).eq("statut", "actif"),
        supabase.from("cantine_incidents").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
        supabase.from("stocks_cantine").select("quantite, seuil_alerte").eq("ecole_id", ecoleId),
      ]);
      const arr = aggregateByMonth(
        (planning.data ?? []) as any[], buckets, (r) => r.date_service,
        (r) => Number(r.effectif_realise) || Number(r.effectif_inscrits) || 0
      ).map((bucket) => ({ mois: bucket.label, nb: bucket.value }));
      setRepasParMois(arr);
      setAbonnes(((ab.data ?? []) as any[]).filter((a) => keepClasse(a.eleves?.classe_id)).length);
      setIncidents(inc.count ?? 0);
      setAlertesStock(((st.data ?? []) as any[]).filter((x) => Number(x.quantite) <= Number(x.seuil_alerte ?? 0)).length);
      setLoading(false);

    })();
  }, [ecoleId, keepClasse]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  const maxRepas = Math.max(1, ...repasParMois.map((r) => r.nb));

  return (
    <SettingsSection title="Statistiques cantine" description="Indicateurs calculés à partir des données réelles." icon={<BarChart3 className="h-5 w-5" />} hideSave>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Repas servis (6 derniers mois)</h3>
            {repasParMois.every((r) => r.nb === 0) ? (
              <p className="text-sm text-muted-foreground">Aucun service enregistré dans le planning.</p>
            ) : (
              <div className="space-y-2">
                {repasParMois.map((r) => (
                  <div key={r.mois}>
                    <div className="flex justify-between text-xs mb-1"><span>{r.mois}</span><span className="font-semibold">{r.nb.toLocaleString("fr-FR")}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(r.nb / maxRepas) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Indicateurs clés</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>Abonnés actifs</span><span className="font-semibold">{abonnes}</span></li>
              <li className="flex justify-between"><span>Incidents enregistrés</span><span className="font-semibold">{incidents}</span></li>
              <li className="flex justify-between border-t pt-2"><span>Produits sous le seuil d'alerte</span><span className="font-semibold text-primary">{alertesStock}</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
