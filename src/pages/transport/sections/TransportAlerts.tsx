import { useEffect, useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Bell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

interface Alert {
  id: string;
  label: string;
  detail: string;
  date: string;
  jours: number;
}

const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function TransportAlerts() {
  const { ecoleId } = useEcoleId();
  const [permis, setPermis] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const [ch, mn] = await Promise.all([
        supabase.from("chauffeurs").select("id, nom, prenom, date_expiration_permis").eq("ecole_id", ecoleId).not("date_expiration_permis", "is", null),
        supabase.from("transport_maintenance" as any).select("id, type, prochaine_echeance_date, vehicules(immatriculation)").eq("ecole_id", ecoleId).not("prochaine_echeance_date", "is", null),
      ]);
      setPermis(ch.data ?? []);
      setMaint((mn as any).data ?? []);
      setLoading(false);
    })();
  }, [ecoleId]);

  const alerts = useMemo<Alert[]>(() => {
    const items: Alert[] = [];
    permis.forEach((c) => {
      const j = daysUntil(c.date_expiration_permis);
      if (j <= 60) items.push({
        id: `p-${c.id}`,
        label: `Permis ${c.nom} ${c.prenom}`,
        detail: j < 0 ? `Expiré depuis ${Math.abs(j)} j` : `Expire dans ${j} j`,
        date: c.date_expiration_permis, jours: j,
      });
    });
    maint.forEach((m: any) => {
      const j = daysUntil(m.prochaine_echeance_date);
      if (j <= 60) items.push({
        id: `m-${m.id}`,
        label: `${m.type.replace(/_/g, " ")} · ${m.vehicules?.immatriculation ?? "—"}`,
        detail: j < 0 ? `Dépassée de ${Math.abs(j)} j` : `Dans ${j} j`,
        date: m.prochaine_echeance_date, jours: j,
      });
    });
    return items.sort((a, b) => a.jours - b.jours);
  }, [permis, maint]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Alertes" description="Permis, contrôles techniques et échéances de maintenance." icon={<Bell className="h-5 w-5" />} hideSave>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune alerte active.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id} className={a.jours < 0 ? "border-destructive/50" : a.jours <= 15 ? "border-amber-500/50" : ""}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.date}</p>
                </div>
                <Badge variant={a.jours < 0 ? "destructive" : a.jours <= 15 ? "default" : "secondary"}>{a.detail}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
