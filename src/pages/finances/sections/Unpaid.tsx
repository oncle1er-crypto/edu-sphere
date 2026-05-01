import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Mail, MessageSquare, Phone, Calendar, Clock, TrendingDown, Search, ArrowUp, ArrowDown, ArrowUpDown, Eye } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELEVES_SCOLARITE, getEcheancier, statutEleve, fcfa, type Cycle, type EleveScolarite } from "../scolarite-data";
import { addRelance, getRelancesCount, getDerniereRelance, formatRelanceDate } from "../relances-store";
import { StudentDetailDrawer } from "../components/StudentDetailDrawer";
import { toast } from "sonner";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège", "Lycée"];

type SortKey = "retard" | "resteDu" | "derniereTranchePayee" | "nom";
type SortDir = "asc" | "desc";

// Numéro de la dernière tranche réellement payée (entièrement)
function derniereTranchePayee(e: EleveScolarite): number {
  const payees = e.tranches.filter((t) => t.statut === "payee").map((t) => t.num);
  return payees.length ? Math.max(...payees) : 0;
}

// SMS automatique
function buildSmsRelance(e: EleveScolarite): string {
  const trancheRetard = e.tranches.find((t) => t.statut === "retard");
  const lib = trancheRetard ? `${trancheRetard.label} (échue le ${trancheRetard.echeance})` : "scolarité";
  return `GSP - Bonjour ${e.parent}, rappel : ${fcfa(e.resteDu)} FCFA dus pour ${e.prenom} ${e.nom} (${e.classe}) au titre de ${lib}. Merci de régulariser. Foi, Savoir, Excellence.`;
}

