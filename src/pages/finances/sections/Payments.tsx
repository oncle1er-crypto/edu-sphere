import { useMemo, useState } from "react";
import { CreditCard, Plus, Search, Download, Eye, AlertCircle, CheckCircle2, Clock, Phone, Mail, MessageSquare } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LockBanner } from "@/components/LockGuard";
import { useLock } from "@/context/AcademicPeriodContext";
import { toast } from "sonner";
import {
  ELEVES_SCOLARITE, statutEleve, STATUT_LABEL, STATUT_CLASS, fcfa,
  type EleveScolarite, type Cycle,
} from "../scolarite-data";

const CYCLES: (Cycle | "all")[] = ["all", "Maternelle", "Primaire", "Collège", "Lycée"];
const STATUTS: ("all" | "ajour" | "partiel" | "retard")[] = ["all", "ajour", "partiel", "retard"];

export default function Payments() {
  const lock = useLock("paiements");
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState<Cycle | "all">("all");
  const [statut, setStatut] = useState<"all" | "ajour" | "partiel" | "retard">("all");
  const [selected, setSelected] = useState<EleveScolarite | null>(null);

  const filtered = useMemo(() => {
    return ELEVES_SCOLARITE.filter((e) => {
      const s = search.toLowerCase().trim();
      const matchSearch = !s || `${e.prenom} ${e.nom} ${e.matricule} ${e.classe} ${e.parent}`.toLowerCase().includes(s);
      const matchCycle = cycle === "all" || e.cycle === cycle;
      const matchStatut = statut === "all" || statutEleve(e) === statut;
      return matchSearch && matchCycle && matchStatut;
    });
  }, [search, cycle, statut]);

  const stats = useMemo(() => {
    const att = filtered.reduce((s, e) => s + e.fraisAnnuel, 0);
    const pay = filtered.reduce((s, e) => s + e.totalPaye, 0);
    return { att, pay, du: att - pay, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <LockBanner module="paiements" />

      {/* KPIs filtrés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Élèves filtrés</p><p className="text-xl font-bold font-display text-primary mt-1">{stats.count}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Attendu</p><p className="text-xl font-bold font-display text-primary mt-1">{fcfa(stats.att)}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Encaissé</p><p className="text-xl font-bold font-display text-accent mt-1">{fcfa(stats.pay)}</p></CardContent></Card>
        <Card className="border"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Reste dû</p><p className="text-xl font-bold font-display text-destructive mt-1">{fcfa(stats.du)}</p></CardContent></Card>
      </div>

      <SettingsSection
        title="Registre des familles — Scolarité"
        description="Suivi élève par élève : tranches, paiements, échéances et relances."
        icon={<CreditCard className="h-5 w-5" />}
        hideSave
      >
        {/* Barre filtres */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (nom, matricule, classe, parent…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CYCLES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Tous cycles" : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statut} onValueChange={(v) => setStatut(v as typeof statut)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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

        {/* Tableau registre */}
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
                  <TableRow key={e.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{e.prenom} {e.nom}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{e.matricule}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{e.classe}</p>
                        <p className="text-[11px] text-muted-foreground">{e.cycle}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {e.tranches.map((t) => (
                          <div
                            key={t.num}
                            title={`${t.label} — ${fcfa(t.paye)}/${fcfa(t.montant)}`}
                            className={
                              "h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold border " +
                              (t.statut === "payee" ? "bg-accent/20 text-accent border-accent/40" :
                               t.statut === "partielle" ? "bg-orange-500/20 text-orange-600 border-orange-500/40" :
                               t.statut === "retard" ? "bg-destructive/20 text-destructive border-destructive/40" :
                               "bg-muted text-muted-foreground border-border")
                            }
                          >T{t.num}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-semibold">{fcfa(e.totalPaye)}</p>
                      <p className="text-[11px] text-muted-foreground">/ {fcfa(e.fraisAnnuel)}</p>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <Progress value={pct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground mt-1">{pct}%</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUT_CLASS[st]}>
                        {st === "ajour" && <CheckCircle2 className="h-3 w-3" />}
                        {st === "partiel" && <Clock className="h-3 w-3" />}
                        {st === "retard" && <AlertCircle className="h-3 w-3" />}
                        <span className="ml-1">{STATUT_LABEL[st]}</span>
                      </Badge>
                      {e.joursRetard > 0 && <p className="text-[10px] text-destructive mt-1">{e.joursRetard}j retard</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}>
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

      {/* Drawer détail élève */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-primary">{selected.prenom} {selected.nom}</SheetTitle>
                <SheetDescription>
                  {selected.classe} · {selected.cycle} · <span className="font-mono">{selected.matricule}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact parent */}
                <Card className="border">
                  <CardContent className="p-4">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Parent / Tuteur</p>
                    <p className="font-semibold">{selected.parent}</p>
                    <p className="text-sm text-muted-foreground">{selected.telephone}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline"><Phone className="h-4 w-4" />Appeler</Button>
                      <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" />SMS</Button>
                      <Button size="sm" variant="outline"><Mail className="h-4 w-4" />Email</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Synthèse financière */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-sm font-bold text-primary">{fcfa(selected.fraisAnnuel)}</p></CardContent></Card>
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Payé</p><p className="text-sm font-bold text-accent">{fcfa(selected.totalPaye)}</p></CardContent></Card>
                  <Card className="border"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Reste</p><p className="text-sm font-bold text-destructive">{fcfa(selected.resteDu)}</p></CardContent></Card>
                </div>

                {/* Détail tranches */}
                <div>
                  <h4 className="text-sm font-bold mb-3">Détail des tranches</h4>
                  <div className="space-y-3">
                    {selected.tranches.map((t) => (
                      <Card key={t.num} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm">{t.label}</p>
                              <p className="text-[11px] text-muted-foreground">Échéance : {t.echeance}</p>
                            </div>
                            <Badge variant="outline" className={
                              t.statut === "payee" ? "bg-accent/15 text-accent border-accent/30" :
                              t.statut === "partielle" ? "bg-orange-500/15 text-orange-600 border-orange-500/30" :
                              t.statut === "retard" ? "bg-destructive/15 text-destructive border-destructive/30" :
                              "bg-muted text-muted-foreground"
                            }>
                              {t.statut === "payee" ? "Payée" : t.statut === "partielle" ? "Partielle" : t.statut === "retard" ? "En retard" : "À échoir"}
                            </Badge>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Versé</span>
                              <span className="font-semibold">{fcfa(t.paye)} / {fcfa(t.montant)} FCFA</span>
                            </div>
                            <Progress value={(t.paye / t.montant) * 100} className="h-2" />
                          </div>
                          {t.statut !== "payee" && (
                            <Button size="sm" className="mt-3 w-full"><Plus className="h-4 w-4" />Encaisser cette tranche</Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
