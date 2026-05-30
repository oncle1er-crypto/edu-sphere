import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, GraduationCap, TrendingDown, AlertTriangle, Wallet, Eye, Building2, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData, fcfa } from "../useFinanceData";
import { statutEleve, type Cycle, type EleveScolarite, STATUT_LABEL, STATUT_CLASS } from "../scolarite-data";
import { StudentDetailDrawer } from "../components/StudentDetailDrawer";
import { SettleDialog } from "../components/SettleDialog";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège"];

interface ClasseSyntheseRow {
  classe: string;
  cycle: Cycle;
  effectif: number;
  totalDu: number;
  paye: number;
  reste: number;
  enRetard: number;
  partielle: number;
  ajour: number;
  tauxRetard: number; // % d'élèves en retard
  tauxRecouvrement: number; // payé / dû
  joursRetardMax: number;
  eleves: EleveScolarite[];
}

function buildClassesSynthese(allEleves: EleveScolarite[]): ClasseSyntheseRow[] {
  const map = new Map<string, ClasseSyntheseRow>();
  for (const e of allEleves) {
    const key = `${e.cycle}::${e.classe}`;
    let row = map.get(key);
    if (!row) {
      row = {
        classe: e.classe, cycle: e.cycle, effectif: 0,
        totalDu: 0, paye: 0, reste: 0,
        enRetard: 0, partielle: 0, ajour: 0,
        tauxRetard: 0, tauxRecouvrement: 0, joursRetardMax: 0,
        eleves: [],
      };
      map.set(key, row);
    }
    row.effectif++;
    row.totalDu += e.fraisAnnuel;
    row.paye += e.totalPaye;
    row.reste += e.resteDu;
    const s = statutEleve(e);
    if (s === "retard") row.enRetard++;
    else if (s === "partiel") row.partielle++;
    else row.ajour++;
    row.joursRetardMax = Math.max(row.joursRetardMax, e.joursRetard);
    row.eleves.push(e);
  }
  for (const r of map.values()) {
    r.tauxRetard = r.effectif > 0 ? Math.round((r.enRetard / r.effectif) * 100) : 0;
    r.tauxRecouvrement = r.totalDu > 0 ? Math.round((r.paye / r.totalDu) * 100) : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.tauxRetard - a.tauxRetard || a.classe.localeCompare(b.classe));
}

