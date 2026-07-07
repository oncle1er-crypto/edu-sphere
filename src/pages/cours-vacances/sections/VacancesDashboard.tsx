import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useVacancesData } from "../hooks/useVacances";
import { Users, Wallet, AlertCircle, GraduationCap, Receipt, TrendingUp, BookOpen } from "lucide-react";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

function Kpi({ label, value, icon: Icon, color = "text-primary" }: any) {
  return (
    <Card className="border shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function VacancesDashboard() {
  const { classes, eleves, paiements, enseignants, honoraires, loading } = useVacancesData();

  const stats = useMemo(() => {
    const totalEncaisse = paiements.reduce((s, p) => s + Number(p.montant_paye || 0), 0);
    const impayes = eleves.filter((e) => e.statut_paiement !== "paye").length;
    const honorairesPrevu = enseignants.reduce((s, e) => s + Number(e.honoraire_prevu || 0), 0);
    const honorairesPayes = honoraires.reduce((s, h) => s + Number(h.montant || 0), 0);
    const parClasse = classes.map((c) => ({
      nom: c.nom, count: eleves.filter((e) => e.classe_id === c.id).length,
    }));
    return { totalEncaisse, impayes, honorairesPrevu, honorairesPayes, parClasse, net: totalEncaisse - honorairesPayes };
  }, [classes, eleves, paiements, enseignants, honoraires]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Élèves inscrits" value={eleves.length} icon={Users} />
        <Kpi label="Classes ouvertes" value={classes.filter(c => c.actif).length} icon={BookOpen} />
        <Kpi label="Total encaissé" value={fmt(stats.totalEncaisse)} icon={Wallet} color="text-emerald-600" />
        <Kpi label="Impayés" value={stats.impayes} icon={AlertCircle} color="text-destructive" />
        <Kpi label="Maîtres" value={enseignants.length} icon={GraduationCap} />
        <Kpi label="Honoraires prévus" value={fmt(stats.honorairesPrevu)} icon={Receipt} />
        <Kpi label="Honoraires payés" value={fmt(stats.honorairesPayes)} icon={Receipt} color="text-emerald-600" />
        <Kpi label="Résultat net" value={fmt(stats.net)} icon={TrendingUp} color={stats.net >= 0 ? "text-emerald-600" : "text-destructive"} />
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">Élèves par classe</h3>
          {stats.parClasse.length === 0 && <p className="text-sm text-muted-foreground">Aucune classe créée.</p>}
          <div className="space-y-2">
            {stats.parClasse.map((c) => {
              const max = Math.max(...stats.parClasse.map(x => x.count), 1);
              return (
                <div key={c.nom}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{c.nom}</span>
                    <span className="font-semibold">{c.count} élève{c.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(c.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
