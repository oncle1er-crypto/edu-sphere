import { useCards } from "@/pages/cartes/context/CardsContext";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, UtensilsCrossed, Bus, Library, UserCheck, IdCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SchoolCard } from "@/pages/cartes/components/SchoolCard";

const TYPE_CARDS = [
  { key: "eleve",        label: "Cartes élèves",      icon: GraduationCap,    color: "text-primary bg-primary/10" },
  { key: "personnel",    label: "Badges personnel",   icon: Users,            color: "text-slate-700 bg-slate-500/15" },
  { key: "cantine",      label: "Cartes cantine",     icon: UtensilsCrossed,  color: "text-amber-700 bg-amber-500/15" },
  { key: "transport",    label: "Cartes transport",   icon: Bus,              color: "text-blue-700 bg-blue-500/15" },
  { key: "bibliotheque", label: "Cartes bibliothèque",icon: Library,          color: "text-emerald-700 bg-emerald-500/15" },
  { key: "visiteur",     label: "Badges visiteurs",   icon: UserCheck,        color: "text-rose-700 bg-rose-500/15" },
] as const;

export default function CardsDashboard() {
  const { cards, countsByType } = useCards();
  const total = cards.length;
  const actives = cards.filter((c) => c.statut === "active").length;
  const perdues = cards.filter((c) => c.statut === "perdue" || c.statut === "revoquee").length;
  const recent = [...cards].sort((a, b) => b.emiseLe.localeCompare(a.emiseLe)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IdCard className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Total émises</p>
            <p className="text-2xl font-bold font-display text-primary">{total}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Cartes actives</p>
            <p className="text-2xl font-bold font-display text-emerald-700">{actives}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="h-10 w-10 rounded-lg bg-rose-500/15 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Perdues / révoquées</p>
            <p className="text-2xl font-bold font-display text-rose-700">{perdues}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {TYPE_CARDS.map((t) => (
          <Card key={t.key} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.color}`}>
                <t.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">{t.label}</p>
              <p className="text-lg font-bold font-display text-foreground">{countsByType[t.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Dernières cartes émises
        </h2>
        <div className="flex flex-wrap gap-4">
          {recent.map((c) => (
            <SchoolCard key={c.id} data={c} scale={0.9} />
          ))}
        </div>
      </div>
    </div>
  );
}