export default function ClassSummary() {
  const { data: ELEVES_SCOLARITE, loading: finLoading, refetch, ecoleId } = useFinanceData();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedEleveId, setSelectedEleveId] = useState<string | null>(null);
  const [settleClasse, setSettleClasse] = useState<ClasseSyntheseRow | null>(null);
  const selectedEleve = useMemo(
    () => (selectedEleveId ? ELEVES_SCOLARITE.find((e) => e.id === selectedEleveId) ?? null : null),
    [selectedEleveId, ELEVES_SCOLARITE],
  );
  const setSelectedEleve = (e: EleveScolarite | null) => setSelectedEleveId(e?.id ?? null);

  const rows = useMemo(() => {
    return buildClassesSynthese(ELEVES_SCOLARITE)
      .filter((r) => cycle === "all" || r.cycle === cycle)
      .filter((r) => !search || `${r.classe} ${r.cycle}`.toLowerCase().includes(search.toLowerCase()));
  }, [search, cycle, ELEVES_SCOLARITE]);

  // KPIs globaux
  const kpis = useMemo(() => {
    const totalDu = rows.reduce((s, r) => s + r.totalDu, 0);
    const paye = rows.reduce((s, r) => s + r.paye, 0);
    const reste = rows.reduce((s, r) => s + r.reste, 0);
    const effectif = rows.reduce((s, r) => s + r.effectif, 0);
    const enRetard = rows.reduce((s, r) => s + r.enRetard, 0);
    return {
      totalDu, paye, reste, effectif,
      tauxRetard: effectif ? Math.round((enRetard / effectif) * 100) : 0,
      tauxRecouvrement: totalDu ? Math.round((paye / totalDu) * 100) : 0,
      classes: rows.length,
    };
  }, [rows]);

  const tauxClass = (t: number) =>
    t >= 90 ? "bg-accent/15 text-primary border-accent/30"
    : t >= 70 ? "bg-orange-500/15 text-orange-600 border-orange-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  const retardClass = (t: number) =>
    t === 0 ? "bg-accent/15 text-primary border-accent/30"
    : t <= 15 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
    : t <= 30 ? "bg-orange-500/15 text-orange-600 border-orange-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  if (finLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-foreground" />Total dû</div>
            <p className="text-xl font-bold font-display text-foreground mt-2">{fcfa(kpis.totalDu)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">FCFA · {kpis.effectif} élèves · {kpis.classes} classes</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 text-success" />Encaissé</div>
            <p className="text-xl font-bold font-display text-success mt-2">{fcfa(kpis.paye)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Recouvrement {kpis.tauxRecouvrement}%</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-destructive" />Reste dû</div>
            <p className="text-xl font-bold font-display text-destructive mt-2">{fcfa(kpis.reste)}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-orange-600" />Taux de retard</div>
            <p className="text-xl font-bold font-display text-orange-600 mt-2">{kpis.tauxRetard}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">élèves en retard</p>
          </CardContent>
        </Card>
      </div>

      <SettingsSection
        title="Synthèse par classe"
        description="Vue agrégée du recouvrement par classe. Cliquez sur une ligne pour voir les élèves."
        icon={<Building2 className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une classe…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CYCLES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Tous cycles" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-8"></TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-center">Effectif</TableHead>
                <TableHead className="text-right">Total dû</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Reste dû</TableHead>
                <TableHead className="text-center">Recouvrement</TableHead>
                <TableHead className="text-center">Retard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const key = `${r.cycle}::${r.classe}`;
                const isOpen = expanded === key;
                return (
                  <>
                    <TableRow
                      key={key}
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell>
                        <ChevronRight className={"h-4 w-4 transition-transform " + (isOpen ? "rotate-90" : "")} />
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{r.classe}</p>
                        <p className="text-[11px] text-muted-foreground">{r.cycle}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold">{r.effectif}</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px]">
                          <span className="text-primary">●{r.ajour}</span>
                          <span className="text-orange-600">●{r.partielle}</span>
                          <span className="text-destructive">●{r.enRetard}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fcfa(r.totalDu)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">{fcfa(r.paye)}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-destructive">{fcfa(r.reste)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className={tauxClass(r.tauxRecouvrement)}>{r.tauxRecouvrement}%</Badge>
                          <Progress value={r.tauxRecouvrement} className="h-1 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={retardClass(r.tauxRetard)}>
                          {r.tauxRetard}%
                        </Badge>
                        {r.joursRetardMax > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">max {r.joursRetardMax}j</p>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${key}-detail`}>
                        <TableCell colSpan={8} className="bg-muted/20 p-0">
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Élèves de {r.classe} ({r.effectif})
                              </p>
                              {r.reste > 0 && (
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90 text-white"
                                  onClick={(ev) => { ev.stopPropagation(); setSettleClasse(r); }}
                                >
                                  <Wallet className="h-3.5 w-3.5" />
                                  Solder la classe ({fcfa(r.reste)})
                                </Button>
                              )}
                            </div>
                            <div className="border rounded-md overflow-hidden bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead>Élève</TableHead>
                                    <TableHead>Parent</TableHead>
                                    <TableHead className="text-right">Payé / Dû</TableHead>
                                    <TableHead className="text-right">Reste</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {r.eleves.map((e) => {
                                    const s = statutEleve(e);
                                    return (
                                      <TableRow key={e.id} className="hover:bg-muted/40">
                                        <TableCell>
                                          <p className="font-semibold text-sm">{e.nom} {e.prenom}</p>
                                          <p className="text-[10px] text-muted-foreground font-mono">{e.matricule}</p>
                                        </TableCell>
                                        <TableCell>
                                          <p className="text-xs">{e.parent}</p>
                                          <p className="text-[10px] text-muted-foreground">{e.telephone}</p>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                          <span className="text-primary font-semibold">{fcfa(e.totalPaye)}</span>
                                          <span className="text-muted-foreground"> / {fcfa(e.fraisAnnuel)}</span>
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-bold text-destructive">{fcfa(e.resteDu)}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className={STATUT_CLASS[s]}>{STATUT_LABEL[s]}</Badge>
                                          {e.joursRetard > 0 && <p className="text-[10px] text-destructive mt-0.5">{e.joursRetard}j retard</p>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setSelectedEleve(e); }}>
                                            <Eye className="h-3.5 w-3.5" />Voir fiche
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Aucune classe trouvée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      <StudentDetailDrawer
        eleve={selectedEleve}
        onOpenChange={(o) => { if (!o) setSelectedEleve(null); }}
        ecoleId={ecoleId}
        onPaymentRecorded={refetch}
      />
    </div>
  );
}
