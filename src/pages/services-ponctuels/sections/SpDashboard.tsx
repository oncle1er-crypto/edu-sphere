import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, ClipboardCheck, Shirt, TrendingUp, Clock } from "lucide-react";
import { useSpCandidats } from "../hooks/useSpCandidats";
import { useSpPaiements } from "../hooks/useSpPaiements";
import { useSpVentes } from "../hooks/useSpVentes";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };

export default function SpDashboard() {
  const { candidats } = useSpCandidats();
  const { paiements } = useSpPaiements();
  const { ventes } = useSpVentes();

  const stats = useMemo(() => {
    const today = startOfDay();
    const monthStart = startOfMonth();
    const activePaiements = paiements.filter((p) => !p.annule_le);
    const recettesJour = activePaiements
      .filter((p) => new Date(p.date_paiement) >= today)
      .reduce((s, p) => s + Number(p.montant_paye || 0), 0);
    const recettesMois = activePaiements
      .filter((p) => new Date(p.date_paiement) >= monthStart)
      .reduce((s, p) => s + Number(p.montant_paye || 0), 0);
    return {
      nbCandidats: candidats.length,
      nbPaiements: activePaiements.length,
      recettesJour, recettesMois,
      testsProgrammes: candidats.filter((c) => c.statut === "programme").length,
      tenues: ventes.filter((v) => v.statut !== "annule").reduce((s, v) => s + v.quantite, 0),
      enAttente: activePaiements.filter((p) => p.montant_paye < p.montant_du - p.remise).length,
    };
  }, [candidats, paiements, ventes]);

  const kpis = [
    { label: "Candidats", value: stats.nbCandidats, icon: Users, color: "text-primary" },
    { label: "Paiements", value: stats.nbPaiements, icon: CreditCard, color: "text-emerald-600" },
    { label: "Recettes du jour", value: fmt(stats.recettesJour), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Recettes du mois", value: fmt(stats.recettesMois), icon: TrendingUp, color: "text-primary" },
    { label: "Tests programmés", value: stats.testsProgrammes, icon: ClipboardCheck, color: "text-blue-600" },
    { label: "Tenues vendues", value: stats.tenues, icon: Shirt, color: "text-amber-600" },
    { label: "Paiements partiels", value: stats.enAttente, icon: Clock, color: "text-orange-600" },
  ];

  const dernieres = paiements.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <k.icon className={`h-8 w-8 ${k.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Dernières opérations</CardTitle></CardHeader>
        <CardContent>
          {dernieres.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune opération.</p>
          ) : (
            <div className="divide-y">
              {dernieres.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p.numero}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.date_paiement).toLocaleString("fr-FR")} — {p.mode_paiement}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{fmt(p.montant_paye)}</div>
                    {p.annule_le && <div className="text-xs text-destructive">Annulé</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
