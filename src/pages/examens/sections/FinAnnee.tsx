import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useDecisionsFinAnnee } from "@/hooks/useDecisionsFinAnnee";
import { CheckCircle, XCircle, RotateCcw, ArrowUpRight, Save, Users, Loader2 } from "lucide-react";

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe_id: string;
}

interface Classe {
  id: string;
  nom: string;
  annee_id: string;
}

interface AnneeScol {
  id: string;
  libelle: string;
}

type DecisionType = "passage" | "redoublement" | "exclusion" | "transfert";

const DECISION_CONFIG: Record<DecisionType, { label: string; color: string; icon: typeof CheckCircle }> = {
  passage: { label: "Passage", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: ArrowUpRight },
  redoublement: { label: "Redoublement", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: RotateCcw },
  exclusion: { label: "Exclusion", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  transfert: { label: "Transfert", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: ArrowUpRight },
};

export default function FinAnnee() {
  const { ecoleId } = useEcoleId();
  const { decisions, loading: decisionsLoading, fetchDecisions, saveBulkDecisions } = useDecisionsFinAnnee();

  const [annees, setAnnees] = useState<AnneeScol[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [selectedAnnee, setSelectedAnnee] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  // Local state for decisions being edited
  const [localDecisions, setLocalDecisions] = useState<
    Record<string, { decision: DecisionType; classe_destination_id?: string; motif?: string }>
  >({});
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load annees
  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("annees_scolaires")
      .select("id, libelle")
      .eq("ecole_id", ecoleId)
      .order("debut", { ascending: false })
      .then(({ data }) => setAnnees(data ?? []));
  }, [ecoleId]);

  // Load classes for selected annee
  useEffect(() => {
    if (!ecoleId || !selectedAnnee) return;
    supabase
      .from("classes")
      .select("id, nom, annee_id")
      .eq("ecole_id", ecoleId)
      .eq("annee_id", selectedAnnee)
      .order("nom")
      .then(({ data }) => setClasses(data ?? []));
  }, [ecoleId, selectedAnnee]);

  // Load students for selected classe
  useEffect(() => {
    if (!ecoleId || !selectedClasse) { setEleves([]); return; }
    setLoadingData(true);
    supabase
      .from("eleves")
      .select("id, nom, prenom, matricule, classe_id")
      .eq("ecole_id", ecoleId)
      .eq("classe_id", selectedClasse)
      .order("nom")
      .then(({ data }) => {
        setEleves(data ?? []);
        setLoadingData(false);
      });
  }, [ecoleId, selectedClasse]);

  // Fetch existing decisions when annee changes
  useEffect(() => {
    if (selectedAnnee) fetchDecisions(selectedAnnee);
  }, [selectedAnnee, fetchDecisions]);

  // Populate local decisions from fetched
  useEffect(() => {
    const map: typeof localDecisions = {};
    decisions.forEach((d) => {
      map[d.eleve_id] = {
        decision: d.decision as DecisionType,
        classe_destination_id: d.classe_destination_id ?? undefined,
        motif: d.motif ?? undefined,
      };
    });
    setLocalDecisions((prev) => ({ ...map, ...prev }));
  }, [decisions]);

  const filteredEleves = eleves;

  const setDecisionFor = (eleveId: string, field: string, value: string) => {
    setLocalDecisions((prev) => ({
      ...prev,
      [eleveId]: { ...prev[eleveId], decision: prev[eleveId]?.decision ?? "passage", [field]: value },
    }));
  };

  const applyBulkDecision = (decision: DecisionType) => {
    const ids = selectedIds.size > 0 ? selectedIds : new Set(filteredEleves.map((e) => e.id));
    setLocalDecisions((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = { ...next[id], decision };
      });
      return next;
    });
    toast.info(`${DECISION_CONFIG[decision].label} appliqué à ${ids.size} élève(s)`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEleves.map((e) => e.id)));
    }
    setSelectedAll(!selectedAll);
  };

  const handleSave = async () => {
    if (!selectedAnnee || !selectedClasse) return;
    setSaving(true);
    const items = filteredEleves
      .filter((e) => localDecisions[e.id])
      .map((e) => ({
        eleve_id: e.id,
        classe_origine_id: selectedClasse,
        decision: localDecisions[e.id].decision,
        classe_destination_id: localDecisions[e.id].classe_destination_id ?? null,
        motif: localDecisions[e.id].motif,
      }));
    if (items.length === 0) {
      toast.warning("Aucune décision à enregistrer");
      setSaving(false);
      return;
    }
    await saveBulkDecisions(selectedAnnee, items);
    setSaving(false);
  };

  const stats = useMemo(() => {
    const s = { passage: 0, redoublement: 0, exclusion: 0, transfert: 0, nonDecide: 0 };
    filteredEleves.forEach((e) => {
      const d = localDecisions[e.id]?.decision;
      if (d && d in s) s[d as keyof typeof s]++;
      else s.nonDecide++;
    });
    return s;
  }, [filteredEleves, localDecisions]);

  // Destination classes: all classes from all annees of same ecole
  const destinationClasses = classes;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Décisions de fin d'année
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
                  {annees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Classe</label>
              <Select value={selectedClasse} onValueChange={setSelectedClasse} disabled={!selectedAnnee}>
                <SelectTrigger><SelectValue placeholder="Choisir la classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk actions */}
          {filteredEleves.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium mr-2">Actions en masse :</span>
              {(Object.entries(DECISION_CONFIG) as [DecisionType, typeof DECISION_CONFIG["passage"]][]).map(
                ([key, cfg]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyBulkDecision(key)}
                    className="gap-1"
                  >
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </Button>
                )
              )}
              <div className="ml-auto">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}
          {filteredEleves.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-700 dark:text-green-300">{stats.passage}</div>
                <div className="text-xs text-muted-foreground">Passage</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{stats.redoublement}</div>
                <div className="text-xs text-muted-foreground">Redoublement</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-lg font-bold text-red-700 dark:text-red-300">{stats.exclusion}</div>
                <div className="text-xs text-muted-foreground">Exclusion</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.transfert}</div>
                <div className="text-xs text-muted-foreground">Transfert</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">{stats.nonDecide}</div>
                <div className="text-xs text-muted-foreground">Non décidé</div>
              </div>
            </div>
          )}

          {/* Student list */}
          {loadingData || decisionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEleves.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {selectedClasse ? "Aucun élève dans cette classe" : "Sélectionnez une année et une classe"}
            </p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left w-10">
                      <Checkbox checked={selectedAll} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left">Élève</th>
                    <th className="p-3 text-left">Matricule</th>
                    <th className="p-3 text-left">Décision</th>
                    <th className="p-3 text-left">Classe destination</th>
                    <th className="p-3 text-left">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEleves.map((eleve) => {
                    const d = localDecisions[eleve.id];
                    const decision = d?.decision ?? "";
                    return (
                      <tr key={eleve.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(eleve.id)}
                            onCheckedChange={() => toggleSelect(eleve.id)}
                          />
                        </td>
                        <td className="p-3 font-medium">{eleve.nom} {eleve.prenom}</td>
                        <td className="p-3 text-muted-foreground">{eleve.matricule}</td>
                        <td className="p-3">
                          <Select
                            value={decision}
                            onValueChange={(v) => setDecisionFor(eleve.id, "decision", v)}
                          >
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(DECISION_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {decision && (
                            <Badge className={`mt-1 text-[10px] ${DECISION_CONFIG[decision as DecisionType]?.color}`}>
                              {DECISION_CONFIG[decision as DecisionType]?.label}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {(decision === "passage" || decision === "transfert") && (
                            <Select
                              value={d?.classe_destination_id ?? ""}
                              onValueChange={(v) => setDecisionFor(eleve.id, "classe_destination_id", v)}
                            >
                              <SelectTrigger className="w-[150px] h-8">
                                <SelectValue placeholder="Classe" />
                              </SelectTrigger>
                              <SelectContent>
                                {destinationClasses.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="p-3">
                          <Input
                            className="h-8 w-[180px]"
                            placeholder="Motif (optionnel)"
                            value={d?.motif ?? ""}
                            onChange={(e) => setDecisionFor(eleve.id, "motif", e.target.value)}
                          />
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
    </div>
  );
}
