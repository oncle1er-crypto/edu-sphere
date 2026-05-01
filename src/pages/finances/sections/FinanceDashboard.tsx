import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp, Wallet, AlertTriangle, CheckCircle2, Clock, Users,
  Calendar, ArrowRight, GraduationCap, Receipt as ReceiptIcon,
} from "lucide-react";
import { ELEVES_SCOLARITE, getEcheancier, statutEleve, fcfa } from "../scolarite-data";

export default function FinanceDashboard() {
  // Calculs scolarité consolidés
  const totalAttendu = ELEVES_SCOLARITE.reduce((s, e) => s + e.fraisAnnuel, 0);
  const totalPaye = ELEVES_SCOLARITE.reduce((s, e) => s + e.totalPaye, 0);
  const totalDu = totalAttendu - totalPaye;
  const tauxRecouvrement = Math.round((totalPaye / totalAttendu) * 100);

  const ajour = ELEVES_SCOLARITE.filter((e) => statutEleve(e) === "ajour").length;
  const partiel = ELEVES_SCOLARITE.filter((e) => statutEleve(e) === "partiel").length;
  const retard = ELEVES_SCOLARITE.filter((e) => statutEleve(e) === "retard").length;

  const echeancier = getEcheancier();

  // Recouvrement par cycle
  const cycles = ["Maternelle", "Primaire", "Collège", "Lycée"] as const;
  const parCycle = cycles.map((c) => {
    const list = ELEVES_SCOLARITE.filter((e) => e.cycle === c);
    const att = list.reduce((s, e) => s + e.fraisAnnuel, 0);
    const pay = list.reduce((s, e) => s + e.totalPaye, 0);
    return { cycle: c, taux: att > 0 ? Math.round((pay / att) * 100) : 0, eleves: list.length, du: att - pay };
  });

  const topRetards = [...ELEVES_SCOLARITE]
    .filter((e) => statutEleve(e) === "retard")
    .sort((a, b) => b.resteDu - a.resteDu)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Bandeau d'alerte global */}
      {retard > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-destructive">{retard} familles en retard de paiement</p>
                <p className="text-xs text-muted-foreground">{fcfa(totalDu)} FCFA à recouvrer · prochaine échéance critique 15/04/2026</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Link to="/finances/impayes">Lancer les relances <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" /> Frais attendus (année)
            </div>
            <p className="text-xl md:text-2xl font-bold font-display text-primary mt-2">{fcfa(totalAttendu)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">FCFA · {ELEVES_SCOLARITE.length} élèves inscrits</p>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Encaissé
            </div>
            <p className="text-xl md:text-2xl font-bold font-display text-accent mt-2">{fcfa(totalPaye)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">FCFA · {tauxRecouvrement}% du total</p>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 text-destructive" /> Reste à recouvrer
            </div>
            <p className="text-xl md:text-2xl font-bold font-display text-destructive mt-2">{fcfa(totalDu)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">FCFA · {retard + partiel} familles concernées</p>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Taux recouvrement
            </div>
            <p className="text-xl md:text-2xl font-bold font-display text-primary mt-2">{tauxRecouvrement}%</p>
            <Progress value={tauxRecouvrement} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Statuts familles - barre tricolore */}
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-bold font-display text-primary">Répartition des familles</h3>
            </div>
            <Button asChild size="sm" variant="ghost"><Link to="/finances/paiements">Voir registre <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div className="bg-accent" style={{ width: `${(ajour / ELEVES_SCOLARITE.length) * 100}%` }} />
            <div className="bg-orange-500" style={{ width: `${(partiel / ELEVES_SCOLARITE.length) * 100}%` }} />
            <div className="bg-destructive" style={{ width: `${(retard / ELEVES_SCOLARITE.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-accent" /><div><p className="text-sm font-bold">{ajour}</p><p className="text-[11px] text-muted-foreground">À jour</p></div></div>
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-orange-500" /><div><p className="text-sm font-bold">{partiel}</p><p className="text-[11px] text-muted-foreground">Paiement partiel</p></div></div>
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-destructive" /><div><p className="text-sm font-bold">{retard}</p><p className="text-[11px] text-muted-foreground">En retard</p></div></div>
          </div>
        </CardContent>
      </Card>

      {/* Échéancier des tranches + recouvrement par cycle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-bold font-display text-primary">Échéancier des tranches</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Année scolaire 2025-2026</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-5">
            {echeancier.map((e) => (
              <div key={e.num} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{e.label}</p>
                    <p className="text-[11px] text-muted-foreground">Échéance : {e.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{e.taux}%</p>
                    <p className="text-[11px] text-muted-foreground">{fcfa(e.paye)} / {fcfa(e.attendu)}</p>
                  </div>
                </div>
                <Progress value={e.taux} className="h-2" />
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  {e.enRetard > 0 && <span className="text-destructive font-semibold">⚠ {e.enRetard} en retard</span>}
                  {e.partielle > 0 && <span className="text-orange-600 font-semibold">◐ {e.partielle} partielle</span>}
                  <span className="ml-auto">Reste : <strong className="text-foreground">{fcfa(e.reste)} FCFA</strong></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-bold font-display text-primary">Recouvrement par cycle</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Performance pédagogique</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {parCycle.map((c) => (
              <div key={c.cycle}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.cycle} <span className="text-xs text-muted-foreground">({c.eleves})</span></span>
                  <span className={c.taux >= 90 ? "text-accent font-bold" : c.taux >= 70 ? "text-orange-600 font-bold" : "text-destructive font-bold"}>{c.taux}%</span>
                </div>
                <Progress value={c.taux} className="h-2" />
                <p className="text-[11px] text-muted-foreground mt-1">Reste : {fcfa(c.du)} FCFA</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top retards */}
      {topRetards.length > 0 && (
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <h3 className="font-bold font-display text-primary">Top des impayés à traiter</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Familles avec le plus gros reste à payer</p>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost"><Link to="/finances/impayes">Voir tous <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {topRetards.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{e.prenom} {e.nom} <span className="text-xs text-muted-foreground font-normal">· {e.classe}</span></p>
                    <p className="text-xs text-muted-foreground">{e.parent} · {e.telephone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-destructive">{fcfa(e.resteDu)} FCFA</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.joursRetard}j de retard</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
