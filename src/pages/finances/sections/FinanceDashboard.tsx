import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp, Wallet, AlertTriangle, CheckCircle2, Clock, Users,
  Calendar, ArrowRight, GraduationCap, Loader2,
} from "lucide-react";
import { useFinanceData, fcfa } from "../useFinanceData";
import { statutEleve } from "../scolarite-data";

export default function FinanceDashboard() {
  const { data: ELEVES, loading } = useFinanceData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalAttendu = ELEVES.reduce((s, e) => s + e.fraisAnnuel, 0);
  const totalPaye = ELEVES.reduce((s, e) => s + e.totalPaye, 0);
  const totalDu = totalAttendu - totalPaye;
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalPaye / totalAttendu) * 100) : 0;

  const ajour = ELEVES.filter((e) => statutEleve(e) === "ajour").length;
  const partiel = ELEVES.filter((e) => statutEleve(e) === "partiel").length;
  const retard = ELEVES.filter((e) => statutEleve(e) === "retard").length;

  // Échéancier par tranche
  const echeancier = [1, 2, 3].map((num) => {
    const label = num === 1 ? "1ère tranche" : num === 2 ? "2ème tranche" : "3ème tranche";
    const tranches = ELEVES.flatMap((el) => el.tranches.filter((t) => t.num === num));
    const attendu = tranches.reduce((s, t) => s + t.montant, 0);
    const paye = tranches.reduce((s, t) => s + t.paye, 0);
    const enRetard = tranches.filter((t) => t.statut === "retard").length;
    const partielle = tranches.filter((t) => t.statut === "partielle").length;
    return { num, label, attendu, paye, reste: attendu - paye, enRetard, partielle, taux: attendu > 0 ? Math.round((paye / attendu) * 100) : 0 };
  });

  // Recouvrement par cycle
  const cycleNames = Array.from(new Set(ELEVES.map((e) => e.cycle)));
  const parCycle = cycleNames.map((c) => {
    const list = ELEVES.filter((e) => e.cycle === c);
    const att = list.reduce((s, e) => s + e.fraisAnnuel, 0);
    const pay = list.reduce((s, e) => s + e.totalPaye, 0);
    return { cycle: c, taux: att > 0 ? Math.round((pay / att) * 100) : 0, eleves: list.length, du: att - pay };
  });

  const topRetards = [...ELEVES]
    .filter((e) => statutEleve(e) === "retard")
    .sort((a, b) => b.resteDu - a.resteDu)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {retard > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-destructive">{retard} familles en retard de paiement</p>
                <p className="text-xs text-muted-foreground">{fcfa(totalDu)} FCFA à recouvrer</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Link to="/finances/impayes">Lancer les relances <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-[var(--shadow-card)]"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><GraduationCap className="h-3.5 w-3.5" /> Frais attendus</div>
          <p className="text-xl md:text-2xl font-bold font-display text-primary mt-2">{fcfa(totalAttendu)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">FCFA · {ELEVES.length} élèves</p>
        </CardContent></Card>
        <Card className="border shadow-[var(--shadow-card)]"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Encaissé</div>
          <p className="text-xl md:text-2xl font-bold font-display text-accent mt-2">{fcfa(totalPaye)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">FCFA · {tauxRecouvrement}%</p>
        </CardContent></Card>
        <Card className="border shadow-[var(--shadow-card)]"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-destructive" /> Reste à recouvrer</div>
          <p className="text-xl md:text-2xl font-bold font-display text-destructive mt-2">{fcfa(totalDu)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">FCFA · {retard + partiel} familles</p>
        </CardContent></Card>
        <Card className="border shadow-[var(--shadow-card)]"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Taux recouvrement</div>
          <p className="text-xl md:text-2xl font-bold font-display text-primary mt-2">{tauxRecouvrement}%</p>
          <Progress value={tauxRecouvrement} className="h-1.5 mt-2" />
        </CardContent></Card>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="font-bold font-display text-primary">Répartition des familles</h3></div>
            <Button asChild size="sm" variant="ghost"><Link to="/finances/paiements">Voir registre <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {ELEVES.length > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              <div className="bg-accent" style={{ width: `${(ajour / ELEVES.length) * 100}%` }} />
              <div className="bg-orange-500" style={{ width: `${(partiel / ELEVES.length) * 100}%` }} />
              <div className="bg-destructive" style={{ width: `${(retard / ELEVES.length) * 100}%` }} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-accent" /><div><p className="text-sm font-bold">{ajour}</p><p className="text-[11px] text-muted-foreground">À jour</p></div></div>
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-orange-500" /><div><p className="text-sm font-bold">{partiel}</p><p className="text-[11px] text-muted-foreground">Partiel</p></div></div>
            <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-destructive" /><div><p className="text-sm font-bold">{retard}</p><p className="text-[11px] text-muted-foreground">En retard</p></div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div><h3 className="font-bold font-display text-primary">Échéancier des tranches</h3></div>
          </div>
          <CardContent className="p-6 space-y-5">
            {echeancier.map((e) => (
              <div key={e.num} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{e.label}</p>
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
            <div><h3 className="font-bold font-display text-primary">Recouvrement par cycle</h3></div>
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

      {topRetards.length > 0 && (
        <Card className="border shadow-[var(--shadow-card)]">
          <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="font-bold font-display text-primary">Top des impayés</h3>
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
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.joursRetard}j</p>
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
