import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Bell, MessageSquare, Calendar, Clock, TrendingDown, Search, ArrowUp, ArrowDown, ArrowUpDown, Eye, Wallet, Tag, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_TRANCHE } from "@/components/help";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData, fcfa } from "../useFinanceData";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { statutEleve, type Cycle, type EleveScolarite } from "../scolarite-data";
import { useRelances, formatRelanceDate } from "@/hooks/useRelances";
import { StudentDetailDrawer } from "../components/StudentDetailDrawer";
import { PaymentDialog } from "../components/PaymentDialog";
import { SmsPreviewDialog } from "../components/SmsPreviewDialog";
import { StatusDialog } from "../components/StatusDialog";
import { pickTrancheCible, renderTemplate, getTemplate } from "../sms-templates-store";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ConfirmButton";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège"];

type SortKey = "retard" | "resteDu" | "derniereTranchePayee" | "nom";
type SortDir = "asc" | "desc";

// Numéro de la dernière tranche réellement payée (entièrement)
function derniereTranchePayee(e: EleveScolarite): number {
  const payees = e.tranches.filter((t) => t.statut === "payee").map((t) => t.num);
  return payees.length ? Math.max(...payees) : 0;
}

// SMS automatique basé sur les modèles personnalisables
function buildSmsRelance(e: EleveScolarite): string {
  const { key, tranche } = pickTrancheCible(e);
  return renderTemplate(getTemplate(key).message, e, tranche);
}

