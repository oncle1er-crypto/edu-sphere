import { useEffect, useMemo, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowRight, CalendarPlus, CheckCircle2, Copy, Lock, Loader2, PlayCircle, RotateCcw, Sparkles, Unlock, Users2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { usePassagesClasse, type PlanClasseGroup } from "@/hooks/usePassagesClasse";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Annee = { id: string; libelle: string; debut: string; fin: string; decoupage: string; statut: string };
type Classe = { id: string; nom: string; annee_id: string; niveau?: string | null };

// Mapping automatique par nom de classe (préfixe le plus long)
const NIVEAUX = ["PS","MS","GS","CP1","CP2","CE1","CE2","CM1","CM2","6ème","5ème","4ème","3ème","2nde","1ère","Tle"];
function niveauSuivant(nom: string): string | null {
  const found = NIVEAUX.find((n) => nom.toUpperCase().startsWith(n.toUpperCase()));
  if (!found) return null;
  const idx = NIVEAUX.indexOf(found);
  if (idx < 0 || idx >= NIVEAUX.length - 1) return null;
  return nom.replace(new RegExp("^" + found, "i"), NIVEAUX[idx + 1]);
}

export default function SchoolsYearTransition() {
  const { ecoleId } = useEcoleId();
  const { passages, executer, annuler, cloturer, restaurer, activer, fetchPassages } = usePassagesClasse();

  const [annees, setAnnees] = useState<Annee[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [effectifs, setEffectifs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [sourceId, setSourceId] = useState("");
  const [cibleId, setCibleId] = useState("");
  const [mapping, setMapping] = useState<Record<string, string | "sortants">>({});

  // Création rapide année cible
  const [newLibelle, setNewLibelle] = useState("");
  const [newDebut, setNewDebut] = useState("");
  const [newFin, setNewFin] = useState("");

  const reload = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const [{ data: aData }, { data: cData }, { data: eData }] = await Promise.all([
      supabase.from("annees_scolaires").select("*").eq("ecole_id", ecoleId).order("debut", { ascending: false }),
      supabase.from("classes").select("id, nom, annee_id").eq("ecole_id", ecoleId),
      supabase.from("eleves").select("classe_id").eq("ecole_id", ecoleId),
    ]);
    setAnnees((aData ?? []) as any);
    setClasses((cData ?? []) as any);
    const eff: Record<string, number> = {};
    (eData ?? []).forEach((e: any) => { if (e.classe_id) eff[e.classe_id] = (eff[e.classe_id] ?? 0) + 1; });
    setEffectifs(eff);
    const active = (aData ?? []).find((a: any) => a.statut === "active");
    if (active && !sourceId) setSourceId(active.id);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [ecoleId]);

  const classesSource = useMemo(
    () => classes.filter((c) => c.annee_id === sourceId).sort((a, b) => a.nom.localeCompare(b.nom)),
    [classes, sourceId],
  );
  const classesCible = useMemo(
    () => classes.filter((c) => c.annee_id === cibleId).sort((a, b) => a.nom.localeCompare(b.nom)),
    [classes, cibleId],
  );

  // Auto-mapping quand cible change
  useEffect(() => {
    if (!cibleId || classesSource.length === 0) return;
    const m: Record<string, string | "sortants"> = {};
    classesSource.forEach((cs) => {
      // 1. nom identique
      let cible = classesCible.find((cc) => cc.nom.toLowerCase() === cs.nom.toLowerCase());
      // 2. niveau suivant
      if (!cible) {
        const suivant = niveauSuivant(cs.nom);
        if (suivant) cible = classesCible.find((cc) => cc.nom.toLowerCase() === suivant.toLowerCase());
      }
      m[cs.id] = cible ? cible.id : "sortants";
    });
    setMapping(m);
  }, [cibleId, classesSource, classesCible]);

  const creerAnneeCible = async () => {
    if (!ecoleId || !newLibelle || !newDebut || !newFin) { toast.error("Renseigne libellé et dates"); return; }
    setBusy("creer");
    const { data, error } = await supabase
      .from("annees_scolaires")
      .insert({ ecole_id: ecoleId, libelle: newLibelle, debut: newDebut, fin: newFin, decoupage: "trimestre", statut: "preparation" })
      .select().single();
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setCibleId(data.id);
    await reload();
  };

  const lancerPassage = async () => {
    if (!sourceId || !cibleId) { toast.error("Sélectionne l'année source et cible"); return; }
    const plan: PlanClasseGroup[] = classesSource.map((cs) => {
      const cible = mapping[cs.id];
      const isSortants = cible === "sortants" || !cible;
      return {
        classe_source_id: cs.id,
        classe_cible_id: isSortants ? null : (cible as string),
        action_defaut: isSortants ? "sortant" : "promu",
        eleves: [], // vide → prendra tous les élèves via seed ci-dessous
      };
    });

    // Charger tous les élèves actifs de l'année source, groupés par classe
    const { data: elevesData, error: eErr } = await supabase
      .from("eleves").select("id, classe_id")
      .eq("ecole_id", ecoleId).eq("annee_id", sourceId)
      .not("statut", "in", "(exclu,transfere)");
    if (eErr) { toast.error(eErr.message); return; }

    const byClasse: Record<string, string[]> = {};
    (elevesData ?? []).forEach((e: any) => {
      if (e.classe_id) (byClasse[e.classe_id] ||= []).push(e.id);
    });

    plan.forEach((g) => {
      const ids = byClasse[g.classe_source_id] ?? [];
      g.eleves = ids.map((id) => ({ eleve_id: id }));
    });

    setBusy("passage");
    await executer(sourceId, cibleId, plan);
    setBusy(null);
    await reload();
  };

  const dupliquerClasses = async () => {
    if (!ecoleId || !sourceId || !cibleId) { toast.error("Sélectionne l'année source et l'année cible"); return; }
    setBusy("dupliquer");
    const { data: srcClasses, error: sErr } = await supabase
      .from("classes")
      .select("nom, cycle_id, capacite, salle, salle_id")
      .eq("ecole_id", ecoleId).eq("annee_id", sourceId);
    if (sErr) { setBusy(null); toast.error(sErr.message); return; }

    const existingNames = new Set(
      classesCible.map((c) => c.nom.toLowerCase())
    );
    const toInsert = (srcClasses ?? [])
      .filter((c: any) => !existingNames.has(c.nom.toLowerCase()))
      .map((c: any) => ({
        ecole_id: ecoleId,
        annee_id: cibleId,
        nom: c.nom,
        cycle_id: c.cycle_id,
        capacite: c.capacite,
        salle: c.salle,
        salle_id: c.salle_id,
      }));

    if (toInsert.length === 0) {
      setBusy(null);
      toast.info("Toutes les classes existent déjà dans l'année cible.");
      return;
    }
    const { error } = await supabase.from("classes").insert(toInsert);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${toInsert.length} classe(s) dupliquée(s) vers l'année cible.`);
    await reload();
  };

  const cibleAnnee = annees.find((a) => a.id === cibleId);
  const sourceAnnee = annees.find((a) => a.id === sourceId);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Sélection années */}
      <SettingsSection
        icon={<Sparkles className="h-5 w-5" />}
        title="Passage de classe — assistant simplifié"
        description="Sélectionne l'année source et l'année cible, ajuste le mapping des classes, puis lance le passage en un clic. Chaque passage est journalisé et peut être annulé tant que l'année cible n'est pas clôturée."
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Année source">
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {annees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.libelle} — {a.statut}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Année cible">
            <Select value={cibleId} onValueChange={setCibleId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {annees.filter((a) => a.id !== sourceId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.libelle} — {a.statut}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        {sourceAnnee && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">Source : {sourceAnnee.libelle} ({sourceAnnee.statut})</Badge>
            {cibleAnnee && <Badge>Cible : {cibleAnnee.libelle} ({cibleAnnee.statut})</Badge>}
          </div>
        )}
      </SettingsSection>

      {/* Création rapide année cible */}
      {!cibleId && (
        <SettingsSection
          icon={<CalendarPlus className="h-5 w-5" />}
          title="Créer rapidement l'année cible"
          description="Si l'année à venir n'existe pas encore."
          hideSave
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRow label="Libellé"><Input value={newLibelle} onChange={(e) => setNewLibelle(e.target.value)} placeholder="2026 - 2027" /></FieldRow>
            <FieldRow label="Début"><Input type="date" value={newDebut} onChange={(e) => setNewDebut(e.target.value)} /></FieldRow>
            <FieldRow label="Fin"><Input type="date" value={newFin} onChange={(e) => setNewFin(e.target.value)} /></FieldRow>
          </div>
          <div className="flex justify-end">
            <Button onClick={creerAnneeCible} disabled={busy === "creer"}>
              {busy === "creer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              Créer l'année
            </Button>
          </div>
        </SettingsSection>
      )}

      {/* Mapping classes */}
      {sourceId && cibleId && (
        <SettingsSection
          icon={<Users2 className="h-5 w-5" />}
          title="Mapping des classes"
          description="Pour chaque classe de l'année source, choisis la classe cible dans l'année à venir. Les élèves sans classe cible seront marqués sortants (fin de cursus)."
          hideSave
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <p className="text-xs text-muted-foreground">
              {classesCible.length} classe(s) dans l'année cible. Dupliquer recopie les classes source manquantes (nom, cycle, capacité, salle).
            </p>
            <Button size="sm" variant="outline" onClick={dupliquerClasses} disabled={busy === "dupliquer" || !sourceId || !cibleId}>
              {busy === "dupliquer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Dupliquer les classes source → cible
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe source</TableHead>
                  <TableHead className="w-24 text-center">Élèves</TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Classe cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classesSource.map((cs) => (
                  <TableRow key={cs.id}>
                    <TableCell className="font-medium">{cs.nom}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{effectifs[cs.id] ?? 0}</Badge>
                    </TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell>
                      <Select
                        value={mapping[cs.id] ?? "sortants"}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [cs.id]: v as any }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sortants">Sortants (fin de cursus)</SelectItem>
                          {classesCible.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>{cc.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {classesSource.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                    Aucune classe dans l'année source.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <p className="text-xs text-muted-foreground">
              Le mapping automatique passe au niveau suivant (ex. CP1 → CP2, CM2 → 6ème). Ajuste manuellement au besoin.
            </p>
            <Button onClick={lancerPassage} disabled={busy === "passage" || classesSource.length === 0 || !cibleId}>
              {busy === "passage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Lancer le passage
            </Button>
          </div>
        </SettingsSection>
      )}

      {/* Actions annuelles */}
      {sourceAnnee && (
        <SettingsSection
          icon={<Lock className="h-5 w-5" />}
          title="Clôture & activation"
          description="Clôture définitivement l'année source (lecture seule) ou active l'année cible pour que toute l'application n'affiche que ses données."
          hideSave
        >
          <div className="flex flex-wrap gap-2">
            {cibleAnnee && cibleAnnee.statut !== "active" && (
              <Button variant="default" onClick={async () => { setBusy("activer"); await activer(cibleId); setBusy(null); await reload(); }}
                      disabled={busy === "activer"}>
                {busy === "activer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Activer {cibleAnnee.libelle}
              </Button>
            )}
            {sourceAnnee.statut !== "cloturee" && (
              <Button variant="outline" onClick={async () => {
                if (!confirm(`Clôturer définitivement l'année ${sourceAnnee.libelle} ? Elle passera en lecture seule.`)) return;
                setBusy("cloturer"); await cloturer(sourceAnnee.id); setBusy(null); await reload();
              }} disabled={busy === "cloturer"}>
                {busy === "cloturer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Clôturer {sourceAnnee.libelle}
              </Button>
            )}
            {(sourceAnnee.statut === "cloturee" || sourceAnnee.statut === "archivee") && (
              <Button variant="secondary" onClick={async () => {
                setBusy("restaurer"); await restaurer(sourceAnnee.id); setBusy(null); await reload();
              }} disabled={busy === "restaurer"}>
                {busy === "restaurer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Restaurer {sourceAnnee.libelle}
              </Button>
            )}
          </div>
        </SettingsSection>
      )}

      {/* Historique des passages */}
      <SettingsSection
        icon={<RotateCcw className="h-5 w-5" />}
        title="Historique des passages"
        description="Chaque passage est journalisé et peut être annulé tant que l'année cible n'est pas clôturée."
        hideSave
      >
        {passages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun passage journalisé pour le moment.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source → Cible</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passages.map((p) => {
                  const src = annees.find((a) => a.id === p.annee_source)?.libelle ?? "?";
                  const tgt = annees.find((a) => a.id === p.annee_cible)?.libelle ?? "?";
                  const r = p.resultat ?? {};
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        {formatDistanceToNow(new Date(p.execute_le), { addSuffix: true, locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm">{src} → {tgt}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary">{r.promus ?? 0} promus</Badge>{" "}
                        <Badge variant="outline">{r.redoubles ?? 0} redoubl.</Badge>{" "}
                        <Badge variant="outline">{r.sortants ?? 0} sort.</Badge>
                      </TableCell>
                      <TableCell>
                        {p.annule_le ? <Badge variant="destructive">Annulé</Badge> : <Badge>Actif</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!p.annule_le && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm("Annuler ce passage ? Les inscriptions créées dans l'année cible seront supprimées.")) return;
                            await annuler(p.id); await reload();
                          }}>
                            <RotateCcw className="h-3.5 w-3.5" /> Annuler
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
