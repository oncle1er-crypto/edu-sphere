import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Mail, MessageSquare, Phone, Calendar, Clock, TrendingDown, Search } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELEVES_SCOLARITE, getEcheancier, statutEleve, fcfa, type Cycle } from "../scolarite-data";
import { toast } from "sonner";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège", "Lycée"];

export default function Unpaid() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");

  const enRetard = useMemo(() =>
    ELEVES_SCOLARITE
      .filter((e) => statutEleve(e) !== "ajour")
      .filter((e) => cycle === "all" || e.cycle === cycle)
      .filter((e) => !search || `${e.prenom} ${e.nom} ${e.classe}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.joursRetard - a.joursRetard),
    [search, cycle]
  );

  const totalDu = enRetard.reduce((s, e) => s + e.resteDu, 0);
  const retardMoyen = enRetard.length ? Math.round(enRetard.reduce((s, e) => s + e.joursRetard, 0) / enRetard.length) : 0;
  const critique = enRetard.filter((e) => e.joursRetard > 30).length;

  const echeancier = getEcheancier();

  // Buckets de retard
  const buckets = {
    aVenir: enRetard.filter((e) => e.joursRetard === 0),
    j1_15: enRetard.filter((e) => e.joursRetard > 0 && e.joursRetard <= 15),
    j16_30: enRetard.filter((e) => e.joursRetard > 15 && e.joursRetard <= 30),
    j30plus: enRetard.filter((e) => e.joursRetard > 30),
  };

  const renderTable = (list: typeof enRetard) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Élève / Famille</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead className="text-right">Reste dû</TableHead>
            <TableHead>Retard</TableHead>
            <TableHead>Dernière relance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <p className="font-semibold">{e.prenom} {e.nom}</p>
                <p className="text-[11px] text-muted-foreground">{e.parent} · {e.telephone}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">{e.classe}</p>
                <p className="text-[11px] text-muted-foreground">{e.cycle}</p>
              </TableCell>
              <TableCell className="text-right font-bold text-destructive">{fcfa(e.resteDu)} FCFA</TableCell>
              <TableCell>
                {e.joursRetard > 0 ? (
                  <Badge variant="outline" className={
                    e.joursRetard > 30 ? "bg-destructive/15 text-destructive border-destructive/30" :
                    e.joursRetard > 15 ? "bg-orange-500/15 text-orange-600 border-orange-500/30" :
                    "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
                  }>
                    <Clock className="h-3 w-3" />
                    <span className="ml-1">{e.joursRetard} jours</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">À échoir</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {e.derniereRelance || "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Appeler"><Phone className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="SMS"><MessageSquare className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(`Relance envoyée à ${e.parent}`)}>
                    <Bell className="h-4 w-4" />Relancer
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Aucune famille dans cette catégorie 🎉</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-destructive" />Total impayés</div>
            <p className="text-xl font-bold font-display text-destructive mt-2">{fcfa(totalDu)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">FCFA · {enRetard.length} familles</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 text-orange-600" />Retard moyen</div>
            <p className="text-xl font-bold font-display text-orange-600 mt-2">{retardMoyen} jours</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Cas critiques</div>
            <p className="text-xl font-bold font-display text-destructive mt-2">{critique}</p>
            <p className="text-[11px] text-muted-foreground mt-1">+ de 30 jours</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5 text-primary" />Relances ce mois</div>
            <p className="text-xl font-bold font-display text-primary mt-2">87</p>
          </CardContent>
        </Card>
      </div>

      {/* Échéancier visuel des tranches */}
      <Card className="border shadow-[var(--shadow-card)]">
        <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold font-display text-primary">Échéancier des tranches — état de recouvrement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Vision consolidée par tranche pour l'année 2025-2026</p>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {echeancier.map((e) => (
              <div key={e.num} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tranche {e.num}</p>
                    <p className="font-bold text-sm">{e.label}</p>
                  </div>
                  <Badge variant="outline" className={e.taux >= 90 ? "bg-accent/15 text-accent border-accent/30" : e.taux >= 70 ? "bg-orange-500/15 text-orange-600 border-orange-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}>{e.taux}%</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">📅 Échéance : {e.date}</p>
                <Progress value={e.taux} className="h-2" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Encaissé</p>
                    <p className="text-sm font-bold text-accent">{fcfa(e.paye)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Reste</p>
                    <p className="text-sm font-bold text-destructive">{fcfa(e.reste)}</p>
                  </div>
                </div>
                {(e.enRetard > 0 || e.partielle > 0) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t text-[11px]">
                    {e.enRetard > 0 && <span className="text-destructive font-semibold">⚠ {e.enRetard} retard</span>}
                    {e.partielle > 0 && <span className="text-orange-600 font-semibold">◐ {e.partielle} partielle</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liste avec onglets par âge de retard */}
      <SettingsSection
        title="Familles à relancer"
        description="Triées par âge de retard. Lancez les relances ciblées."
        icon={<AlertTriangle className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une famille…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Email groupé envoyé")}><Mail className="h-4 w-4" />Email groupé</Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("SMS groupé envoyé")}><MessageSquare className="h-4 w-4" />SMS groupé</Button>
          <Button size="sm" onClick={() => toast.success("Campagne de relance lancée")}><Bell className="h-4 w-4" />Relance globale</Button>
        </div>

        <Tabs defaultValue="critiques" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="critiques">🔴 Critiques (+30j) <Badge variant="secondary" className="ml-2">{buckets.j30plus.length}</Badge></TabsTrigger>
            <TabsTrigger value="moyens">🟠 16–30 jours <Badge variant="secondary" className="ml-2">{buckets.j16_30.length}</Badge></TabsTrigger>
            <TabsTrigger value="recents">🟡 1–15 jours <Badge variant="secondary" className="ml-2">{buckets.j1_15.length}</Badge></TabsTrigger>
            <TabsTrigger value="avenir">⏳ À échoir <Badge variant="secondary" className="ml-2">{buckets.aVenir.length}</Badge></TabsTrigger>
            <TabsTrigger value="tous">Tous <Badge variant="secondary" className="ml-2">{enRetard.length}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="critiques" className="mt-4">{renderTable(buckets.j30plus)}</TabsContent>
          <TabsContent value="moyens" className="mt-4">{renderTable(buckets.j16_30)}</TabsContent>
          <TabsContent value="recents" className="mt-4">{renderTable(buckets.j1_15)}</TabsContent>
          <TabsContent value="avenir" className="mt-4">{renderTable(buckets.aVenir)}</TabsContent>
          <TabsContent value="tous" className="mt-4">{renderTable(enRetard)}</TabsContent>
        </Tabs>
      </SettingsSection>
    </div>
  );
}
