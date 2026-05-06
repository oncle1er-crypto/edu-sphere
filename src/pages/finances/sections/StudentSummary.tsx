import { useMemo, useState } from "react";
import { Search, Users, CheckCircle2, AlertCircle, Clock, Phone, MessageSquare, Printer, Plus, FileText, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData, fcfa } from "../useFinanceData";
import { statutEleve, STATUT_LABEL, STATUT_CLASS, type Cycle } from "../scolarite-data";
import { PaymentDialog } from "../components/PaymentDialog";
import { toast } from "sonner";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège"];

export default function StudentSummary() {
  const { data: ELEVES_SCOLARITE, loading: finLoading, refetch, ecoleId } = useFinanceData();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [payTrancheNum, setPayTrancheNum] = useState<number | undefined>();
  const [payOpen, setPayOpen] = useState(false);

  const filtered = useMemo(() => {
    return ELEVES_SCOLARITE.filter((e) => {
      const s = search.toLowerCase().trim();
      const matchSearch = !s || `${e.prenom} ${e.nom} ${e.matricule} ${e.classe} ${e.parent}`.toLowerCase().includes(s);
      const matchCycle = cycle === "all" || e.cycle === cycle;
      return matchSearch && matchCycle;
    });
  }, [search, cycle, ELEVES_SCOLARITE]);

  const eleve = ELEVES_SCOLARITE.find((e) => e.id === (selectedId || ELEVES_SCOLARITE[0]?.id)) ?? ELEVES_SCOLARITE[0];

  if (finLoading || !eleve) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const st = statutEleve(eleve);
  const pct = eleve.fraisAnnuel > 0 ? Math.round((eleve.totalPaye / eleve.fraisAnnuel) * 100) : 0;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Synthèse par élève"
        description="Fiche de scolarité détaillée : tranches dues, payées, restes et statut."
        icon={<FileText className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sélecteur élève */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CYCLES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Tous cycles" : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{filtered.length} élève(s)</span>
              </div>
              <ul className="max-h-[480px] overflow-y-auto divide-y">
                {filtered.map((e) => {
                  const est = statutEleve(e);
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelectedId(e.id)}
                        className={
                          "w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-2 " +
                          (e.id === selectedId ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40 border-l-4 border-transparent")
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{e.prenom} {e.nom}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{e.classe} · {e.cycle}</p>
                        </div>
                        <div className={
                          "h-2 w-2 rounded-full shrink-0 " +
                          (est === "ajour" ? "bg-accent" : est === "partiel" ? "bg-orange-500" : "bg-destructive")
                        } />
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">Aucun résultat</li>
                )}
              </ul>
            </div>
          </div>

          {/* Fiche synthèse */}
          <div className="space-y-4">
            {/* En-tête fiche */}
            <Card className="border-2 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-display text-primary">{eleve.prenom} {eleve.nom}</h2>
                      <Badge variant="outline" className={STATUT_CLASS[st]}>
                        {st === "ajour" && <CheckCircle2 className="h-3 w-3" />}
                        {st === "partiel" && <Clock className="h-3 w-3" />}
                        {st === "retard" && <AlertCircle className="h-3 w-3" />}
                        <span className="ml-1">{STATUT_LABEL[st]}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{eleve.matricule}</span> · {eleve.classe} · {eleve.cycle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>{eleve.parent}</strong> · {eleve.telephone}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline"><Phone className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Fiche imprimée")}><Printer className="h-4 w-4" />Imprimer</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs synthèse */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border"><CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Frais annuels</p>
                <p className="text-lg font-bold font-display text-primary mt-1">{fcfa(eleve.fraisAnnuel)}</p>
                <p className="text-[10px] text-muted-foreground">FCFA</p>
              </CardContent></Card>
              <Card className="border"><CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total payé</p>
                <p className="text-lg font-bold font-display text-accent mt-1">{fcfa(eleve.totalPaye)}</p>
                <p className="text-[10px] text-muted-foreground">FCFA · {pct}%</p>
              </CardContent></Card>
              <Card className="border"><CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reste dû</p>
                <p className="text-lg font-bold font-display text-destructive mt-1">{fcfa(eleve.resteDu)}</p>
                <p className="text-[10px] text-muted-foreground">FCFA</p>
              </CardContent></Card>
              <Card className="border"><CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retard</p>
                <p className={"text-lg font-bold font-display mt-1 " + (eleve.joursRetard > 0 ? "text-destructive" : "text-accent")}>
                  {eleve.joursRetard > 0 ? `${eleve.joursRetard}j` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{eleve.derniereRelance ? `Relance: ${eleve.derniereRelance}` : "Aucune relance"}</p>
              </CardContent></Card>
            </div>

            {/* Progression globale */}
            <Card className="border">
              <CardContent className="p-5">
                <div className="flex justify-between items-baseline mb-2">
                  <p className="text-sm font-semibold">Progression annuelle</p>
                  <p className="text-2xl font-bold font-display text-primary">{pct}%</p>
                </div>
                <Progress value={pct} className="h-3" />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
                  <span>Versé : {fcfa(eleve.totalPaye)} FCFA</span>
                  <span>Total : {fcfa(eleve.fraisAnnuel)} FCFA</span>
                </div>
              </CardContent>
            </Card>

            {/* Détail tranches */}
            <Card className="border">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="font-bold font-display text-primary text-sm">Détail des 3 tranches</h3>
              </div>
              <CardContent className="p-5 space-y-4">
                {eleve.tranches.map((t) => {
                  const tpct = Math.round((t.paye / t.montant) * 100);
                  const cls =
                    t.statut === "payee" ? "bg-accent/10 border-accent/30" :
                    t.statut === "partielle" ? "bg-orange-500/10 border-orange-500/30" :
                    t.statut === "retard" ? "bg-destructive/10 border-destructive/30" :
                    "bg-muted/30 border-border";
                  const badgeCls =
                    t.statut === "payee" ? "bg-accent/15 text-accent border-accent/30" :
                    t.statut === "partielle" ? "bg-orange-500/15 text-orange-600 border-orange-500/30" :
                    t.statut === "retard" ? "bg-destructive/15 text-destructive border-destructive/30" :
                    "bg-muted text-muted-foreground";
                  return (
                    <div key={t.num} className={"border-l-4 rounded-r-lg p-3 " + cls}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">{t.label}</p>
                          <p className="text-[11px] text-muted-foreground">📅 Échéance : {t.echeance}</p>
                        </div>
                        <Badge variant="outline" className={badgeCls}>
                          {t.statut === "payee" ? "✓ Payée" : t.statut === "partielle" ? "◐ Partielle" : t.statut === "retard" ? "⚠ En retard" : "À échoir"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <div><p className="text-muted-foreground">Dû</p><p className="font-bold">{fcfa(t.montant)}</p></div>
                        <div><p className="text-muted-foreground">Payé</p><p className="font-bold text-accent">{fcfa(t.paye)}</p></div>
                        <div><p className="text-muted-foreground">Reste</p><p className="font-bold text-destructive">{fcfa(t.montant - t.paye)}</p></div>
                      </div>
                      <div className="mt-2">
                        <Progress value={tpct} className="h-1.5" />
                      </div>
                      {t.statut !== "payee" && (
                        <Button size="sm" className="mt-3 w-full" onClick={() => { setPayTrancheNum(t.num); setPayOpen(true); }}>
                          <Plus className="h-4 w-4" />Encaisser cette tranche
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsSection>

      <PaymentDialog
        eleve={eleve}
        defaultTrancheNum={payTrancheNum}
        open={payOpen}
        onOpenChange={(o) => { if (!o) { setPayOpen(false); setPayTrancheNum(undefined); } }}
        ecoleId={ecoleId}
        onPaymentRecorded={refetch}
      />
    </div>
  );
}
