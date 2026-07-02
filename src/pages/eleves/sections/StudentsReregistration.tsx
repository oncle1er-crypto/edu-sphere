import { useEffect, useMemo, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Search, Loader2, CheckCircle, AlertTriangle, Info, CalendarPlus } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusLegend, type LegendItem } from "@/components/help/StatusLegend";
import type { Database } from "@/integrations/supabase/types";

type Decision = "passage" | "redoublement" | "exclusion";

interface AnneeRow { id: string; libelle: string; statut: string; debut: string; fin: string; }

const MOYENNE_PASSAGE = 10; // sur 20

export default function StudentsReregistration() {
  const { ecoleId } = useEcoleId();
  const { eleves, loading } = useEleves(activeAnnee.id);
  const { classes } = useClasses(activeAnnee.id);

  const [annees, setAnnees] = useState<AnneeRow[]>([]);
  const [anneeActiveId, setAnneeActiveId] = useState<string | null>(null);
  const [anneeCibleId, setAnneeCibleId] = useState<string | null>(null);
  const [cyclesOrdre, setCyclesOrdre] = useState<Record<string, number>>({});
  const [moyennes, setMoyennes] = useState<Record<string, number>>({}); // eleve_id -> /20
  const [classesAvecNotes, setClassesAvecNotes] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("annees_scolaires")
      .select("id, libelle, statut, debut, fin")
      .eq("ecole_id", ecoleId)
      .order("debut", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as AnneeRow[];
        setAnnees(rows);
        const active = rows.find((a) => a.statut === "active") ?? rows[0] ?? null;
        setAnneeActiveId(active?.id ?? null);
        const next = active
          ? rows.find((a) => new Date(a.debut) > new Date(active.debut))
          : null;
        setAnneeCibleId(next?.id ?? active?.id ?? null);
      });

    supabase
      .from("cycles")
      .select("id, ordre")
      .eq("ecole_id", ecoleId)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((c: any) => { map[c.id] = c.ordre ?? 0; });
        setCyclesOrdre(map);
      });
  }, [ecoleId]);

  // Charger évaluations + notes pour calculer moyennes et classes éligibles
  useEffect(() => {
    if (!ecoleId || !anneeActiveId) return;
    setDataLoading(true);
    supabase
      .from("evaluations")
      .select("id, classe_id, bareme, coefficient, classes!inner(annee_id), notes(eleve_id, note)")
      .eq("ecole_id", ecoleId)
      .eq("classes.annee_id", anneeActiveId)
      .then(({ data }) => {
        const classesSet = new Set<string>();
        // eleve_id -> { sumNotes, sumCoef }
        const agg: Record<string, { s: number; c: number }> = {};
        (data ?? []).forEach((ev: any) => {
          const notes = ev.notes ?? [];
          if (notes.length > 0) classesSet.add(ev.classe_id);
          const bareme = Number(ev.bareme) || 20;
          const coef = Number(ev.coefficient) || 1;
          notes.forEach((n: any) => {
            const note20 = (Number(n.note) / bareme) * 20;
            if (!agg[n.eleve_id]) agg[n.eleve_id] = { s: 0, c: 0 };
            agg[n.eleve_id].s += note20 * coef;
            agg[n.eleve_id].c += coef;
          });
        });
        const moy: Record<string, number> = {};
        Object.entries(agg).forEach(([id, v]) => { moy[id] = v.c > 0 ? v.s / v.c : 0; });
        setMoyennes(moy);
        setClassesAvecNotes(classesSet);
        setDataLoading(false);
      });
  }, [ecoleId, anneeActiveId]);

  const anneeActive = annees.find((a) => a.id === anneeActiveId) ?? null;
  const anneeCible = annees.find((a) => a.id === anneeCibleId) ?? null;
  const nouvelleAnneeExiste = !!(anneeActive && anneeCible && anneeCible.id !== anneeActive.id);

  // ----- Ordre officiel des niveaux du système éducatif ivoirien -----
  // Préscolaire → Primaire → Collège (6e..3e, décroissant) → Lycée (2nde, 1ère, Tle)
  const NIVEAUX_IVOIRE: { keys: string[]; rank: number }[] = [
    { keys: ["petite section", "ps"], rank: 1 },
    { keys: ["moyenne section", "ms"], rank: 2 },
    { keys: ["grande section", "gs"], rank: 3 },
    { keys: ["cp1"], rank: 10 },
    { keys: ["cp2"], rank: 11 },
    { keys: ["ce1"], rank: 12 },
    { keys: ["ce2"], rank: 13 },
    { keys: ["cm1"], rank: 14 },
    { keys: ["cm2"], rank: 15 },
    { keys: ["6eme", "6e", "sixieme"], rank: 20 },
    { keys: ["5eme", "5e", "cinquieme"], rank: 21 },
    { keys: ["4eme", "4e", "quatrieme"], rank: 22 },
    { keys: ["3eme", "3e", "troisieme"], rank: 23 },
    { keys: ["2nde", "2de", "seconde"], rank: 30 },
    { keys: ["1ere", "1re", "premiere"], rank: 31 },
    { keys: ["tle", "terminale", "term"], rank: 32 },
  ];

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Renvoie { rank, section } à partir du nom d'une classe (ex: "4ème B" → {22,"B"})
  const parseNiveau = (nom: string | null | undefined): { rank: number | null; section: string } => {
    if (!nom) return { rank: null, section: "" };
    const s = normalize(nom);
    for (const r of NIVEAUX_IVOIRE) {
      for (const k of r.keys) {
        if (s === k || s.startsWith(k + " ") || s.startsWith(k)) {
          const reste = s.substring(k.length).trim();
          return { rank: r.rank, section: reste.toUpperCase() };
        }
      }
    }
    return { rank: null, section: "" };
  };

  // Liste ordonnée des classes de l'année cible (par rang officiel, puis par nom)
  const classesCible = useMemo(() => {
    const list = classes.filter((c) => c.annee_id === (anneeCibleId ?? anneeActiveId));
    return [...list].sort((a, b) => {
      const ra = parseNiveau(a.nom).rank ?? 999;
      const rb = parseNiveau(b.nom).rank ?? 999;
      if (ra !== rb) return ra - rb;
      return (a.nom ?? "").localeCompare(b.nom ?? "", "fr");
    });
  }, [classes, anneeCibleId, anneeActiveId]);

  // Pour une classe d'origine, trouver la classe suivante selon le système ivoirien
  const getClasseSuivante = (classeOrigineId: string | null | undefined): string | null => {
    if (!classeOrigineId) return null;
    const origine = classes.find((c) => c.id === classeOrigineId);
    if (!origine) return null;
    const { rank: rankOrigine, section: sectionOrigine } = parseNiveau(origine.nom);
    if (rankOrigine === null) return null;

    // Toutes les classes du niveau immédiatement supérieur (rang minimal > rankOrigine)
    const ranksDispo = classesCible
      .map((c) => parseNiveau(c.nom).rank)
      .filter((r): r is number => r !== null && r > rankOrigine);
    if (ranksDispo.length === 0) return null;
    const rankSuivant = Math.min(...ranksDispo);
    const candidates = classesCible.filter((c) => parseNiveau(c.nom).rank === rankSuivant);

    // Priorité : même section (4ème B → 3ème B), sinon première dispo
    const memeSection = candidates.find(
      (c) => sectionOrigine && parseNiveau(c.nom).section === sectionOrigine
    );
    return (memeSection ?? candidates[0]).id;
  };

  // Élèves inscrits ET appartenant à une classe avec au moins une note
  const inscrits = useMemo(
    () => eleves.filter(
      (e) => (e.statut === "inscrit" || e.statut === "actif") && e.classe_id && classesAvecNotes.has(e.classe_id)
    ),
    [eleves, classesAvecNotes]
  );

  // Auto-initialiser décisions et destinations à partir des moyennes
  useEffect(() => {
    if (dataLoading || inscrits.length === 0) return;
    setDecisions((prev) => {
      const next = { ...prev };
      inscrits.forEach((e) => {
        if (next[e.id]) return; // ne pas écraser un choix manuel
        const moy = moyennes[e.id];
        next[e.id] = moy !== undefined && moy >= MOYENNE_PASSAGE ? "passage" : "redoublement";
      });
      return next;
    });
    setDestinations((prev) => {
      const next = { ...prev };
      inscrits.forEach((e) => {
        if (next[e.id]) return;
        const dest = getClasseSuivante(e.classe_id);
        if (dest) next[e.id] = dest;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, inscrits, moyennes, classesCible]);

  const filtered = inscrits.filter(
    (d) =>
      d.nom.toLowerCase().includes(q.toLowerCase()) ||
      d.prenom.toLowerCase().includes(q.toLowerCase()) ||
      d.matricule.toLowerCase().includes(q.toLowerCase())
  );

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  const setDecision = (id: string, dec: Decision) => setDecisions((p) => ({ ...p, [id]: dec }));
  const setDestination = (id: string, classeId: string) => setDestinations((p) => ({ ...p, [id]: classeId }));

  const applyBulk = (dec: Decision) => {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un élève"); return; }
    setDecisions((p) => {
      const next = { ...p };
      selected.forEach((id) => { next[id] = dec; });
      return next;
    });
  };

  const legendItems: LegendItem[] = [
    { label: `Passage (≥ ${MOYENNE_PASSAGE}/20)`, description: "Par défaut si la moyenne annuelle est suffisante. L'élève monte automatiquement dans la classe suivante (même cycle, puis cycle supérieur). Les frais de la nouvelle année sont générés automatiquement.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
    { label: `Redoublement (< ${MOYENNE_PASSAGE}/20)`, description: "Par défaut si la moyenne est insuffisante. L'élève reprend la même classe pour la nouvelle année.", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
    { label: "Exclusion", description: "À choisir manuellement : statut passé à « exclu », plus de réinscription possible sans réactivation.", className: "bg-destructive/15 text-destructive border-destructive/40" },
    { label: "Cas d'exception", description: "Vous pouvez toujours forcer manuellement la décision ou choisir une autre classe de destination si le conseil de classe en décide ainsi.", className: "bg-muted text-muted-foreground border-border" },
  ];

  const handleValidate = async () => {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un élève"); return; }
    if (!anneeCible) { toast.error("Année cible introuvable"); return; }
    if (!ecoleId) return;

    const ids = Array.from(selected);
    for (const id of ids) {
      const dec = decisions[id] ?? "passage";
      if (dec === "passage" && !destinations[id]) {
        const el = inscrits.find((e) => e.id === id);
        toast.error(`Choisissez une classe de destination pour ${el?.nom ?? "l'élève"}`);
        return;
      }
    }

    setSaving(true);
    let ok = 0, errs = 0;
    for (const id of ids) {
      const el = inscrits.find((e) => e.id === id);
      if (!el) continue;
      const dec = decisions[id] ?? "passage";
      let updates: Database["public"]["Tables"]["eleves"]["Update"];
      if (dec === "passage") {
        updates = { annee_id: anneeCible.id, classe_id: destinations[id], statut: "inscrit" };
      } else if (dec === "redoublement") {
        updates = { annee_id: anneeCible.id, classe_id: el.classe_id, statut: "inscrit" };
      } else {
        updates = { statut: "exclu" };
      }
      const { error } = await supabase.from("eleves").update(updates).eq("id", id);
      if (error) { errs++; console.error(error); } else { ok++; }
    }
    if (ok) toast.success(`${ok} décision(s) appliquée(s) sur ${anneeCible.libelle}`);
    if (errs) toast.error(`${errs} erreur(s) lors de l'enregistrement`);
    setSelected(new Set());
    setSaving(false);
  };

  if (loading || dataLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Campagne de réinscription"
      description="Préparation du passage à l'année scolaire suivante : passage, redoublement ou exclusion."
      hideSave
    >
      {!nouvelleAnneeExiste ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 !text-amber-700" />
          <AlertTitle>Aucune année scolaire suivante n'a encore été créée</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Année courante : <strong>{anneeActive?.libelle ?? "—"}</strong>. Créez la prochaine année dans
              Paramètres → Années scolaires pour réinscrire dans la bonne année.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/parametres/academique"><CalendarPlus className="h-4 w-4 mr-1" />Créer l'année suivante</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
          <Info className="h-4 w-4 !text-emerald-700" />
          <AlertTitle>Nouvelle année prête : {anneeCible?.libelle}</AlertTitle>
          <AlertDescription>
            Seules les classes ayant au moins une évaluation notée sont affichées. La décision et la classe de
            destination sont pré-remplies automatiquement à partir de la moyenne annuelle (seuil de passage :
            <strong> {MOYENNE_PASSAGE}/20</strong>).
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
        <span className="text-sm font-medium">Année cible de la réinscription :</span>
        <Select value={anneeCibleId ?? undefined} onValueChange={setAnneeCibleId}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {annees.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.libelle} {a.statut === "active" ? "(courante)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {anneeCible && anneeActive && anneeCible.id === anneeActive.id && (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Année courante</Badge>
        )}
      </div>

      <StatusLegend title="Comment fonctionnent les décisions ?" items={legendItems} defaultOpen />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground mr-2">{selected.size} sélectionné(s)</span>
          )}
          <Button variant="outline" size="sm" onClick={() => applyBulk("passage")}>Tout en passage</Button>
          <Button variant="outline" size="sm" onClick={() => applyBulk("redoublement")}>Tout en redoublement</Button>
          <Button size="sm" onClick={handleValidate} disabled={saving || selected.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Valider la sélection
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe actuelle</TableHead>
              <TableHead>Moyenne</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead>Classe de destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => {
              const dec = decisions[d.id] ?? "passage";
              const isSel = selected.has(d.id);
              const moy = moyennes[d.id];
              return (
                <TableRow key={d.id} className={isSel ? "bg-accent/10" : ""}>
                  <TableCell>
                    <Checkbox checked={isSel} onCheckedChange={() => toggleOne(d.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.matricule}</TableCell>
                  <TableCell className="font-medium">{d.nom} {d.prenom}</TableCell>
                  <TableCell><Badge variant="secondary">{d.classe_nom ?? "Non affecté"}</Badge></TableCell>
                  <TableCell>
                    {moy !== undefined ? (
                      <Badge variant="outline" className={moy >= MOYENNE_PASSAGE ? "bg-emerald-500/10 text-emerald-700 border-emerald-300" : "bg-amber-500/10 text-amber-700 border-amber-300"}>
                        {moy.toFixed(2)}/20
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={dec} onValueChange={(v) => setDecision(d.id, v as Decision)}>
                      <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passage">Passage</SelectItem>
                        <SelectItem value="redoublement">Redoublement</SelectItem>
                        <SelectItem value="exclusion">Exclusion</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {dec === "passage" ? (
                      <Select
                        value={destinations[d.id] ?? ""}
                        onValueChange={(v) => setDestination(d.id, v)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Choisir la classe..." />
                        </SelectTrigger>
                        <SelectContent>
                          {classesCible.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : dec === "redoublement" ? (
                      <span className="text-xs text-muted-foreground italic">Même classe ({d.classe_nom ?? "—"})</span>
                    ) : (
                      <span className="text-xs text-destructive italic">Aucune (exclu)</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Aucun élève à réinscrire : il faut d'abord des évaluations notées dans les classes de l'année courante.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
