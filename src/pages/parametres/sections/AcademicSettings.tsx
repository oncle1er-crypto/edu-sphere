import { useMemo, useState } from "react";
import {
  GraduationCap, Plus, Trash2, Lock, Unlock, Archive, CalendarRange,
  CheckCircle2, AlertTriangle, Power,
} from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PeriodeStatut = "a_venir" | "en_cours" | "verrouillee";
type AnneeStatut = "active" | "preparation" | "verrouillee" | "archivee";
type Decoupage = "trimestre" | "semestre";

interface Periode {
  id: string;
  nom: string;
  debut: string; // ISO yyyy-mm-dd
  fin: string;
  statut: PeriodeStatut;
}

interface AnneeScolaire {
  id: string;
  libelle: string; // "2025-2026"
  debut: string;   // 2025-09-01
  fin: string;     // 2026-07-31
  decoupage: Decoupage;
  statut: AnneeStatut;
  periodes: Periode[];
}

// ---------- Helpers ----------
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function genererPeriodes(debutIso: string, finIso: string, decoupage: Decoupage): Periode[] {
  const debut = new Date(debutIso);
  const fin = new Date(finIso);
  const totalMs = fin.getTime() - debut.getTime();
  const n = decoupage === "trimestre" ? 3 : 2;
  const noms =
    decoupage === "trimestre"
      ? ["1er Trimestre", "2ème Trimestre", "3ème Trimestre"]
      : ["1er Semestre", "2ème Semestre"];
  const out: Periode[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(debut.getTime() + (totalMs * i) / n);
    const f = new Date(debut.getTime() + (totalMs * (i + 1)) / n - 24 * 3600 * 1000);
    out.push({
      id: `${debutIso}-p${i + 1}`,
      nom: noms[i],
      debut: d.toISOString().slice(0, 10),
      fin: f.toISOString().slice(0, 10),
      statut: "a_venir",
    });
  }
  return out;
}

function periodeStatutBadge(s: PeriodeStatut) {
  if (s === "en_cours")
    return <Badge className="bg-accent/20 text-accent-foreground border border-accent/40">En cours</Badge>;
  if (s === "verrouillee")
    return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Verrouillée</Badge>;
  return <Badge variant="secondary">À venir</Badge>;
}

function anneeStatutBadge(s: AnneeStatut) {
  if (s === "active")
    return <Badge className="bg-primary text-primary-foreground gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
  if (s === "preparation")
    return <Badge variant="secondary">En préparation</Badge>;
  if (s === "verrouillee")
    return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Verrouillée</Badge>;
  return <Badge variant="outline" className="gap-1 opacity-70"><Archive className="h-3 w-3" />Archivée</Badge>;
}

// ---------- Données initiales ----------
const initialAnnees: AnneeScolaire[] = [
  {
    id: "2025-2026",
    libelle: "2025 - 2026",
    debut: "2025-09-01",
    fin: "2026-07-31",
    decoupage: "trimestre",
    statut: "active",
    periodes: [
      { id: "p1", nom: "1er Trimestre", debut: "2025-09-02", fin: "2025-12-20", statut: "verrouillee" },
      { id: "p2", nom: "2ème Trimestre", debut: "2026-01-06", fin: "2026-04-04", statut: "en_cours" },
      { id: "p3", nom: "3ème Trimestre", debut: "2026-04-21", fin: "2026-06-30", statut: "a_venir" },
    ],
  },
  {
    id: "2024-2025",
    libelle: "2024 - 2025",
    debut: "2024-09-02",
    fin: "2025-07-04",
    decoupage: "trimestre",
    statut: "archivee",
    periodes: [
      { id: "p1", nom: "1er Trimestre", debut: "2024-09-02", fin: "2024-12-20", statut: "verrouillee" },
      { id: "p2", nom: "2ème Trimestre", debut: "2025-01-06", fin: "2025-04-04", statut: "verrouillee" },
      { id: "p3", nom: "3ème Trimestre", debut: "2025-04-21", fin: "2025-07-04", statut: "verrouillee" },
    ],
  },
];

