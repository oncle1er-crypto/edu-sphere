import { useEffect, useMemo, useState } from "react";
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

type Decision = "passage" | "redoublement" | "exclusion";

interface AnneeRow { id: string; libelle: string; statut: string; debut: string; fin: string; }

export default function StudentsReregistration() {
  const { ecoleId } = useEcoleId();
  const { eleves, loading } = useEleves();
  const { classes } = useClasses();

  const [annees, setAnnees] = useState<AnneeRow[]>([]);
  const [anneeActiveId, setAnneeActiveId] = useState<string | null>(null);
  const [anneeCibleId, setAnneeCibleId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
        // Année cible = la suivante si elle existe, sinon l'active
        const next = active
          ? rows.find((a) => new Date(a.debut) > new Date(active.debut))
          : null;
        setAnneeCibleId(next?.id ?? active?.id ?? null);
      });
  }, [ecoleId]);

  const anneeActive = annees.find((a) => a.id === anneeActiveId) ?? null;
  const anneeCible = annees.find((a) => a.id === anneeCibleId) ?? null;
  const nouvelleAnneeExiste = !!(anneeActive && anneeCible && anneeCible.id !== anneeActive.id);

  const inscrits = eleves.filter((e) => e.statut === "inscrit" || e.statut === "actif");
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
    { label: "Passage", description: "L'élève monte de classe. Choisissez la classe de destination ; les frais de la nouvelle année sont générés automatiquement.", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
    { label: "Redoublement", description: "L'élève reprend la même classe (moyenne insuffisante). Il reste dans sa classe actuelle pour la nouvelle année.", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
    { label: "Exclusion", description: "L'élève est exclu : statut passé à « exclu », plus de réinscription possible sans réactivation manuelle.", className: "bg-destructive/15 text-destructive border-destructive/40" },
  ];

  const handleValidate = async () => {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un élève"); return; }
    if (!anneeCible) { toast.error("Année cible introuvable"); return; }
    if (!ecoleId) return;

    // Vérifier que chaque élève a une décision et, si passage, une classe destination
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
      const updates: Record<string, any> = { annee_id: anneeCible.id };
      if (dec === "passage") {
        updates.classe_id = destinations[id];
        updates.statut = "inscrit";
      } else if (dec === "redoublement") {
        // garde la même classe
        updates.classe_id = el.classe_id;
        updates.statut = "inscrit";
      } else if (dec === "exclusion") {
        updates.statut = "exclu";
        updates.annee_id = el.annee_id; // pas de réinscription
      }
      const { error } = await supabase.from("eleves").update(updates).eq("id", id);
      if (error) { errs++; console.error(error); } else { ok++; }
    }
    if (ok) toast.success(`${ok} décision(s) appliquée(s) sur ${anneeCible.libelle}`);
    if (errs) toast.error(`${errs} erreur(s) lors de l'enregistrement`);
    setSelected(new Set());
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Campagne de réinscription"
      description="Préparation du passage à l'année scolaire suivante : passage, redoublement ou exclusion."
      hideSave
    >
      {/* Bandeau contextuel année académique */}
      {!nouvelleAnneeExiste ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 !text-amber-700" />
          <AlertTitle>Aucune année scolaire suivante n'a encore été créée</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Année courante : <strong>{anneeActive?.libelle ?? "—"}</strong>. Vous pouvez préparer les décisions
              dès maintenant, mais elles seront appliquées sur l'année <strong>en cours</strong> tant que la nouvelle
              n'est pas enregistrée. <em>Créez d'abord la prochaine année scolaire</em> dans Paramètres → Années
              scolaires pour réinscrire dans la bonne année.
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
            Les élèves validés seront <strong>réinscrits sur l'année {anneeCible?.libelle}</strong> (passage ou redoublement).
            Les exclusions restent rattachées à l'année courante {anneeActive?.libelle}.
          </AlertDescription>
        </Alert>
      )}

      {/* Sélecteur d'année cible */}
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

      {/* Légende */}
      <StatusLegend title="Comment fonctionnent les décisions ?" items={legendItems} defaultOpen />

      {/* Barre d'actions */}
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
              <TableHead>Décision</TableHead>
              <TableHead>Classe de destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => {
              const dec = decisions[d.id] ?? "passage";
              const isSel = selected.has(d.id);
              return (
                <TableRow key={d.id} className={isSel ? "bg-accent/10" : ""}>
                  <TableCell>
                    <Checkbox checked={isSel} onCheckedChange={() => toggleOne(d.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.matricule}</TableCell>
                  <TableCell className="font-medium">{d.nom} {d.prenom}</TableCell>
                  <TableCell><Badge variant="secondary">{d.classe_nom ?? "Non affecté"}</Badge></TableCell>
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
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Choisir la classe..." />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
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
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun élève trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
