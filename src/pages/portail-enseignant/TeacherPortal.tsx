import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMyEnseignant } from "@/hooks/useMyEnseignant";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BookOpen, Calendar, ClipboardList, Loader2, GraduationCap, LogOut, Users, ArrowRight, Plus, Pencil,
} from "lucide-react";
import { NewEvaluationDialog } from "./NewEvaluationDialog";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface ClasseRow { id: string; nom: string; salle: string | null; effectif: number; role: "principal" | "intervenant"; matieres: string[]; }
interface CreneauRow { id: string; jour: number; heure_debut: string; heure_fin: string; classe: string; matiere: string; salle: string | null; }
interface EvalRow { id: string; titre: string; type: string; date_eval: string; bareme: number; classe: string; matiere: string; notes_count: number; }

export default function TeacherPortal() {
  const { enseignant, loading } = useMyEnseignant();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClasseRow[]>([]);
  const [creneaux, setCreneaux] = useState<CreneauRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [newEvalOpen, setNewEvalOpen] = useState(false);
  const [newEvalClasseId, setNewEvalClasseId] = useState<string | undefined>(undefined);


  useEffect(() => {
    if (!enseignant) return;
    (async () => {
      setDataLoading(true);
      const eid = enseignant.id;
      const ecole = enseignant.ecole_id;

      // 1) Classes principal + intervenant via enseignant_matieres
      const [{ data: principalClasses }, { data: emRows }] = await Promise.all([
        supabase.from("classes").select("id, nom, salle").eq("ecole_id", ecole).eq("professeur_principal_id", eid),
        supabase.from("enseignant_matieres").select("classe_id, classes(id, nom, salle), matieres(nom)").eq("ecole_id", ecole).eq("enseignant_id", eid),
      ]);
      const byClass = new Map<string, ClasseRow>();
      (principalClasses ?? []).forEach((c: any) => {
        byClass.set(c.id, { id: c.id, nom: c.nom, salle: c.salle, effectif: 0, role: "principal", matieres: [] });
      });
      (emRows ?? []).forEach((r: any) => {
        if (!r.classe_id || !r.classes) return;
        const ex = byClass.get(r.classe_id);
        if (ex) {
          if (r.matieres?.nom && !ex.matieres.includes(r.matieres.nom)) ex.matieres.push(r.matieres.nom);
        } else {
          byClass.set(r.classe_id, { id: r.classe_id, nom: r.classes.nom, salle: r.classes.salle, effectif: 0, role: "intervenant", matieres: r.matieres?.nom ? [r.matieres.nom] : [] });
        }
      });
      // Effectifs
      const classIds = Array.from(byClass.keys());
      if (classIds.length > 0) {
        const { data: eleves } = await supabase.from("eleves").select("classe_id").in("classe_id", classIds).eq("ecole_id", ecole);
        const counts = new Map<string, number>();
        (eleves ?? []).forEach((e: any) => counts.set(e.classe_id, (counts.get(e.classe_id) ?? 0) + 1));
        counts.forEach((n, id) => { const c = byClass.get(id); if (c) c.effectif = n; });
      }
      setClasses(Array.from(byClass.values()).sort((a, b) => a.nom.localeCompare(b.nom)));

      // 2) Emploi du temps
      const { data: cr } = await supabase
        .from("creneaux_emploi_temps")
        .select("id, jour, heure_debut, heure_fin, salle, classes(nom), matieres(nom)")
        .eq("ecole_id", ecole)
        .eq("enseignant_id", eid)
        .order("jour").order("heure_debut");
      setCreneaux((cr ?? []).map((c: any) => ({
        id: c.id, jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
        classe: c.classes?.nom ?? "—", matiere: c.matieres?.nom ?? "—", salle: c.salle,
      })));

      // 3) Évaluations récentes
      const { data: evs } = await supabase
        .from("evaluations")
        .select("id, titre, type, date_eval, bareme, classes(nom), matieres(nom)")
        .eq("ecole_id", ecole)
        .eq("enseignant_id", eid)
        .order("date_eval", { ascending: false })
        .limit(10);
      const evIds = (evs ?? []).map((e: any) => e.id);
      const counts = new Map<string, number>();
      if (evIds.length > 0) {
        const { data: notes } = await supabase.from("notes").select("evaluation_id").in("evaluation_id", evIds);
        (notes ?? []).forEach((n: any) => counts.set(n.evaluation_id, (counts.get(n.evaluation_id) ?? 0) + 1));
      }
      setEvaluations((evs ?? []).map((e: any) => ({
        id: e.id, titre: e.titre, type: e.type, date_eval: e.date_eval, bareme: Number(e.bareme),
        classe: e.classes?.nom ?? "—", matiere: e.matieres?.nom ?? "—",
        notes_count: counts.get(e.id) ?? 0,
      })));

      setDataLoading(false);
    })();
  }, [enseignant]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Portail enseignant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Votre compte ({user?.email}) n'est rattaché à <strong>aucun profil enseignant</strong>.</p>
            <p className="text-muted-foreground">Demandez à l'administration de lier votre compte à votre fiche dans <em>Enseignants → Liste</em>.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={signOut} className="flex-1"><LogOut className="h-4 w-4" /> Se déconnecter</Button>
              <Button asChild className="flex-1"><Link to="/">Accueil</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = `${enseignant.prenom[0] ?? ""}${enseignant.nom[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold leading-tight">Portail enseignant</h1>
              <p className="text-xs opacity-80">Complexe Scolaire La Providence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm"><Link to="/">Admin</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profil */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              {enseignant.photo_url ? <AvatarImage src={enseignant.photo_url} /> : null}
              <AvatarFallback className="text-xl bg-accent/20 text-accent-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">{enseignant.nom} {enseignant.prenom}</h2>
              <p className="text-sm text-muted-foreground">{enseignant.specialite ?? "Enseignant"}{enseignant.diplome ? ` • ${enseignant.diplome}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {enseignant.matricule && <Badge variant="outline" className="font-mono text-xs">{enseignant.matricule}</Badge>}
                {enseignant.type_contrat && <Badge variant="secondary" className="text-xs">{enseignant.type_contrat}</Badge>}
                {enseignant.email && <Badge variant="outline" className="text-xs">{enseignant.email}</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={Users} label="Mes classes" value={classes.length} />
          <KPI icon={BookOpen} label="Cours / sem." value={creneaux.length} />
          <KPI icon={ClipboardList} label="Évaluations" value={evaluations.length} />
          <KPI icon={GraduationCap} label="Élèves total" value={classes.reduce((s, c) => s + c.effectif, 0)} />
        </div>

        {/* Mes classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Mes classes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setNewEvalClasseId(undefined); setNewEvalOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> Saisir des notes
            </Button>
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> :
              classes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aucune classe assignée.</p> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Classe</TableHead><TableHead>Rôle</TableHead><TableHead>Matières</TableHead>
                    <TableHead className="text-right">Effectif</TableHead><TableHead>Salle</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {classes.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setNewEvalClasseId(c.id); setNewEvalOpen(true); }}>
                        <TableCell className="font-medium">{c.nom}</TableCell>
                        <TableCell>{c.role === "principal" ? <Badge>Pr. principal</Badge> : <Badge variant="secondary">Intervenant</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.matieres.join(", ") || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.effectif}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.salle ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emploi du temps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Mon emploi du temps</CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> :
              creneaux.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aucun cours planifié.</p> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Jour</TableHead><TableHead>Horaire</TableHead><TableHead>Classe</TableHead>
                    <TableHead>Matière</TableHead><TableHead>Salle</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {creneaux.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{JOURS[c.jour - 1] ?? `J${c.jour}`}</TableCell>
                        <TableCell className="font-mono text-xs">{c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}</TableCell>
                        <TableCell>{c.classe}</TableCell>
                        <TableCell>{c.matiere}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.salle ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Évaluations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Mes évaluations récentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setNewEvalClasseId(undefined); setNewEvalOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> Nouvelle
            </Button>
          </CardHeader>
          <CardContent>
            {dataLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> :
              evaluations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aucune évaluation enregistrée.</p> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Titre</TableHead><TableHead>Type</TableHead>
                    <TableHead>Classe</TableHead><TableHead>Matière</TableHead>
                    <TableHead className="text-right">Notes</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {evaluations.map((e) => (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/portail-enseignant/evaluations/${e.id}`)}
                      >
                        <TableCell className="text-xs text-muted-foreground">{new Date(e.date_eval).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="font-medium">{e.titre}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.type}</Badge></TableCell>
                        <TableCell>{e.classe}</TableCell>
                        <TableCell>{e.matiere}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.notes_count}/{e.bareme}</TableCell>
                        <TableCell className="text-right"><Pencil className="h-3.5 w-3.5 text-muted-foreground inline" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {enseignant && (
        <NewEvaluationDialog
          open={newEvalOpen}
          onOpenChange={setNewEvalOpen}
          enseignant={enseignant}
          defaultClasseId={newEvalClasseId}
        />
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
