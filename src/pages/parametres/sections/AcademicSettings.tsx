import { useState } from "react";
import {
  GraduationCap, Plus, Trash2, Lock, Unlock, Archive, CalendarRange,
  CheckCircle2, AlertTriangle, Power,
} from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useAcademicPeriod, genererPeriodes, LOCKABLE_MODULES,
  type AnneeStatut, type PeriodeStatut, type Decoupage, type LockableModule,
} from "@/context/AcademicPeriodContext";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

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
  if (s === "preparation") return <Badge variant="secondary">En préparation</Badge>;
  if (s === "verrouillee")
    return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Verrouillée</Badge>;
  return <Badge variant="outline" className="gap-1 opacity-70"><Archive className="h-3 w-3" />Archivée</Badge>;
}

const mentions = [
  { min: 16, label: "Très Bien" },
  { min: 14, label: "Bien" },
  { min: 12, label: "Assez Bien" },
  { min: 10, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

export default function AcademicSettings() {
  const {
    annees, activeAnneeId, setActiveAnneeId, activeAnnee,
    upsertAnnee, setAnneeStatut, setPeriodeStatut,
    lockedModules, setLockedModules,
  } = useAcademicPeriod();

  const verrouAnnee = activeAnnee.statut === "verrouillee" || activeAnnee.statut === "archivee";

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
    upsertAnnee({
      id,
      libelle: `${newAnneeStart} - ${newAnneeStart + 1}`,
      debut, fin, decoupage: newDecoupage,
      statut: "preparation",
      periodes: genererPeriodes(debut, fin, newDecoupage),
    });
    setActiveAnneeId(id);
    setOpenCreate(false);
    toast.success(`Année ${newAnneeStart}-${newAnneeStart + 1} créée`);
  };

  const togglePeriode = (pid: string) => {
    const p = activeAnnee.periodes.find((x) => x.id === pid);
    if (!p) return;
    setPeriodeStatut(activeAnnee.id, pid, p.statut === "verrouillee" ? "en_cours" : "verrouillee");
    toast.success("État de la période mis à jour");
  };

  const toggleModule = (m: LockableModule, checked: boolean) => {
    setLockedModules(
      checked ? Array.from(new Set([...lockedModules, m])) : lockedModules.filter((x) => x !== m)
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Années scolaires"
        description="Création, activation, verrouillage et archivage des années (septembre → juillet)."
        icon={<CalendarRange className="h-5 w-5" />}
        hideSave
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Année consultée :</span>
            <Select value={activeAnneeId} onValueChange={setActiveAnneeId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {annees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.libelle} — {a.statut}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {anneeStatutBadge(activeAnnee.statut)}
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
                    type="number" min={2000} max={2100}
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
                <TableHead>Année</TableHead><TableHead>Période</TableHead>
                <TableHead>Découpage</TableHead><TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annees.map((a) => (
                <TableRow key={a.id} className={cn(a.id === activeAnneeId && "bg-muted/40")}>
                  <TableCell className="font-medium">{a.libelle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(a.debut)} → {fmt(a.fin)}</TableCell>
                  <TableCell className="capitalize">{a.decoupage}</TableCell>
                  <TableCell>{anneeStatutBadge(a.statut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {a.statut !== "active" && a.statut !== "archivee" && (
                        <ConfirmButton
                          size="sm" variant="outline"
                          confirmTitle={`Activer ${a.libelle} ?`}
                          confirmDescription="Cette année deviendra l'année de référence pour les saisies (notes, absences, paiements). L'année active actuelle sera désactivée."
                          confirmLabel="Activer"
                          onConfirm={() => { setAnneeStatut(a.id, "active"); toast.success("Année activée"); }}
                        >
                          <Power className="h-3.5 w-3.5" />Activer
                        </ConfirmButton>
                      )}
                      {a.statut === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline"><Lock className="h-3.5 w-3.5" />Verrouiller</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Verrouiller {a.libelle} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Plus aucune modification de notes, présences, paiements ou inscriptions ne sera possible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { setAnneeStatut(a.id, "verrouillee"); toast.success("Année verrouillée"); }}>
                                Verrouiller
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {a.statut === "verrouillee" && (
                        <>
                          <ConfirmButton
                            size="sm" variant="outline" tone="warning"
                            confirmTitle={`Déverrouiller ${a.libelle} ?`}
                            confirmDescription="Les saisies (notes, absences, paiements) redeviendront modifiables sur toute l'année. Cette opération est tracée."
                            confirmLabel="Déverrouiller"
                            onConfirm={() => { setAnneeStatut(a.id, "active"); toast.success("Année déverrouillée"); }}
                          >
                            <Unlock className="h-3.5 w-3.5" />Déverrouiller
                          </ConfirmButton>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline"><Archive className="h-3.5 w-3.5" />Archiver</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archiver définitivement {a.libelle} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Les données passent en lecture seule permanente. Bulletins, paiements et historiques restent consultables.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { setAnneeStatut(a.id, "archivee"); toast.success("Année archivée"); }}>
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
              Cette année est <strong>{activeAnnee.statut === "archivee" ? "archivée" : "verrouillée"}</strong>.
              Les périodes ne peuvent pas être modifiées.
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title={`Périodes — ${activeAnnee.libelle}`}
        description="Verrouillage individuel d'une période (ex : clôture du 1er trimestre)."
        icon={<GraduationCap className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead><TableHead>Début</TableHead>
                <TableHead>Fin</TableHead><TableHead>État</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAnnee.periodes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nom}</TableCell>
                  <TableCell>{fmt(p.debut)}</TableCell>
                  <TableCell>{fmt(p.fin)}</TableCell>
                  <TableCell>{periodeStatutBadge(p.statut)}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmButton
                      size="sm" variant="outline"
                      disabled={verrouAnnee}
                      tone={p.statut === "verrouillee" ? "warning" : "danger"}
                      confirmTitle={p.statut === "verrouillee" ? `Déverrouiller « ${p.nom} » ?` : `Verrouiller « ${p.nom} » ?`}
                      confirmDescription={
                        p.statut === "verrouillee"
                          ? "Les modules concernés (notes, présences, paiements…) redeviendront modifiables pour les dates de cette période."
                          : "Plus aucune modification ne sera possible sur les modules concernés (notes, présences, paiements…) pour les dates de cette période."
                      }
                      confirmLabel={p.statut === "verrouillee" ? "Déverrouiller" : "Verrouiller"}
                      onConfirm={() => togglePeriode(p.id)}
                    >
                      {p.statut === "verrouillee"
                        ? (<><Unlock className="h-3.5 w-3.5" />Déverrouiller</>)
                        : (<><Lock className="h-3.5 w-3.5" />Verrouiller</>)}
                    </ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <FieldRow label="Verrouillage automatique" hint="Verrouille la période 7 jours après sa date de fin.">
          <Switch defaultChecked />
        </FieldRow>

        <FieldRow
          label="Modules concernés par le verrouillage"
          hint="Ces écrans bloqueront l'édition pour toute date appartenant à une période verrouillée."
        >
          <div className="flex flex-wrap gap-3">
            {LOCKABLE_MODULES.map((m) => {
              const checked = lockedModules.includes(m.key);
              return (
                <label
                  key={m.key}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox checked={checked} onCheckedChange={(v) => toggleModule(m.key, v === true)} />
                  <span className="text-sm font-medium">{m.label}</span>
                </label>
              );
            })}
          </div>
        </FieldRow>
      </SettingsSection>

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
