import { useMemo, useState } from "react";
import { CreditCard, Plus, Search, Download, Eye, AlertCircle, CheckCircle2, Clock, X, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LockBanner } from "@/components/LockGuard";
import { useLock } from "@/context/AcademicPeriodContext";
import { toast } from "sonner";
import { useFinanceData, fcfa } from "../useFinanceData";
import { statutEleve, STATUT_LABEL, STATUT_CLASS, type EleveScolarite, type Cycle } from "../scolarite-data";
import { StudentDetailDrawer } from "../components/StudentDetailDrawer";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège", "Lycée"];

interface AdvSearch {
  nom: string;
  prenom: string;
  classe: string;
  telephone: string;
}

const EMPTY_ADV: AdvSearch = { nom: "", prenom: "", classe: "", telephone: "" };

export default function Payments() {
  const lock = useLock("paiements");
  const { data: ELEVES_SCOLARITE, loading: finLoading } = useFinanceData();
  const [search, setSearch] = useState("");
  const [adv, setAdv] = useState<AdvSearch>(EMPTY_ADV);
  const [advOpen, setAdvOpen] = useState(false);
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [classe, setClasse] = useState<string>("all");
  const [statut, setStatut] = useState<"all" | "ajour" | "partiel" | "retard">("all");
  const [selected, setSelected] = useState<EleveScolarite | null>(null);
  const [openTrancheNum, setOpenTrancheNum] = useState<number | undefined>(undefined);

  const advActive = adv.nom || adv.prenom || adv.classe || adv.telephone;

  const classesDispo = useMemo(() => {
    const src = cycle === "all" ? ELEVES_SCOLARITE : ELEVES_SCOLARITE.filter((e) => e.cycle === cycle);
    return Array.from(new Set(src.map((e) => e.classe))).sort();
  }, [cycle, ELEVES_SCOLARITE]);

  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().trim();
    return ELEVES_SCOLARITE.filter((e) => {
      // recherche globale
      const s = norm(search);
      const matchSearch = !s || `${e.prenom} ${e.nom} ${e.matricule} ${e.classe} ${e.parent} ${e.telephone}`.toLowerCase().includes(s);
      // recherche avancée par champ
      const matchNom = !adv.nom || norm(e.nom).includes(norm(adv.nom));
      const matchPrenom = !adv.prenom || norm(e.prenom).includes(norm(adv.prenom));
      const matchClasseAdv = !adv.classe || norm(e.classe).includes(norm(adv.classe));
      const matchTel = !adv.telephone || e.telephone.replace(/\s/g, "").includes(adv.telephone.replace(/\s/g, ""));
      // filtres
      const matchCycle = cycle === "all" || e.cycle === cycle;
      const matchClasse = classe === "all" || e.classe === classe;
      const matchStatut = statut === "all" || statutEleve(e) === statut;
      return matchSearch && matchNom && matchPrenom && matchClasseAdv && matchTel && matchCycle && matchClasse && matchStatut;
    });
  }, [search, adv, cycle, classe, statut, ELEVES_SCOLARITE]);

  const stats = useMemo(() => {
    const att = filtered.reduce((s, e) => s + e.fraisAnnuel, 0);
    const pay = filtered.reduce((s, e) => s + e.totalPaye, 0);
    return { att, pay, du: att - pay, count: filtered.length };
  }, [filtered]);

  const openFiche = (e: EleveScolarite, trancheNum?: number) => {
    setSelected(e);
    setOpenTrancheNum(trancheNum);
  };

  if (finLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <LockBanner module="paiements" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Élèves filtrés</p><p className="text-xl font-bold font-display text-primary mt-1">{stats.count}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Attendu</p><p className="text-xl font-bold font-display text-primary mt-1">{fcfa(stats.att)}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Encaissé</p><p className="text-xl font-bold font-display text-accent mt-1">{fcfa(stats.pay)}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Reste dû</p><p className="text-xl font-bold font-display text-destructive mt-1">{fcfa(stats.du)}</p></CardContent></Card>
      </div>

      <SettingsSection
        title="Registre des familles — Scolarité"
        description="Suivi élève par élève. Cliquez sur un badge T1/T2/T3 pour voir le détail de la tranche."
        icon={<CreditCard className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (nom, matricule, classe, parent, téléphone…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover open={advOpen} onOpenChange={setAdvOpen}>
            <PopoverTrigger asChild>
              <Button variant={advActive ? "default" : "outline"} size="sm">
                <Search className="h-4 w-4" />
                Recherche avancée
                {advActive && <Badge variant="secondary" className="ml-1 h-5 px-1.5">●</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Recherche avancée</h4>
                  {advActive && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setAdv(EMPTY_ADV)}>
                      <X className="h-3 w-3" />Effacer
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Nom</Label>
                    <Input value={adv.nom} onChange={(e) => setAdv({ ...adv, nom: e.target.value })} placeholder="MBALLA" className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Prénom</Label>
                    <Input value={adv.prenom} onChange={(e) => setAdv({ ...adv, prenom: e.target.value })} placeholder="Junior" className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Classe</Label>
                    <Input value={adv.classe} onChange={(e) => setAdv({ ...adv, classe: e.target.value })} placeholder="6e B, CM1, Tle C…" className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Téléphone parent</Label>
                    <Input value={adv.telephone} onChange={(e) => setAdv({ ...adv, telephone: e.target.value })} placeholder="+225 07…" className="h-8" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Les champs se combinent (ET logique).</p>
              </div>
            </PopoverContent>
          </Popover>

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
          <Select value={statut} onValueChange={(v) => setStatut(v as typeof statut)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="ajour">À jour</SelectItem>
              <SelectItem value="partiel">Partiel</SelectItem>
              <SelectItem value="retard">En retard</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <ConfirmButton
            size="sm"
            disabled={lock.locked}
            title={lock.locked ? lock.reason : undefined}
            confirmTitle="Enregistrer ce paiement ?"
            confirmDescription="Le paiement sera ajouté à la caisse et un reçu sera émis. Cette opération est traçable."
            confirmLabel="Enregistrer"
            onConfirm={() => { toast.success("Paiement enregistré"); }}
          >
            <Plus className="h-4 w-4" />Saisir paiement
          </ConfirmButton>
        </div>

        {/* Récap critères avancés actifs */}
        {advActive && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground">Critères avancés :</span>
            {adv.nom && <Badge variant="outline">Nom: {adv.nom}</Badge>}
            {adv.prenom && <Badge variant="outline">Prénom: {adv.prenom}</Badge>}
            {adv.classe && <Badge variant="outline">Classe: {adv.classe}</Badge>}
            {adv.telephone && <Badge variant="outline">Tél: {adv.telephone}</Badge>}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Tranches</TableHead>
                <TableHead className="text-right">Payé / Total</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const st = statutEleve(e);
                const pct = Math.round((e.totalPaye / e.fraisAnnuel) * 100);
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="cursor-pointer" onClick={() => openFiche(e)}>
                      <div>
                        <p className="font-semibold">{e.prenom} {e.nom}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{e.matricule}</p>
                      </div>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => openFiche(e)}>
                      <div>
                        <p className="text-sm font-medium">{e.classe}</p>
                        <p className="text-[11px] text-muted-foreground">{e.cycle}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {e.tranches.map((t) => (
                          <button
                            key={t.num}
                            onClick={(ev) => { ev.stopPropagation(); openFiche(e, t.num); }}
                            title={`${t.label} — ${fcfa(t.paye)}/${fcfa(t.montant)} FCFA · échéance ${t.echeance} · cliquer pour voir le détail`}
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
                    <TableCell className="text-right cursor-pointer" onClick={() => openFiche(e)}>
                      <p className="text-sm font-semibold">{fcfa(e.totalPaye)}</p>
                      <p className="text-[11px] text-muted-foreground">/ {fcfa(e.fraisAnnuel)}</p>
                    </TableCell>
                    <TableCell className="min-w-[120px] cursor-pointer" onClick={() => openFiche(e)}>
                      <Progress value={pct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground mt-1">{pct}%</p>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => openFiche(e)}>
                      <Badge variant="outline" className={STATUT_CLASS[st]}>
                        {st === "ajour" && <CheckCircle2 className="h-3 w-3" />}
                        {st === "partiel" && <Clock className="h-3 w-3" />}
                        {st === "retard" && <AlertCircle className="h-3 w-3" />}
                        <span className="ml-1">{STATUT_LABEL[st]}</span>
                      </Badge>
                      {e.joursRetard > 0 && <p className="text-[10px] text-destructive mt-1">{e.joursRetard}j retard</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openFiche(e)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Aucun élève ne correspond aux filtres.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <StudentDetailDrawer
        eleve={selected}
        openTrancheNum={openTrancheNum}
        onOpenChange={(o) => { if (!o) { setSelected(null); setOpenTrancheNum(undefined); } }}
      />
    </div>
  );
}
