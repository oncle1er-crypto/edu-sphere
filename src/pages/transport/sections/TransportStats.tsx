import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";

export default function TransportStats() {
  const { ecoleId } = useEcoleId();
  const { keepClasse } = useNiveauFilters();
  const [loading, setLoading] = useState(true);
  const [conso, setConso] = useState<{ vehicule: string; litres: number; montant: number }[]>([]);
  const [abonnes, setAbonnes] = useState(0);
  const [incidents, setIncidents] = useState(0);
  const [litresTotal, setLitresTotal] = useState(0);
  const [coutTotal, setCoutTotal] = useState(0);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const [carb, ab, inc] = await Promise.all([
        supabase.from("transport_carburant" as any).select("litres, montant, vehicules(immatriculation)").eq("ecole_id", ecoleId),
        supabase.from("abonnements_transport").select("id, eleves(classe_id)").eq("ecole_id", ecoleId).eq("statut", "actif"),
        supabase.from("transport_incidents" as any).select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
      ]);
      const map = new Map<string, { litres: number; montant: number }>();
      let lt = 0, ct = 0;
      ((carb as any).data ?? []).forEach((r: any) => {
        const key = r.vehicules?.immatriculation ?? "—";
        const cur = map.get(key) ?? { litres: 0, montant: 0 };
        cur.litres += Number(r.litres) || 0;
        cur.montant += Number(r.montant) || 0;
        map.set(key, cur);
        lt += Number(r.litres) || 0;
        ct += Number(r.montant) || 0;
      });
      setConso(Array.from(map.entries()).map(([vehicule, v]) => ({ vehicule, ...v })).sort((a, b) => b.litres - a.litres));
      setAbonnes(ab.count ?? 0);
      setIncidents((inc as any).count ?? 0);
      setLitresTotal(lt); setCoutTotal(ct);
      setLoading(false);
    })();
  }, [ecoleId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  const maxL = Math.max(1, ...conso.map((c) => c.litres));

  return (
    <SettingsSection title="Statistiques transport" description="Indicateurs calculés à partir des données réelles." icon={<BarChart3 className="h-5 w-5" />} hideSave>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Consommation par véhicule</h3>
            {conso.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun plein enregistré.</p>
            ) : (
              <div className="space-y-2">
                {conso.map((c) => (
                  <div key={c.vehicule}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono">{c.vehicule}</span>
                      <span className="font-semibold">{Math.round(c.litres)} L · {Math.round(c.montant).toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(c.litres / maxL) * 100}%` }} />
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
              <li className="flex justify-between"><span>Total litres consommés</span><span className="font-semibold">{Math.round(litresTotal)} L</span></li>
              <li className="flex justify-between border-t pt-2"><span>Coût total carburant</span><span className="font-semibold text-primary">{Math.round(coutTotal).toLocaleString("fr-FR")} FCFA</span></li>
              {abonnes > 0 && (
                <li className="flex justify-between"><span className="text-muted-foreground">Coût carburant / abonné</span><span className="font-semibold">{Math.round(coutTotal / abonnes).toLocaleString("fr-FR")} FCFA</span></li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
