import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useDecisionsFinAnnee } from "@/hooks/useDecisionsFinAnnee";
import {
  CheckCircle, XCircle, RotateCcw, ArrowUpRight, Save, Users, Loader2,
  ShieldCheck, Lock, Play, History, FileText, AlertTriangle,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpBanner, StatusLegend, STATUTS_DECISION_FIN_ANNEE } from "@/components/help";

interface Eleve { id: string; nom: string; prenom: string; matricule: string; classe_id: string; }
interface Classe { id: string; nom: string; annee_id: string; }
interface AnneeScol { id: string; libelle: string; }

type DecisionType = "passage" | "redoublement" | "exclusion" | "transfert";
type StatutType = "brouillon" | "valide" | "verrouille" | "applique";

const DECISION_CONFIG: Record<DecisionType, { label: string; color: string; icon: typeof CheckCircle }> = {
  passage: { label: "Passage", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: ArrowUpRight },
  redoublement: { label: "Redoublement", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: RotateCcw },
  exclusion: { label: "Exclusion", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  transfert: { label: "Transfert", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: ArrowUpRight },
};

const STATUT_CONFIG: Record<StatutType, { label: string; color: string; icon: typeof FileText }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground", icon: FileText },
  valide: { label: "Validé", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: ShieldCheck },
  verrouille: { label: "Verrouillé", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Lock },
  applique: { label: "Appliqué", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
};

export default function FinAnnee() {
  const { ecoleId } = useEcoleId();
  const {
    decisions, auditLog, loading: decisionsLoading,
    fetchDecisions, fetchAuditLog, saveBulkDecisions, changeStatut, appliquerDecisions,
  } = useDecisionsFinAnnee();

  const [annees, setAnnees] = useState<AnneeScol[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [selectedAnnee, setSelectedAnnee] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [localDecisions, setLocalDecisions] = useState<
    Record<string, { decision: DecisionType; classe_destination_id?: string; motif?: string }>
  >({});
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);

  // Parcours state
  const [parcoursEleve, setParcoursEleve] = useState<string>("");
  const [parcours, setParcours] = useState<any[]>([]);
  const [loadingParcours, setLoadingParcours] = useState(false);
  const [allEleves, setAllEleves] = useState<Eleve[]>([]);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("annees_scolaires").select("id, libelle").eq("ecole_id", ecoleId)
      .order("debut", { ascending: false }).then(({ data }) => setAnnees(data ?? []));
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleId || !selectedAnnee) return;
    supabase.from("classes").select("id, nom, annee_id").eq("ecole_id", ecoleId)
      .eq("annee_id", selectedAnnee).order("nom").then(({ data }) => setClasses(data ?? []));
  }, [ecoleId, selectedAnnee]);

  useEffect(() => {
    if (!ecoleId || !selectedClasse || !selectedAnnee) { setEleves([]); return; }
    setLoadingData(true);
    (async () => {
      // 1) Élèves actuellement dans la classe
      const currentRes = await supabase
        .from("eleves")
        .select("id, nom, prenom, matricule, classe_id")
        .eq("ecole_id", ecoleId)
        .eq("classe_id", selectedClasse);

      // 2) Élèves qui avaient une décision pour cette classe d'origine
      //    (ils ont pu être déplacés vers leur classe de destination après application)
      const decRes = await supabase
        .from("decisions_fin_annee" as any)
        .select("eleve_id")
        .eq("ecole_id", ecoleId)
        .eq("annee_id", selectedAnnee)
        .eq("classe_origine_id", selectedClasse);
      const decidedIds = ((decRes.data as any[]) ?? []).map((d) => d.eleve_id);

      let decidedEleves: Eleve[] = [];
      if (decidedIds.length > 0) {
        const dRes = await supabase
          .from("eleves")
          .select("id, nom, prenom, matricule, classe_id")
          .eq("ecole_id", ecoleId)
          .in("id", decidedIds);
        decidedEleves = (dRes.data ?? []) as Eleve[];
      }

      const merged = new Map<string, Eleve>();
      ((currentRes.data ?? []) as Eleve[]).forEach((e) => merged.set(e.id, e));
      decidedEleves.forEach((e) => merged.set(e.id, e));
      const list = Array.from(merged.values()).sort((a, b) => a.nom.localeCompare(b.nom));
      setEleves(list);
      setLoadingData(false);
    })();
  }, [ecoleId, selectedClasse, selectedAnnee]);

  useEffect(() => {
    if (selectedAnnee) {
      fetchDecisions(selectedAnnee);
      fetchAuditLog(selectedAnnee);
    }
  }, [selectedAnnee, fetchDecisions, fetchAuditLog]);

  // Load all eleves for parcours search
  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("eleves").select("id, nom, prenom, matricule, classe_id").eq("ecole_id", ecoleId)
      .order("nom").limit(1000).then(({ data }) => setAllEleves(data ?? []));
  }, [ecoleId]);

  useEffect(() => {
    const map: typeof localDecisions = {};
    decisions.forEach((d) => {
      if (d.classe_origine_id === selectedClasse) {
        map[d.eleve_id] = {
          decision: d.decision as DecisionType,
          classe_destination_id: d.classe_destination_id ?? undefined,
          motif: d.motif ?? undefined,
        };
      }
    });
    setLocalDecisions(map);
  }, [decisions, selectedClasse]);

  // Parcours fetch
  useEffect(() => {
    if (!ecoleId || !parcoursEleve) { setParcours([]); return; }
    setLoadingParcours(true);
    supabase
      .from("parcours_scolaire" as any)
      .select("*, annees_scolaires(libelle), classes(nom)")
      .eq("ecole_id", ecoleId)
      .eq("eleve_id", parcoursEleve)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setParcours((data as any[]) ?? []);
        setLoadingParcours(false);
      });
  }, [ecoleId, parcoursEleve]);

  const classeDecisions = useMemo(() => {
    return decisions.filter((d) => d.classe_origine_id === selectedClasse);
  }, [decisions, selectedClasse]);

  const classeStatut = useMemo((): StatutType | null => {
    if (classeDecisions.length === 0) return null;
    const statuts = classeDecisions.map((d) => d.statut);
    if (statuts.every((s) => s === "applique")) return "applique";
    if (statuts.every((s) => s === "verrouille")) return "verrouille";
    if (statuts.every((s) => s === "valide")) return "valide";
    return "brouillon";
  }, [classeDecisions]);

  const isLocked = classeStatut === "verrouille" || classeStatut === "applique";
  const isApplied = classeStatut === "applique";

  // Ordre pédagogique des niveaux (maternelle → terminale)
  const NIVEAU_ORDER = [
    "PS", "MS", "GS",
    "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
    "6EME", "5EME", "4EME", "3EME",
    "2NDE", "1ERE", "TLE",
  ];
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/È|É|Ê/g, "E")
      .replace(/[^A-Z0-9]/g, "");
  const niveauIndex = (nom: string) => {
    const n = normalize(nom);
    let best = -1;
    NIVEAU_ORDER.forEach((lvl, i) => {
      if (n.startsWith(lvl) && lvl.length > (best >= 0 ? NIVEAU_ORDER[best].length : 0)) best = i;
    });
    return best;
  };
  const getNextClasseId = (currentClasseId: string): string | undefined => {
    const current = classes.find((c) => c.id === currentClasseId);
    if (!current) return undefined;
    const currentIdx = niveauIndex(current.nom);
    if (currentIdx < 0 || currentIdx >= NIVEAU_ORDER.length - 1) return undefined;
    const nextLvl = NIVEAU_ORDER[currentIdx + 1];
    // Même suffixe (A/B/…) en priorité
    const currentSuffix = normalize(current.nom).slice(NIVEAU_ORDER[currentIdx].length);
    const candidates = classes.filter((c) => normalize(c.nom).startsWith(nextLvl));
    if (candidates.length === 0) return undefined;
    const sameSuffix = candidates.find((c) => normalize(c.nom).slice(nextLvl.length) === currentSuffix);
    return (sameSuffix ?? candidates[0]).id;
  };

  const setDecisionFor = (eleveId: string, field: string, value: string) => {
    if (isLocked) return;
    setLocalDecisions((prev) => {
      const eleve = eleves.find((e) => e.id === eleveId);
      const current = prev[eleveId] ?? { decision: "passage" as DecisionType };
      const next = { ...current, [field]: value };
      if (field === "decision" && value === "passage" && !next.classe_destination_id && eleve) {
        const dest = getNextClasseId(eleve.classe_id);
        if (dest) next.classe_destination_id = dest;
      }
      if (field === "decision" && value !== "passage" && value !== "transfert") {
        next.classe_destination_id = undefined;
      }
      return { ...prev, [eleveId]: next };
    });
  };

  const applyBulkDecision = (decision: DecisionType) => {
    if (isLocked) return;
    const ids = selectedIds.size > 0 ? selectedIds : new Set(eleves.map((e) => e.id));
    setLocalDecisions((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        const eleve = eleves.find((e) => e.id === id);
        const cur = next[id] ?? {} as any;
        const updated: any = { ...cur, decision };
        if (decision === "passage" && !updated.classe_destination_id && eleve) {
          const dest = getNextClasseId(eleve.classe_id);
          if (dest) updated.classe_destination_id = dest;
        }
        if (decision !== "passage" && decision !== "transfert") {
          updated.classe_destination_id = undefined;
        }
        next[id] = updated;
      });
      return next;
    });
    toast.info(`${DECISION_CONFIG[decision].label} appliqué à ${ids.size} élève(s)`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selectedAll) setSelectedIds(new Set());
    else setSelectedIds(new Set(eleves.map((e) => e.id)));
    setSelectedAll(!selectedAll);
  };

  const handleSave = async () => {
    if (!selectedAnnee || !selectedClasse) return;
    setSaving(true);
    const items = eleves
      .filter((e) => localDecisions[e.id])
      .map((e) => ({
        eleve_id: e.id,
        classe_origine_id: selectedClasse,
        decision: localDecisions[e.id].decision,
        classe_destination_id: localDecisions[e.id].classe_destination_id ?? null,
        motif: localDecisions[e.id].motif,
      }));
    if (items.length === 0) { toast.warning("Aucune décision"); setSaving(false); return; }
    await saveBulkDecisions(selectedAnnee, items);
    setSaving(false);
  };

  const handleValidate = async () => {
    const ids = classeDecisions.filter((d) => d.statut === "brouillon").map((d) => d.id);
    if (ids.length === 0) { toast.warning("Aucune décision en brouillon"); return; }
    await changeStatut(selectedAnnee, ids, "valide");
  };

  const handleLock = async () => {
    const ids = classeDecisions.filter((d) => d.statut === "valide").map((d) => d.id);
    if (ids.length === 0) { toast.warning("Aucune décision validée"); return; }
    await changeStatut(selectedAnnee, ids, "verrouille");
  };

  const handleApply = async () => {
    setConfirmApply(false);
    setApplying(true);
    const result = await appliquerDecisions(selectedAnnee);
    setApplying(false);
    if (result) {
      toast.success(`${(result as any).parcours} parcours créés, ${(result as any).affectations} élèves affectés`);
    }
  };

  const stats = useMemo(() => {
    const s = { passage: 0, redoublement: 0, exclusion: 0, transfert: 0, nonDecide: 0 };
    eleves.forEach((e) => {
      const d = localDecisions[e.id]?.decision;
      if (d && d in s) s[d as keyof typeof s]++;
      else s.nonDecide++;
    });
    return s;
  }, [eleves, localDecisions]);

  const destinationClasses = classes;

  return (
    <div className="space-y-6">
      <HelpBanner storageKey="exams-fin-annee" title="Comment fonctionnent les décisions de fin d'année ?">
        Pour chaque élève, choisissez une décision : <strong>Passage</strong> (classe supérieure), <strong>Redoublement</strong> (même classe), <strong>Transfert</strong> ou <strong>Exclusion</strong>.
        Cycle de vie d'une classe : <strong>Brouillon</strong> → <strong>Validé</strong> → <strong>Verrouillé</strong> → <strong>Appliqué</strong>. Une fois <em>appliqué</em>, les élèves changent automatiquement de classe et le parcours est archivé.
      </HelpBanner>
      <StatusLegend title="Types de décisions" items={STATUTS_DECISION_FIN_ANNEE} defaultOpen={false} />
      <Tabs defaultValue="decisions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="decisions" className="gap-2"><Users className="h-4 w-4" /> Décisions</TabsTrigger>
          <TabsTrigger value="parcours" className="gap-2"><History className="h-4 w-4" /> Parcours scolaire</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><FileText className="h-4 w-4" /> Piste d'audit</TabsTrigger>
        </TabsList>

        {/* ========== DECISIONS TAB ========== */}
        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Décisions de fin d'année
                {classeStatut && (
                  <Badge className={`ml-2 ${STATUT_CONFIG[classeStatut].color}`}>
                    {React.createElement(STATUT_CONFIG[classeStatut].icon, { className: "h-3 w-3 mr-1 inline" })}
                    {STATUT_CONFIG[classeStatut].label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Année scolaire</label>
                  <Select value={selectedAnnee} onValueChange={(v) => { setSelectedAnnee(v); setSelectedClasse(""); }}>
                    <SelectTrigger><SelectValue placeholder="Choisir l'année" /></SelectTrigger>
                    <SelectContent>
                      {annees.map((a) => <SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Classe</label>
                  <Select value={selectedClasse} onValueChange={setSelectedClasse} disabled={!selectedAnnee}>
                    <SelectTrigger><SelectValue placeholder="Choisir la classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Workflow actions bar */}
              {eleves.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  {!isLocked && (
                    <>
                      <span className="text-sm font-medium mr-2">Actions en masse :</span>
                      {(Object.entries(DECISION_CONFIG) as [DecisionType, typeof DECISION_CONFIG["passage"]][]).map(
                        ([key, cfg]) => (
                          <Button key={key} variant="outline" size="sm" onClick={() => applyBulkDecision(key)} className="gap-1">
                            <cfg.icon className="h-3.5 w-3.5" /> {cfg.label}
                          </Button>
                        )
                      )}
                      <div className="ml-auto flex gap-2">
                        <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Enregistrer
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Workflow buttons */}
              {classeDecisions.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg bg-card">
                  <span className="text-sm font-semibold">Workflow :</span>
                  <Button
                    variant="outline" size="sm" className="gap-1"
                    disabled={classeStatut !== "brouillon"}
                    onClick={handleValidate}
                  >
                    <ShieldCheck className="h-4 w-4" /> Valider
                  </Button>
                  <span className="text-muted-foreground">→</span>
                  <Button
                    variant="outline" size="sm" className="gap-1"
                    disabled={classeStatut !== "valide"}
                    onClick={handleLock}
                  >
                    <Lock className="h-4 w-4" /> Verrouiller
                  </Button>
                  <span className="text-muted-foreground">→</span>
                  <Button
                    size="sm" className="gap-1"
                    disabled={classeStatut !== "verrouille" || applying}
                    onClick={() => setConfirmApply(true)}
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Appliquer les affectations
                  </Button>
                  {isApplied && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" /> Affectations effectuées
                    </Badge>
                  )}
                </div>
              )}

              {/* Stats */}
              {eleves.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: "passage", bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300" },
                    { key: "redoublement", bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300" },
                    { key: "exclusion", bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
                    { key: "transfert", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300" },
                    { key: "nonDecide", bg: "bg-muted", text: "" },
                  ].map(({ key, bg, text }) => (
                    <div key={key} className={`text-center p-2 rounded-lg ${bg}`}>
                      <div className={`text-lg font-bold ${text}`}>{stats[key as keyof typeof stats]}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key === "nonDecide" ? "Non décidé" : key}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Student table */}
              {loadingData || decisionsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : eleves.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {selectedClasse ? "Aucun élève dans cette classe" : "Sélectionnez une année et une classe"}
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left w-10">
                          <Checkbox checked={selectedAll} onCheckedChange={toggleAll} disabled={isLocked} />
                        </th>
                        <th className="p-3 text-left">Élève</th>
                        <th className="p-3 text-left">Matricule</th>
                        <th className="p-3 text-left">Décision</th>
                        <th className="p-3 text-left">Classe destination</th>
                        <th className="p-3 text-left">Motif</th>
                        <th className="p-3 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eleves.map((eleve) => {
                        const d = localDecisions[eleve.id];
                        const decision = d?.decision ?? "";
                        const dbDecision = classeDecisions.find((x) => x.eleve_id === eleve.id);
                        const statut = (dbDecision?.statut ?? "brouillon") as StatutType;
                        const rowLocked = statut === "verrouille" || statut === "applique";
                        return (
                          <tr key={eleve.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3">
                              <Checkbox checked={selectedIds.has(eleve.id)} onCheckedChange={() => toggleSelect(eleve.id)} disabled={rowLocked} />
                            </td>
                            <td className="p-3 font-medium">{eleve.nom} {eleve.prenom}</td>
                            <td className="p-3 text-muted-foreground">{eleve.matricule}</td>
                            <td className="p-3">
                              <Select value={decision} onValueChange={(v) => setDecisionFor(eleve.id, "decision", v)} disabled={rowLocked}>
                                <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(DECISION_CONFIG).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              {(decision === "passage" || decision === "transfert") && (
                                <Select
                                  value={d?.classe_destination_id ?? ""}
                                  onValueChange={(v) => setDecisionFor(eleve.id, "classe_destination_id", v)}
                                  disabled={rowLocked}
                                >
                                  <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Classe" /></SelectTrigger>
                                  <SelectContent>
                                    {destinationClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="p-3">
                              <Input className="h-8 w-[180px]" placeholder="Motif" value={d?.motif ?? ""}
                                onChange={(e) => setDecisionFor(eleve.id, "motif", e.target.value)} disabled={rowLocked} />
                            </td>
                            <td className="p-3">
                              <Badge className={`text-[10px] ${STATUT_CONFIG[statut]?.color ?? ""}`}>
                                {STATUT_CONFIG[statut]?.label ?? statut}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== PARCOURS TAB ========== */}
        <TabsContent value="parcours">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Parcours scolaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Rechercher un élève</label>
                <Select value={parcoursEleve} onValueChange={setParcoursEleve}>
                  <SelectTrigger className="w-full sm:w-96"><SelectValue placeholder="Sélectionner un élève..." /></SelectTrigger>
                  <SelectContent>
                    {allEleves.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom} — {e.matricule}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingParcours ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : parcoursEleve && parcours.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun parcours enregistré pour cet élève.</p>
              ) : parcours.length > 0 ? (
                <div className="space-y-3">
                  {parcours.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <GraduationIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{p.annees_scolaires?.libelle ?? "—"}</div>
                        <div className="text-sm text-muted-foreground">Classe : {p.classes?.nom ?? "—"}</div>
                        {p.moyenne_generale && <div className="text-sm">Moyenne : {p.moyenne_generale}/20</div>}
                        {p.rang && <div className="text-sm">Rang : {p.rang}e</div>}
                      </div>
                      <div>
                        {p.decision && (
                          <Badge className={DECISION_CONFIG[p.decision as DecisionType]?.color ?? "bg-muted"}>
                            {DECISION_CONFIG[p.decision as DecisionType]?.label ?? p.decision}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== AUDIT TAB ========== */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Piste d'audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAnnee ? (
                <p className="text-center text-muted-foreground py-8">Sélectionnez une année pour voir l'historique.</p>
              ) : auditLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune action enregistrée.</p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Ancien statut</TableHead>
                        <TableHead>Nouveau statut</TableHead>
                        <TableHead>Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString("fr-CI")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{entry.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.ancien_statut ?? "—"}</TableCell>
                          <TableCell className="text-sm">{entry.nouveau_statut ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {entry.details ? JSON.stringify(entry.details) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Apply Dialog */}
      <Dialog open={confirmApply} onOpenChange={setConfirmApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Confirmer l'application
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action va <strong>affecter les élèves</strong> dans leurs nouvelles classes selon les décisions verrouillées.
            Cette opération est <strong>irréversible</strong>. Êtes-vous sûr ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApply(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleApply} className="gap-2">
              <Play className="h-4 w-4" /> Appliquer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GraduationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </svg>
  );
}
