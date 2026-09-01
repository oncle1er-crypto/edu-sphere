import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_PERSONNEL } from "@/components/help";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Users, Search, Plus, Download, Upload, MoreHorizontal, Loader2, List, LayoutGrid, Phone, Mail, GraduationCap, Briefcase, UserPlus, Send, CheckCircle2, ChevronRight } from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";
import { ImportDialog, ImportColumn, DedupMode, ImportResult } from "@/components/ImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PersonnelDetail from "@/pages/enseignants/components/PersonnelDetail";
import { useRhReferentiels } from "@/hooks/useRhReferentiels";
import { messageErreurBase } from "@/lib/dbErrorMessages";

const SITUATIONS = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf/Veuve"];

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "prenom", label: "Prénom", required: true },
  { key: "sexe", label: "Sexe" },
  { key: "email", label: "Email" },
  { key: "telephone", label: "Téléphone" },
  { key: "specialite", label: "Spécialité" },
  { key: "diplome", label: "Diplôme" },
  { key: "type_contrat", label: "Type de contrat" },
];

const EXAMPLE_ROWS_ENS = [
  { nom: "Konan", prenom: "Jean-Marc", sexe: "M", email: "jm.konan@email.ci", telephone: "+225 07 01 02 03", specialite: "Mathématiques", diplome: "CAPES", type_contrat: "CDI" },
  { nom: "Bamba", prenom: "Aïssatou", sexe: "F", email: "a.bamba@email.ci", telephone: "+225 05 04 05 06", specialite: "Français", diplome: "Licence", type_contrat: "CDD" },
  { nom: "Yao", prenom: "Kouadio", sexe: "M", email: "k.yao@email.ci", telephone: "+225 01 07 08 09", specialite: "Anglais", diplome: "Master", type_contrat: "Vacataire" },
];

const initials = (nom: string, prenom: string) => `${(prenom?.[0] ?? "")}${(nom?.[0] ?? "")}`.toUpperCase();
const contratColor: Record<string, string> = {
  CDI: "bg-emerald-600 hover:bg-emerald-600",
  CDD: "bg-amber-500 hover:bg-amber-500",
  Vacataire: "bg-blue-500 hover:bg-blue-500",
};

type ViewMode = "list" | "grid";

/** En-tête de section pour regrouper visuellement les champs des formulaires
 * Nouveau / Modifier membre du personnel (identité, contact, poste...). */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full border-b pb-2 text-xs font-semibold uppercase tracking-wide text-primary">
      {children}
    </p>
  );
}