const mentions = [
  { min: 16, label: "Très Bien" },
  { min: 14, label: "Bien" },
  { min: 12, label: "Assez Bien" },
  { min: 10, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

export default function AcademicSettings() {
  const [annees, setAnnees] = useState<AnneeScolaire[]>(initialAnnees);
  const [activeId, setActiveId] = useState<string>(
    initialAnnees.find((a) => a.statut === "active")?.id ?? initialAnnees[0].id
  );

  const annee = useMemo(
    () => annees.find((a) => a.id === activeId) ?? annees[0],
    [annees, activeId]
  );
  const verrouAnnee = annee.statut === "verrouillee" || annee.statut === "archivee";

  // ---------- Création année ----------
  const [openCreate, setOpenCreate] = useState(false);
  const [newAnneeStart, setNewAnneeStart] = useState<number>(new Date().getFullYear());
  const [newDecoupage, setNewDecoupage] = useState<Decoupage>("trimestre");

  const creerAnnee = () => {
    const debut = `${newAnneeStart}-09-01`;
    const fin = `${newAnneeStart + 1}-07-31`;
    const id = `${newAnneeStart}-${newAnneeStart + 1}`;
    if (annees.some((a) => a.id === id)) {
      toast.error("Cette année scolaire existe déjà");
      return;
    }
    const nouvelle: AnneeScolaire = {
      id,
      libelle: `${newAnneeStart} - ${newAnneeStart + 1}`,
      debut,
      fin,
      decoupage: newDecoupage,
      statut: "preparation",
      periodes: genererPeriodes(debut, fin, newDecoupage),
    };
    setAnnees((s) => [nouvelle, ...s]);
    setActiveId(id);
    setOpenCreate(false);
    toast.success(`Année ${nouvelle.libelle} créée`, {
      description: "Statut : en préparation. Activez-la quand vous êtes prêt.",
    });
  };

  // ---------- Actions année ----------
  const activerAnnee = (id: string) => {
    setAnnees((s) =>
      s.map((a) => ({
        ...a,
        statut:
          a.id === id
            ? "active"
            : a.statut === "active"
            ? "verrouillee"
            : a.statut,
      }))
    );
    setActiveId(id);
    toast.success("Année activée", {
      description: "L'ancienne année active a été automatiquement verrouillée.",
    });
  };

  const verrouillerAnnee = (id: string) => {
    setAnnees((s) =>
      s.map((a) =>
        a.id === id
          ? {
              ...a,
              statut: "verrouillee",
              periodes: a.periodes.map((p) => ({ ...p, statut: "verrouillee" as PeriodeStatut })),
            }
          : a
      )
    );
    toast.success("Année verrouillée", {
      description: "Aucune modification de notes, présences ou paiements ne sera possible.",
    });
  };

  const deverrouillerAnnee = (id: string) => {
    setAnnees((s) =>
      s.map((a) => (a.id === id && a.statut === "verrouillee" ? { ...a, statut: "active" } : a))
    );
    toast.success("Année déverrouillée");
  };

  const archiverAnnee = (id: string) => {
    setAnnees((s) =>
      s.map((a) =>
        a.id === id
          ? {
              ...a,
              statut: "archivee",
              periodes: a.periodes.map((p) => ({ ...p, statut: "verrouillee" as PeriodeStatut })),
            }
          : a
      )
    );
    toast.success("Année archivée", {
      description: "Les données restent consultables en lecture seule.",
    });
  };

  // ---------- Actions période ----------
  const togglePeriode = (pid: string) => {
    setAnnees((s) =>
      s.map((a) =>
        a.id === activeId
          ? {
              ...a,
              periodes: a.periodes.map((p) =>
                p.id === pid
                  ? {
                      ...p,
                      statut:
                        p.statut === "verrouillee"
                          ? "en_cours"
                          : "verrouillee",
                    }
                  : p
              ),
            }
          : a
      )
    );
    toast.success("État de la période mis à jour");
  };

  return (
    <div className="space-y-6">
      {/* ============ Gestion des années scolaires ============ */}
      <SettingsSection
        title="Années scolaires"
        description="Création, activation, verrouillage et archivage des années (septembre → juillet)."
        icon={<CalendarRange className="h-5 w-5" />}
        hideSave
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Année consultée :</span>
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {annees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.libelle} — {a.statut}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {anneeStatutBadge(annee.statut)}
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" />Nouvelle année</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une année scolaire</DialogTitle>
                <DialogDescription>
                  L'année commence le 1er septembre et se termine le 31 juillet de l'année suivante.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Année de rentrée</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={newAnneeStart}
                    onChange={(e) => setNewAnneeStart(parseInt(e.target.value || "0", 10))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Année résultante : <strong>{newAnneeStart} - {newAnneeStart + 1}</strong>
                    {" "}(du 01/09/{newAnneeStart} au 31/07/{newAnneeStart + 1})
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Découpage par défaut</Label>
                  <Select value={newDecoupage} onValueChange={(v) => setNewDecoupage(v as Decoupage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trimestre">Trimestriel (3 périodes)</SelectItem>
                      <SelectItem value="semestre">Semestriel (2 périodes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button>
                <Button onClick={creerAnnee}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Année</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Découpage</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annees.map((a) => (
                <TableRow key={a.id} className={cn(a.id === activeId && "bg-muted/40")}>
                  <TableCell className="font-medium">{a.libelle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmt(a.debut)} → {fmt(a.fin)}
                  </TableCell>
                  <TableCell className="capitalize">{a.decoupage}</TableCell>
                  <TableCell>{anneeStatutBadge(a.statut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {a.statut !== "active" && a.statut !== "archivee" && (
                        <Button size="sm" variant="outline" onClick={() => activerAnnee(a.id)}>
                          <Power className="h-3.5 w-3.5" />Activer
                        </Button>
                      )}
                      {a.statut === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Lock className="h-3.5 w-3.5" />Verrouiller
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Verrouiller {a.libelle} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Plus aucune modification de notes, présences, paiements ou inscriptions
                                ne sera possible. Vous pourrez déverrouiller plus tard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => verrouillerAnnee(a.id)}>
                                Verrouiller
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {a.statut === "verrouillee" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => deverrouillerAnnee(a.id)}>
                            <Unlock className="h-3.5 w-3.5" />Déverrouiller
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Archive className="h-3.5 w-3.5" />Archiver
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archiver définitivement {a.libelle} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Les données passent en lecture seule permanente. Bulletins, paiements
                                  et historiques restent consultables. Cette action est rarement réversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => archiverAnnee(a.id)}>
                                  Archiver
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {verrouAnnee && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p>
              Cette année est <strong>{annee.statut === "archivee" ? "archivée" : "verrouillée"}</strong>.
              Les périodes ne peuvent pas être modifiées.
            </p>
          </div>
        )}
      </SettingsSection>

      {/* ============ Périodes de l'année sélectionnée ============ */}
      <SettingsSection
        title={`Périodes — ${annee.libelle}`}
        description="Verrouillage individuel d'une période (ex : clôture du 1er trimestre)."
        icon={<GraduationCap className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annee.periodes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nom}</TableCell>
                  <TableCell>{fmt(p.debut)}</TableCell>
                  <TableCell>{fmt(p.fin)}</TableCell>
                  <TableCell>{periodeStatutBadge(p.statut)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={verrouAnnee}
                      onClick={() => togglePeriode(p.id)}
                    >
                      {p.statut === "verrouillee" ? (
                        <><Unlock className="h-3.5 w-3.5" />Déverrouiller</>
                      ) : (
                        <><Lock className="h-3.5 w-3.5" />Verrouiller</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <FieldRow
          label="Verrouillage automatique"
          hint="Verrouille la période 7 jours après sa date de fin."
        >
          <Switch defaultChecked />
        </FieldRow>

        <FieldRow
          label="Données impactées par le verrouillage"
          hint="Modules concernés lorsqu'une période est verrouillée."
        >
          <div className="flex flex-wrap gap-2">
            {["Notes & bulletins", "Présences", "Paiements", "Inscriptions", "Discipline"].map((m) => (
              <Badge key={m} variant="secondary">{m}</Badge>
            ))}
          </div>
        </FieldRow>
      </SettingsSection>

      {/* ============ Système de notation ============ */}
      <SettingsSection
        title="Système de notation"
        description="Échelle de notes, mentions et règles de calcul."
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <FieldRow label="Échelle">
          <Select defaultValue="20">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Sur 20</SelectItem>
              <SelectItem value="100">Sur 100</SelectItem>
              <SelectItem value="letter">Lettres (A-F)</SelectItem>
              <SelectItem value="gpa">GPA (sur 4.0)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Note de passage" hint="En dessous, l'élève est en échec">
          <Input type="number" defaultValue={10} className="w-32" />
        </FieldRow>

        <FieldRow label="Mode de calcul">
          <Select defaultValue="pondere">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pondere">Moyenne pondérée (par coefficient)</SelectItem>
              <SelectItem value="simple">Moyenne simple</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Mentions automatiques" hint="Affichées sur les bulletins">
          <div className="space-y-2">
            {mentions.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">≥ {m.min}</span>
                <Input defaultValue={m.label} className="flex-1" />
                <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm"><Plus className="h-4 w-4" />Ajouter une mention</Button>
          </div>
        </FieldRow>

        <FieldRow label="Classement automatique" hint="Calcul du rang par classe">
          <Switch defaultChecked />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