export default function Unpaid() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const scopedAnneeId = periodLoading ? "" : (activeAnnee?.id ?? "");
  const { data: ELEVES_SCOLARITE, loading: finLoading, refetching, refetch, ecoleId } = useFinanceData(scopedAnneeId);
  const { relances, fetchRelances, addRelance, getRelancesCount, getDerniereRelance } = useRelances();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [classe, setClasse] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("retard");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedEleveId, setSelectedEleveId] = useState<string | null>(null);
  const selectedEleve = useMemo(
    () => (selectedEleveId ? ELEVES_SCOLARITE.find((e) => e.id === selectedEleveId) ?? null : null),
    [selectedEleveId, ELEVES_SCOLARITE],
  );
  const setSelectedEleve = (e: EleveScolarite | null) => setSelectedEleveId(e?.id ?? null);
  const [openTrancheNum, setOpenTrancheNum] = useState<number | undefined>(undefined);
  const [paymentEleveId, setPaymentEleveId] = useState<string | null>(null);
  const paymentEleve = useMemo(
    () => (paymentEleveId ? ELEVES_SCOLARITE.find((e) => e.id === paymentEleveId) ?? null : null),
    [paymentEleveId, ELEVES_SCOLARITE],
  );
  const setPaymentEleve = (e: EleveScolarite | null) => setPaymentEleveId(e?.id ?? null);
  const [paymentTranche, setPaymentTranche] = useState<number | undefined>(undefined);
  const [smsEleveId, setSmsEleveId] = useState<string | null>(null);
  const smsEleve = useMemo(
    () => (smsEleveId ? ELEVES_SCOLARITE.find((e) => e.id === smsEleveId) ?? null : null),
    [smsEleveId, ELEVES_SCOLARITE],
  );
  const setSmsEleve = (e: EleveScolarite | null) => setSmsEleveId(e?.id ?? null);
  const [statusEleveId, setStatusEleveId] = useState<string | null>(null);
  const statusEleve = useMemo(
    () => (statusEleveId ? ELEVES_SCOLARITE.find((e) => e.id === statusEleveId) ?? null : null),
    [statusEleveId, ELEVES_SCOLARITE],
  );
  const setStatusEleve = (e: EleveScolarite | null) => setStatusEleveId(e?.id ?? null);

  useEffect(() => { fetchRelances(); }, [fetchRelances]);

  const classesDispo = useMemo((): string[] => {
    const src = cycle === "all" ? ELEVES_SCOLARITE : ELEVES_SCOLARITE.filter((e) => e.cycle === cycle);
    return Array.from(new Set(src.map((e) => e.classe))).sort();
  }, [cycle, ELEVES_SCOLARITE]);

  const enRetard = useMemo(() => {
    const list = ELEVES_SCOLARITE
      .filter((e) => statutEleve(e) !== "ajour")
      .filter((e) => cycle === "all" || e.cycle === cycle)
      .filter((e) => classe === "all" || e.classe === classe)
      .filter((e) => !search || `${e.nom} ${e.prenom} ${e.classe} ${e.parent} ${e.telephone}`.toLowerCase().includes(search.toLowerCase()));

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
  }, [search, cycle, classe, sortKey, sortDir, ELEVES_SCOLARITE]);

  const totalDu = enRetard.reduce((s, e) => s + e.resteDu, 0);
  const retardMoyen = enRetard.length ? Math.round(enRetard.reduce((s, e) => s + e.joursRetard, 0) / enRetard.length) : 0;
  const critique = enRetard.filter((e) => e.joursRetard > 30).length;
  const relancesCeMois = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return (relances ?? []).filter((r: any) => (r.date_envoi ?? "").startsWith(prefix)).length;
  }, [relances]);


  // Build echeancier from data
  const echeancier = [1, 2, 3].map((num) => {
    const label = num === 1 ? "1ère tranche" : num === 2 ? "2ème tranche" : "3ème tranche";
    const tranches = ELEVES_SCOLARITE.flatMap((el) => el.tranches.filter((t) => t.num === num));
    const attendu = tranches.reduce((s, t) => s + t.montant, 0);
    const paye = tranches.reduce((s, t) => s + t.paye, 0);
    const enRetardCount = tranches.filter((t) => t.statut === "retard").length;
    const partielle = tranches.filter((t) => t.statut === "partielle").length;
    return { num, label, attendu, paye, reste: attendu - paye, enRetard: enRetardCount, partielle, taux: attendu > 0 ? Math.round((paye / attendu) * 100) : 0 };
  });

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

  const handleSendSms = async (e: EleveScolarite) => {
    const result = await addRelance({
      eleveId: e.id,
      canal: "SMS",
      message: buildSmsRelance(e),
      destinataire: e.telephone,
    });
    if (result) toast.success(`SMS envoyé à ${e.parent}`, { description: e.telephone });
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
                  <p className="font-semibold">{e.nom} {e.prenom}</p>
                  <p className="text-[11px] text-muted-foreground">{e.parent} · {e.telephone}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{e.classe}</p>
                  <p className="text-[11px] text-muted-foreground">{e.cycle}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.tranches.map((t) => {
                      const prevUnpaid = e.tranches.some((p) => p.num < t.num && p.statut !== "payee");
                      const locked = t.statut !== "payee" && prevUnpaid;
                      return (
                        <button
                          key={t.num}
                          onClick={() => !locked && openFiche(e, t.num)}
                          disabled={locked}
                          title={locked
                            ? `Soldez d'abord la tranche précédente avant d'encaisser T${t.num}.`
                            : `${t.label} — ${fcfa(t.paye)}/${fcfa(t.montant)} FCFA · échéance ${t.echeance}`}
                          className={
                            "h-9 w-9 sm:h-7 sm:w-7 rounded flex items-center justify-center text-[10px] font-bold border transition " +
                            (locked ? "opacity-50 cursor-not-allowed " : "hover:scale-110 hover:shadow cursor-pointer ") +
                            (t.statut === "payee" ? "bg-green-500/20 text-green-700 border-green-500/40 hover:bg-green-500/30" :
                             t.statut === "partielle" ? "bg-yellow-400/25 text-yellow-700 border-yellow-500/40 hover:bg-yellow-400/35" :
                             "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30")
                          }
                        >T{t.num}</button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  {dernPayee > 0 ? (
                    <Badge variant="outline" className="bg-accent/10 text-primary border-accent/30">T{dernPayee}</Badge>
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
                      {dern && <p className="text-[10px] text-muted-foreground">Dern. : {formatRelanceDate(dern.date_envoi).split(" ")[0]}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Voir fiche complète" onClick={() => openFiche(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <ConfirmButton
                      size="icon" variant="outline" className="h-9 w-9 sm:h-8 sm:w-8"
                      title="Enregistrer un encaissement"
                      confirmTitle="Ouvrir l'encaissement ?"
                      confirmDescription={`Saisir un nouveau paiement pour ${e.nom} ${e.prenom} ?`}
                      confirmLabel="Continuer"
                      onConfirm={() => { setPaymentEleve(e); setPaymentTranche(undefined); }}
                    >
                      <Wallet className="h-4 w-4" />
                    </ConfirmButton>
                    <ConfirmButton
                      size="icon" variant="outline" className="h-9 w-9 sm:h-8 sm:w-8"
                      title="Mettre à jour le statut"
                      confirmTitle="Modifier le statut ?"
                      confirmDescription={`Mettre à jour le statut de scolarité de ${e.nom} ${e.prenom} ?`}
                      confirmLabel="Continuer"
                      onConfirm={() => setStatusEleve(e)}
                    >
                      <Tag className="h-4 w-4" />
                    </ConfirmButton>
                    <ConfirmButton
                      size="icon" variant="outline" className="h-9 w-9 sm:h-8 sm:w-8"
                      title="SMS avec aperçu (modèle T1/T2/T3)"
                      confirmTitle="Préparer le SMS de relance ?"
                      confirmDescription={`Ouvrir l'aperçu du SMS de relance pour ${e.parent} ?`}
                      confirmLabel="Ouvrir l'aperçu"
                      onConfirm={() => setSmsEleve(e)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </ConfirmButton>
                    <ConfirmButton
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      title="Envoyer SMS de relance en 1 clic"
                      confirmTitle="Envoyer la relance ?"
                      confirmDescription={`Un SMS de relance sera immédiatement envoyé à ${e.parent} (${e.telephone}).`}
                      confirmLabel="Envoyer"
                      onConfirm={() => handleSendSms(e)}
                    >
                      Relancer
                    </ConfirmButton>
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

  if (finLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

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
            <p className="text-xl font-bold font-display text-primary mt-2">{relancesCeMois}</p>
          </CardContent>
        </Card>
      </div>

      {/* Échéancier visuel */}
      <Card className="border shadow-[var(--shadow-card)]">
        <div className="px-6 py-4 border-b bg-muted/30 rounded-t-lg flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold font-display text-primary">Échéancier des tranches — état de recouvrement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Vision consolidée par tranche{activeAnnee?.libelle ? ` pour l'année ${activeAnnee.libelle}` : ""}</p>
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
                  <Badge variant="outline" className={e.taux >= 90 ? "bg-accent/15 text-primary border-accent/30" : e.taux >= 70 ? "bg-orange-500/15 text-orange-600 border-orange-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}>{e.taux}%</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">Tranche {e.num}</p>
                <Progress value={e.taux} className="h-2" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Encaissé</p><p className="text-sm font-bold text-success">{fcfa(e.paye)}</p></div>
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
        <HelpBanner storageKey="finances-unpaid" title="À quoi sert cette page ?">
          Identifiez en un coup d'œil les familles ayant des <strong>impayés</strong>. Cliquez sur une tranche (T1/T2/T3) pour voir le détail, ou envoyez un <strong>SMS de relance</strong> personnalisé. Le nombre de jours de retard est calculé automatiquement.
        </HelpBanner>
        <StatusLegend title="Légende des tranches" items={STATUTS_TRANCHE} />
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[220px]">
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
          {/* « Email groupé » retiré tant que l'envoi réel n'est pas branché. */}
          <Button size="sm" onClick={async () => {
            const results = await Promise.all(enRetard.map((e) => addRelance({ eleveId: e.id, canal: "SMS", message: buildSmsRelance(e), destinataire: e.telephone })));
            const sent = results.filter(Boolean).length;
            if (sent > 0) toast.success(`${sent} SMS de relance envoyé${sent > 1 ? "s" : ""}`);
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
        ecoleId={ecoleId}
        onPaymentRecorded={refetch}
      />

      <PaymentDialog
        eleve={paymentEleve}
        defaultTrancheNum={paymentTranche}
        open={!!paymentEleve}
        onOpenChange={(o) => { if (!o) { setPaymentEleve(null); setPaymentTranche(undefined); } }}
        ecoleId={ecoleId}
        onPaymentRecorded={refetch}
      />

      <SmsPreviewDialog
        eleve={smsEleve}
        open={!!smsEleve}
        onOpenChange={(o) => { if (!o) setSmsEleve(null); }}
      />

      <StatusDialog
        eleve={statusEleve}
        open={!!statusEleve}
        onOpenChange={(o) => { if (!o) setStatusEleve(null); }}
      />
    </div>
  );
}