function FormField({ label, required, hint, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function StaffList() {
  const { departements } = useRhReferentiels();
  const { enseignants, loading, addEnseignant, updateEnseignant, deleteEnseignant, fetchEnseignants } = useEnseignants();
  const [search, setSearch] = useState("");
  const [contrat, setContrat] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [viewEnseignant, setViewEnseignant] = useState<typeof enseignants[0] | null>(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", sexe: "" as "" | "F" | "M",
    email: "", telephone: "", specialite: "", type_contrat: "CDI", diplome: "",
    poste: "", service: "", fonction: "", departement: "enseignant",
    nationalite: "Ivoirienne", situation_matrimoniale: "", personne_a_prevenir: "",
    salaire_brut_base: "",
  });
  const [createAccount, setCreateAccount] = useState(true);
  // Section "Informations complémentaires" repliée par défaut à la création
  // (aucun champ obligatoire dedans) pour accélérer la saisie courante ;
  // dépliée par défaut en modification pour ne rien masquer de ce qui a déjà
  // été renseigné.
  const [showMoreNew, setShowMoreNew] = useState(false);
  const [showMoreEdit, setShowMoreEdit] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [editEnseignant, setEditEnseignant] = useState<typeof enseignants[0] | null>(null);
  const [editForm, setEditForm] = useState({
    nom: "", prenom: "", sexe: "" as "" | "F" | "M",
    email: "", telephone: "", specialite: "", type_contrat: "CDI", diplome: "", statut: "actif",
    poste: "", service: "", fonction: "", departement: "enseignant",
    nationalite: "", situation_matrimoniale: "", personne_a_prevenir: "",
    salaire_brut_base: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (s: typeof enseignants[0]) => {
    setEditEnseignant(s);
    setEditForm({
      nom: s.nom ?? "", prenom: s.prenom ?? "",
      sexe: (s.sexe as any) ?? "",
      email: s.email ?? "", telephone: s.telephone ?? "",
      specialite: s.specialite ?? "", type_contrat: s.type_contrat ?? "CDI",
      diplome: s.diplome ?? "", statut: s.statut ?? "actif",
      poste: s.poste ?? "", service: s.service ?? "", fonction: s.fonction ?? "",
      departement: s.departement ?? "enseignant",
      nationalite: s.nationalite ?? "", situation_matrimoniale: s.situation_matrimoniale ?? "",
      personne_a_prevenir: s.personne_a_prevenir ?? "",
      salaire_brut_base: s.salaire_brut_base ? String(s.salaire_brut_base) : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editEnseignant) return;
    if (!editForm.nom || !editForm.prenom) { toast.error("Nom et prénom obligatoires"); return; }
    setSavingEdit(true);
    const ok = await updateEnseignant(editEnseignant.id, {
      nom: editForm.nom,
      prenom: editForm.prenom,
      sexe: (editForm.sexe || null) as any,
      email: editForm.email || null,
      telephone: editForm.telephone || null,
      specialite: editForm.specialite || null,
      type_contrat: editForm.type_contrat || "CDI",
      diplome: editForm.diplome || null,
      statut: editForm.statut as any,
      poste: editForm.poste || null,
      service: editForm.service || null,
      fonction: editForm.fonction || null,
      departement: editForm.departement || "enseignant",
      nationalite: editForm.nationalite || null,
      situation_matrimoniale: editForm.situation_matrimoniale || null,
      personne_a_prevenir: editForm.personne_a_prevenir || null,
      salaire_brut_base: editForm.salaire_brut_base ? Number(editForm.salaire_brut_base) : 0,
    });
    setSavingEdit(false);
    if (ok) setEditEnseignant(null);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = enseignants.filter((s) => {
    const ms = `${s.nom} ${s.prenom} ${s.matricule ?? ""} ${s.specialite ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const mc = contrat === "all" || s.type_contrat === contrat;
    return ms && mc;
  });

  const handleAdd = async () => {
    if (!form.nom || !form.prenom) { toast.error("Nom et prénom obligatoires"); return; }
    if (createAccount && !form.email && !form.telephone) {
      toast.error("Email ou téléphone requis pour créer un compte");
      return;
    }
    setSaving(true);
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const created = await addEnseignant({
      matricule: `ENS-${year}${rand}`,
      nom: form.nom,
      prenom: form.prenom,
      sexe: (form.sexe || null) as any,
      email: form.email || null,
      telephone: form.telephone || null,
      specialite: form.specialite || null,
      type_contrat: form.type_contrat || "CDI",
      diplome: form.diplome || null,
      poste: form.poste || null,
      service: form.service || null,
      fonction: form.fonction || null,
      departement: form.departement || "enseignant",
      nationalite: form.nationalite || null,
      situation_matrimoniale: form.situation_matrimoniale || null,
      personne_a_prevenir: form.personne_a_prevenir || null,
      salaire_brut_base: form.salaire_brut_base ? Number(form.salaire_brut_base) : 0,
      ecole_id: "",
    });
    // Le formulaire ne doit être réinitialisé et le dialogue fermé que si
    // l'enregistrement a réellement réussi — sinon l'utilisateur perd sa
    // saisie sans recours (bug identifié le 11/08/2026 : ces deux actions
    // s'exécutaient auparavant sans condition, même après un échec de
    // addEnseignant, par ex. en cas de collision du matricule généré
    // aléatoirement sur la contrainte unique enseignants_ecole_id_matricule_key).
    if (created) {
      if (createAccount) {
        const { data, error } = await supabase.functions.invoke("create-teacher-account", {
          body: { enseignant_id: created.id, app_base_url: window.location.origin },
        });
        if (error || data?.error) {
          toast.error(`Compte non créé : ${data?.error ?? messageErreurBase(error) ?? "erreur"}`);
        } else {
          const channels = [data?.email_sent && "email", data?.sms_sent && "SMS"].filter(Boolean).join(" + ");
          toast.success(`Compte créé · invitation envoyée${channels ? ` par ${channels}` : ""}`);
        }
      }
      setForm({
        nom: "", prenom: "", sexe: "", email: "", telephone: "", specialite: "",
        type_contrat: "CDI", diplome: "", poste: "", service: "", fonction: "",
        departement: "enseignant", nationalite: "Ivoirienne", situation_matrimoniale: "",
        personne_a_prevenir: "", salaire_brut_base: "",
      });
      setShowMoreNew(false);
      setOpen(false);
    }
    setSaving(false);
  };

  const handleResendInvitation = async (enseignantId: string) => {
    setInvitingId(enseignantId);
    const { data, error } = await supabase.functions.invoke("create-teacher-account", {
      body: { enseignant_id: enseignantId, app_base_url: window.location.origin },
    });
    setInvitingId(null);
    if (error || data?.error) {
      toast.error(data?.error ?? messageErreurBase(error) ?? "Erreur");
    } else {
      const channels = [data?.email_sent && "email", data?.sms_sent && "SMS"].filter(Boolean).join(" + ");
      toast.success(`Invitation renvoyée${channels ? ` par ${channels}` : ""}`);
    }
  };

  const handleImport = async (rows: Record<string, string>[], dedupMode: DedupMode): Promise<ImportResult> => {
    let success = 0, errors = 0, skipped = 0, updated = 0;
    const { data: existing } = await supabase
      .from("enseignants").select("id, email, matricule, nom, prenom").eq("ecole_id", enseignants[0]?.ecole_id ?? "");
    const byEmail = new Map((existing ?? []).filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e]));
    const byName = new Map((existing ?? []).map((e) => [`${e.nom.toLowerCase()}|${e.prenom.toLowerCase()}`, e]));

    for (const row of rows) {
      if (!row.nom || !row.prenom) { errors++; continue; }
      const dup = (row.email && byEmail.get(row.email.toLowerCase())) || byName.get(`${row.nom.toLowerCase()}|${row.prenom.toLowerCase()}`);
      if (dup) {
        if (dedupMode === "skip") { skipped++; continue; }
        const { error } = await supabase.from("enseignants").update({
          email: row.email || undefined, telephone: row.telephone || undefined,
          specialite: row.specialite || undefined, type_contrat: row.type_contrat || undefined,
          diplome: row.diplome || undefined,
          sexe: (row.sexe === "F" || row.sexe === "M" ? row.sexe : undefined) as any,
        }).eq("id", dup.id);
        if (!error) updated++; else errors++;
        continue;
      }
      const year = new Date().getFullYear().toString().slice(-2);
      const rand = Math.floor(1000 + Math.random() * 9000);
      const res = await addEnseignant({
        matricule: `ENS-${year}${rand}`, nom: row.nom, prenom: row.prenom,
        sexe: (row.sexe === "F" || row.sexe === "M" ? row.sexe : null) as any,
        email: row.email || null, telephone: row.telephone || null,
        specialite: row.specialite || null, type_contrat: row.type_contrat || "CDI",
        diplome: row.diplome || null, ecole_id: "",
      });
      if (res) success++; else errors++;
    }
    return { success, errors, skipped, updated };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  if (viewEnseignant) {
    return (
      <PersonnelDetail
        personnel={viewEnseignant as any}
        onBack={() => setViewEnseignant(null)}
        onUpdated={fetchEnseignants}
      />
    );
  }

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title={`Personnel (${filtered.length})`}
      description="Recherchez et gérez tous les membres de l'établissement."
      hideSave
    >
      <HelpBanner storageKey="staff-liste" title="Gérer le personnel">
        Ajoutez enseignants et personnel administratif, consultez leur fiche complète (contrat, matières, planning) et gérez leur statut.
      </HelpBanner>
      <StatusLegend title="Statuts du personnel" items={STATUTS_PERSONNEL} />
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, matricule, matière..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={contrat} onValueChange={setContrat}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous contrats</SelectItem>
              <SelectItem value="CDI">CDI</SelectItem>
              <SelectItem value="CDD">CDD</SelectItem>
              <SelectItem value="Vacataire">Vacataire</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md overflow-hidden">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" />Import CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" />Nouveau</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="border-b px-6 py-5">
                <DialogTitle>Nouveau membre du personnel</DialogTitle>
                <DialogDescription>Renseignez d’abord les informations essentielles. Les autres champs restent facultatifs.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionHeading>Identité</SectionHeading>
                  <FormField label="Nom" required><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} autoFocus /></FormField>
                  <FormField label="Prénom" required><Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} /></FormField>
                  <FormField label="Sexe">
                    <Select value={form.sexe} onValueChange={(v) => set("sexe", v)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">Féminin</SelectItem>
                        <SelectItem value="M">Masculin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionHeading>Contact</SectionHeading>
                  <FormField label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></FormField>
                  <FormField label="Téléphone"><Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+225" /></FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionHeading>Poste &amp; affectation</SectionHeading>
                  <FormField label="Département">
                    <Select value={form.departement} onValueChange={(v) => set("departement", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {departements.map((d) => <SelectItem key={d.id} value={d.code}>{d.libelle}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Poste"><Input value={form.poste} onChange={(e) => set("poste", e.target.value)} placeholder="Ex. Enseignant, Secrétaire, Comptable" /></FormField>
                  <FormField label="Fonction" hint="Précision propre à votre organisation (ex. responsabilité particulière).">
                    <Input value={form.fonction} onChange={(e) => set("fonction", e.target.value)} />
                  </FormField>
                  <FormField label="Service" hint="Unité ou équipe de rattachement.">
                    <Input value={form.service} onChange={(e) => set("service", e.target.value)} />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionHeading>Contrat</SectionHeading>
                  <FormField label="Type de contrat">
                    <Select value={form.type_contrat} onValueChange={(v) => set("type_contrat", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CDI">CDI</SelectItem>
                        <SelectItem value="CDD">CDD</SelectItem>
                        <SelectItem value="Vacataire">Vacataire</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Spécialité"><Input value={form.specialite} onChange={(e) => set("specialite", e.target.value)} /></FormField>
                  <FormField label="Diplôme"><Input value={form.diplome} onChange={(e) => set("diplome", e.target.value)} /></FormField>
                </div>

                <Collapsible open={showMoreNew} onOpenChange={setShowMoreNew}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showMoreNew ? "rotate-90" : ""}`} />
                    Informations complémentaires (facultatif)
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                    <FormField label="Salaire brut de base (FCFA)"><Input type="number" min={0} value={form.salaire_brut_base} onChange={(e) => set("salaire_brut_base", e.target.value)} /></FormField>
                    <FormField label="Nationalité"><Input value={form.nationalite} onChange={(e) => set("nationalite", e.target.value)} /></FormField>
                    <FormField label="Situation matrimoniale">
                      <Select value={form.situation_matrimoniale} onValueChange={(v) => set("situation_matrimoniale", v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {SITUATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </FormField>
                    <FormField label="Personne à prévenir"><Input value={form.personne_a_prevenir} onChange={(e) => set("personne_a_prevenir", e.target.value)} /></FormField>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <UserPlus className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <Label className="cursor-pointer text-sm">Créer un compte utilisateur</Label>
                      <p className="text-xs text-muted-foreground">
                        Un lien d'invitation sera envoyé par email + SMS pour qu'il définisse son mot de passe.
                      </p>
                    </div>
                  </div>
                  <Switch checked={createAccount} onCheckedChange={setCreateAccount} />
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? "Enregistrement…" : "Enregistrer le membre"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="p-3 flex flex-col items-center text-center gap-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewEnseignant(s)}
            >
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">{initials(s.nom, s.prenom)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-sm truncate">{s.nom} {s.prenom}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{s.matricule ?? "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate w-full">{s.specialite ?? "—"}</p>
              <div className="flex gap-1 flex-wrap justify-center">
                <Badge className={`text-[10px] ${contratColor[s.type_contrat ?? ""] ?? ""}`}>{s.type_contrat}</Badge>
                <Badge variant={s.statut === "actif" ? "default" : "secondary"} className="text-[10px]">{s.statut}</Badge>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8">Aucun membre trouvé.</div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.matricule ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 sm:h-8 sm:w-8">
                        <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{initials(s.nom, s.prenom)}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{s.nom} {s.prenom}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.specialite ?? "—"}</TableCell>
                  <TableCell><Badge className={contratColor[s.type_contrat ?? ""] ?? ""}>{s.type_contrat}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">
                    <p>{s.telephone ?? "—"}</p>
                    <p className="text-muted-foreground">{s.email ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.statut === "actif" ? "default" : "secondary"} className="text-[10px]">{s.statut}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewEnseignant(s)}>Voir la fiche</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResendInvitation(s.id)} disabled={invitingId === s.id}>
                          {invitingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (s as any).invitation_accepted_at ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Send className="h-3.5 w-3.5" />}
                          {(s as any).user_id ? "Renvoyer l'invitation" : "Créer compte + inviter"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(s)}>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteEnseignant(s.id)}>Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucun membre trouvé.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editEnseignant} onOpenChange={(o) => !o && setEditEnseignant(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le membre du personnel</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-3">
              <SectionHeading>Identité</SectionHeading>
              <FieldRow label="Nom *"><Input value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} /></FieldRow>
              <FieldRow label="Prénom *"><Input value={editForm.prenom} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} /></FieldRow>
              <FieldRow label="Sexe">
                <Select value={editForm.sexe} onValueChange={(v) => setEditForm({ ...editForm, sexe: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Féminin</SelectItem>
                    <SelectItem value="M">Masculin</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <div className="space-y-3">
              <SectionHeading>Contact</SectionHeading>
              <FieldRow label="Email"><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></FieldRow>
              <FieldRow label="Téléphone"><Input value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} placeholder="+225" /></FieldRow>
            </div>

            <div className="space-y-3">
              <SectionHeading>Poste &amp; affectation</SectionHeading>
              <FieldRow label="Département">
                <Select value={editForm.departement} onValueChange={(v) => setEditForm({ ...editForm, departement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departements.map((d) => <SelectItem key={d.id} value={d.code}>{d.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Poste"><Input value={editForm.poste} onChange={(e) => setEditForm({ ...editForm, poste: e.target.value })} placeholder="Ex. Enseignant, Secrétaire, Comptable" /></FieldRow>
              <FieldRow label="Fonction" hint="Facultatif — précision propre à votre organisation (ex. responsabilité particulière).">
                <Input value={editForm.fonction} onChange={(e) => setEditForm({ ...editForm, fonction: e.target.value })} />
              </FieldRow>
              <FieldRow label="Service" hint="Facultatif — unité ou équipe de rattachement.">
                <Input value={editForm.service} onChange={(e) => setEditForm({ ...editForm, service: e.target.value })} />
              </FieldRow>
            </div>

            <div className="space-y-3">
              <SectionHeading>Contrat &amp; statut</SectionHeading>
              <FieldRow label="Type de contrat">
                <Select value={editForm.type_contrat} onValueChange={(v) => setEditForm({ ...editForm, type_contrat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Vacataire">Vacataire</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Spécialité"><Input value={editForm.specialite} onChange={(e) => setEditForm({ ...editForm, specialite: e.target.value })} /></FieldRow>
              <FieldRow label="Diplôme"><Input value={editForm.diplome} onChange={(e) => setEditForm({ ...editForm, diplome: e.target.value })} /></FieldRow>
              <FieldRow label="Statut">
              <Select value={editForm.statut} onValueChange={(v) => setEditForm({ ...editForm, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                  <SelectItem value="conge">En congé</SelectItem>
                </SelectContent>
              </Select>
              </FieldRow>
            </div>

            <Collapsible open={showMoreEdit} onOpenChange={setShowMoreEdit}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showMoreEdit ? "rotate-90" : ""}`} />
                Informations complémentaires (facultatif)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <FieldRow label="Salaire brut de base (FCFA)"><Input type="number" min={0} value={editForm.salaire_brut_base} onChange={(e) => setEditForm({ ...editForm, salaire_brut_base: e.target.value })} /></FieldRow>
                <FieldRow label="Nationalité"><Input value={editForm.nationalite} onChange={(e) => setEditForm({ ...editForm, nationalite: e.target.value })} /></FieldRow>
                <FieldRow label="Situation matrimoniale">
                  <Select value={editForm.situation_matrimoniale} onValueChange={(v) => setEditForm({ ...editForm, situation_matrimoniale: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {SITUATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Personne à prévenir"><Input value={editForm.personne_a_prevenir} onChange={(e) => setEditForm({ ...editForm, personne_a_prevenir: e.target.value })} /></FieldRow>
              </CollapsibleContent>
            </Collapsible>

            <Button className="w-full" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer les modifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import d'enseignants"
        columns={IMPORT_COLUMNS}
        exampleRows={EXAMPLE_ROWS_ENS}
        exampleFileName="modele_enseignants.csv"
        onImport={handleImport}
        dedupDescription="email ou nom + prénom"
      />
    </SettingsSection>
  );
}