export default function Unpaid() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [classe, setClasse] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("retard");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedEleve, setSelectedEleve] = useState<EleveScolarite | null>(null);
  const [openTrancheNum, setOpenTrancheNum] = useState<number | undefined>(undefined);

  const classesDispo = useMemo(() => {
    const src = cycle === "all" ? ELEVES_SCOLARITE : ELEVES_SCOLARITE.filter((e) => e.cycle === cycle);
    return Array.from(new Set(src.map((e) => e.classe))).sort();
  }, [cycle]);

  const enRetard = useMemo(() => {
    const list = ELEVES_SCOLARITE
      .filter((e) => statutEleve(e) !== "ajour")
      .filter((e) => cycle === "all" || e.cycle === cycle)
      .filter((e) => classe === "all" || e.classe === classe)
      .filter((e) => !search || `${e.prenom} ${e.nom} ${e.classe} ${e.parent} ${e.telephone}`.toLowerCase().includes(search.toLowerCase()));

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "retard": return (a.joursRetard - b.joursRetard) * dir;
        case "resteDu": return (a.resteDu - b.resteDu) * dir;
        case "derniereTranchePayee": return (derniereTranchePayee(a) - derniereTranchePayee(b)) * dir;
        case "nom": return a.nom.localeCompare(b.nom) * dir;
      }
    });
    return list;
  }, [search, cycle, classe, sortKey, sortDir]);

  const totalDu = enRetard.reduce((s, e) => s + e.resteDu, 0);
  const retardMoyen = enRetard.length ? Math.round(enRetard.reduce((s, e) => s + e.joursRetard, 0) / enRetard.length) : 0;
  const critique = enRetard.filter((e) => e.joursRetard > 30).length;
  const echeancier = getEcheancier();

  const buckets = {
    aVenir: enRetard.filter((e) => e.joursRetard === 0),
    j1_15: enRetard.filter((e) => e.joursRetard > 0 && e.joursRetard <= 15),
    j16_30: enRetard.filter((e) => e.joursRetard > 15 && e.joursRetard <= 30),
    j30plus: enRetard.filter((e) => e.joursRetard > 30),
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortBtn = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <button
      onClick={() => handleSort(k)}
      className={"inline-flex items-center gap-1 hover:text-primary transition-colors font-semibold " + (align === "right" ? "ml-auto" : "")}
    >
      {label}
      {sortKey === k ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  const handleSendSms = (e: EleveScolarite) => {
    addRelance({
      eleveId: e.id,
      canal: "SMS",
      message: buildSmsRelance(e),
      destinataire: e.telephone,
    });
    toast.success(`SMS envoyé à ${e.parent}`, { description: e.telephone });
  };

  const openFiche = (e: EleveScolarite, trancheNum?: number) => {
    setSelectedEleve(e);
    setOpenTrancheNum(trancheNum);
  };

  const renderTable = (list: typeof enRetard) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead><SortBtn k="nom" label="Élève / Famille" /></TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Tranches</TableHead>
            <TableHead><SortBtn k="derniereTranchePayee" label="Dern. tranche payée" /></TableHead>
            <TableHead className="text-right"><SortBtn k="resteDu" label="Reste dû" align="right" /></TableHead>
            <TableHead><SortBtn k="retard" label="Retard" /></TableHead>
            <TableHead>Relances</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((e) => {
            const dernPayee = derniereTranchePayee(e);
            const nbRelances = getRelancesCount(e.id);
            const dern = getDerniereRelance(e.id);
            return (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell>
                  <p className="font-semibold">{e.prenom} {e.nom}</p>
                  <p className="text-[11px] text-muted-foreground">{e.parent} · {e.telephone}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{e.classe}</p>
                  <p className="text-[11px] text-muted-foreground">{e.cycle}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.tranches.map((t) => (
                      <button
                        key={t.num}
                        onClick={() => openFiche(e, t.num)}
                        title={`${t.label} — ${fcfa(t.paye)}/${fcfa(t.montant)} FCFA · échéance ${t.echeance} · cliquer pour détails`}
                        className={
                          "h-7 w-7 rounded flex items-center justify-center text-[10px] font-bold border transition hover:scale-110 hover:shadow cursor-pointer " +
                          (t.statut === "payee" ? "bg-accent/20 text-accent border-accent/40 hover:bg-accent/30" :
                           t.statut === "partielle" ? "bg-orange-500/20 text-orange-600 border-orange-500/40 hover:bg-orange-500/30" :
                           t.statut === "retard" ? "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30" :
                           "bg-muted text-muted-foreground border-border hover:bg-muted/80")
                        }
                      >T{t.num}</button>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {dernPayee > 0 ? (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">T{dernPayee}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucune</span>
                  )}
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
                      <span className="ml-1">{e.joursRetard}j</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">À échoir</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {nbRelances > 0 ? (
                    <div>
                      <p className="text-xs font-semibold">{nbRelances} envoyée{nbRelances > 1 ? "s" : ""}</p>
                      {dern && <p className="text-[10px] text-muted-foreground">Dern. : {formatRelanceDate(dern.date).split(" ")[0]}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Voir fiche" onClick={() => openFiche(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleSendSms(e)}
                      title="Envoyer SMS de relance en 1 clic"
                    >
                      <MessageSquare className="h-4 w-4" />Relancer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Aucune famille dans cette catégorie 🎉</TableCell></TableRow>
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

      {/* Échéancier visuel */}
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
                  <div><p className="text-[10px] text-muted-foreground uppercase">Encaissé</p><p className="text-sm font-bold text-accent">{fcfa(e.paye)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Reste</p><p className="text-sm font-bold text-destructive">{fcfa(e.reste)}</p></div>
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

      <SettingsSection
        title="Familles à relancer"
        description="Triez par colonne, cliquez sur T1/T2/T3 pour ouvrir le détail, ou envoyez un SMS en 1 clic."
        icon={<AlertTriangle className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher (nom, classe, parent, téléphone…)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={cycle} onValueChange={(v) => { setCycle(v as Cycle | "all"); setClasse("all"); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CYCLES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Tous cycles" : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classe} onValueChange={setClasse}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Classe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes classes</SelectItem>
              {classesDispo.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => { const [k, d] = v.split(":") as [SortKey, SortDir]; setSortKey(k); setSortDir(d); }}>
            <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retard:desc">Retard (+ ancien d'abord)</SelectItem>
              <SelectItem value="retard:asc">Retard (+ récent d'abord)</SelectItem>
              <SelectItem value="resteDu:desc">Reste dû (élevé → faible)</SelectItem>
              <SelectItem value="resteDu:asc">Reste dû (faible → élevé)</SelectItem>
              <SelectItem value="derniereTranchePayee:asc">Dern. tranche payée (↑)</SelectItem>
              <SelectItem value="derniereTranchePayee:desc">Dern. tranche payée (↓)</SelectItem>
              <SelectItem value="nom:asc">Nom (A → Z)</SelectItem>
              <SelectItem value="nom:desc">Nom (Z → A)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => toast.success("Email groupé envoyé")}><Mail className="h-4 w-4" />Email groupé</Button>
          <Button size="sm" onClick={() => {
            enRetard.forEach((e) => addRelance({ eleveId: e.id, canal: "SMS", message: buildSmsRelance(e), destinataire: e.telephone }));
            toast.success(`${enRetard.length} SMS de relance envoyés`);
          }}><MessageSquare className="h-4 w-4" />SMS groupé</Button>
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

      <StudentDetailDrawer
        eleve={selectedEleve}
        openTrancheNum={openTrancheNum}
        onOpenChange={(o) => { if (!o) { setSelectedEleve(null); setOpenTrancheNum(undefined); } }}
      />
    </div>
  );
}
