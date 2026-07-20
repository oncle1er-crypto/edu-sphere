import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function CanteenStats() {
  const { ecoleId } = useEcoleId();
  const [loading, setLoading] = useState(true);
  const [repasParMois, setRepasParMois] = useState<{ mois: string; nb: number }[]>([]);
  const [abonnes, setAbonnes] = useState(0);
  const [incidents, setIncidents] = useState(0);
  const [stockValeur, setStockValeur] = useState(0);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const [planning, ab, inc, st] = await Promise.all([
        supabase.from("cantine_planning").select("date_service, nombre_eleves").eq("ecole_id", ecoleId),
        supabase.from("abonnements_cantine").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
        supabase.from("cantine_incidents").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
        supabase.from("stocks_cantine").select("quantite, prix_unitaire").eq("ecole_id", ecoleId),
      ]);
      const buckets = new Map<number, number>();
      ((planning.data ?? []) as any[]).forEach((r) => {
        const d = new Date(r.date_service);
        const key = d.getMonth();
        buckets.set(key, (buckets.get(key) ?? 0) + (Number(r.nombre_eleves) || 0));
      });
      const now = new Date().getMonth();
      const arr = Array.from({ length: 6 }, (_, i) => {
        const m = (now - 5 + i + 12) % 12;
        return { mois: MONTHS[m], nb: buckets.get(m) ?? 0 };
      });
      setRepasParMois(arr);
      setAbonnes(ab.count ?? 0);
      setIncidents(inc.count ?? 0);
      setStockValeur(((st.data ?? []) as any[]).reduce((s, x) => s + (Number(x.quantite) || 0) * (Number(x.prix_unitaire) || 0), 0));
      setLoading(false);
    })();
  }, [ecoleId]);

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
              <li className="flex justify-between border-t pt-2"><span>Valeur du stock</span><span className="font-semibold text-primary">{Math.round(stockValeur).toLocaleString("fr-FR")} FCFA</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
