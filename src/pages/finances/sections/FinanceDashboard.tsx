import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

const kpis = [
  { label: "Recettes du mois", value: "12 450 000 FCFA", change: "+18%", icon: TrendingUp, tone: "success" },
  { label: "Dépenses du mois", value: "7 820 000 FCFA", change: "+4%", icon: TrendingDown, tone: "warning" },
  { label: "Solde net", value: "4 630 000 FCFA", change: "+24%", icon: Wallet, tone: "primary" },
  { label: "Impayés", value: "1 985 000 FCFA", change: "32 élèves", icon: AlertTriangle, tone: "danger" },
];

const recentTransactions = [
  { id: "TX-1042", student: "Mballa Junior", amount: "75 000", method: "MTN MoMo", status: "Encaissé", date: "Aujourd'hui" },
  { id: "TX-1041", student: "Nguemo Sarah", amount: "150 000", method: "Virement", status: "Encaissé", date: "Aujourd'hui" },
  { id: "TX-1040", student: "Tchoumi Paul", amount: "75 000", method: "Espèces", status: "Encaissé", date: "Hier" },
  { id: "TX-1039", student: "Atangana Léa", amount: "75 000", method: "Orange Money", status: "En attente", date: "Hier" },
  { id: "TX-1038", student: "Kamga Yves", amount: "150 000", method: "Stripe", status: "Encaissé", date: "Il y a 2j" },
];

const collectionByLevel = [
  { level: "Maternelle", collected: 92, total: 100 },
  { level: "Primaire", collected: 87, total: 100 },
  { level: "Collège", collected: 78, total: 100 },
  { level: "Lycée", collected: 71, total: 100 },
  { level: "Université", collected: 64, total: 100 },
];

const toneClass: Record<string, string> = {
  success: "bg-accent/15 text-accent",
  warning: "bg-orange-500/15 text-orange-600",
  primary: "bg-primary/15 text-primary",
  danger: "bg-destructive/15 text-destructive",
};

export default function FinanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClass[k.tone]}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs">{k.change}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold font-display text-primary mt-1">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h3 className="font-bold font-display text-primary">Taux de recouvrement par cycle</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Trimestre en cours</p>
          </div>
          <CardContent className="p-6 space-y-4">
            {collectionByLevel.map((c) => (
              <div key={c.level}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.level}</span>
                  <span className="text-muted-foreground">{c.collected}%</span>
                </div>
                <Progress value={c.collected} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg">
            <h3 className="font-bold font-display text-primary">Transactions récentes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">5 derniers mouvements</p>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.student}</p>
                    <p className="text-xs text-muted-foreground">{t.id} · {t.method} · {t.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{t.amount} FCFA</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {t.status === "Encaissé" ? (
                        <CheckCircle2 className="h-3 w-3 text-accent" />
                      ) : (
                        <Clock className="h-3 w-3 text-orange-500" />
                      )}
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
