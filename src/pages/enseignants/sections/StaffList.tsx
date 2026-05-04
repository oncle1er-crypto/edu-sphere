import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Users, Search, Plus, Download, Upload, MoreHorizontal, Loader2 } from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";
import { toast } from "sonner";
import { ImportDialog, ImportColumn } from "@/components/ImportDialog";

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

export default function StaffList() {
  const { enseignants, loading, addEnseignant, deleteEnseignant } = useEnseignants();
  const [search, setSearch] = useState("");
  const [contrat, setContrat] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    nom: "", prenom: "", sexe: "" as "" | "F" | "M",
    email: "", telephone: "", specialite: "", type_contrat: "CDI", diplome: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = enseignants.filter((s) => {
    const ms = `${s.nom} ${s.prenom} ${s.matricule ?? ""} ${s.specialite ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const mc = contrat === "all" || s.type_contrat === contrat;
    return ms && mc;
  });

  const handleAdd = async () => {
    if (!form.nom || !form.prenom) { toast.error("Nom et prénom obligatoires"); return; }
    setSaving(true);
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    await addEnseignant({
      matricule: `ENS-${year}${rand}`,
      nom: form.nom,
      prenom: form.prenom,
      sexe: (form.sexe || null) as any,
      email: form.email || null,
      telephone: form.telephone || null,
      specialite: form.specialite || null,
      type_contrat: form.type_contrat || "CDI",
      diplome: form.diplome || null,
      ecole_id: "",
    });
    setForm({ nom: "", prenom: "", sexe: "", email: "", telephone: "", specialite: "", type_contrat: "CDI", diplome: "" });
    setOpen(false);
    setSaving(false);
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    let success = 0, errors = 0;
    for (const row of rows) {
      if (!row.nom || !row.prenom) { errors++; continue; }
      const year = new Date().getFullYear().toString().slice(-2);
      const rand = Math.floor(1000 + Math.random() * 9000);
      const res = await addEnseignant({
        matricule: `ENS-${year}${rand}`,
        nom: row.nom,
        prenom: row.prenom,
        sexe: (row.sexe === "F" || row.sexe === "M" ? row.sexe : null) as any,
        email: row.email || null,
        telephone: row.telephone || null,
        specialite: row.specialite || null,
        type_contrat: row.type_contrat || "CDI",
        diplome: row.diplome || null,
        ecole_id: "",
      });
      if (res) success++; else errors++;
    }
    return { success, errors };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title={`Personnel (${filtered.length})`}
      description="Recherchez et gérez tous les membres de l'établissement."
      hideSave
    >
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
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" />Import CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" />Nouveau</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel enseignant</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <FieldRow label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} /></FieldRow>
                <FieldRow label="Prénom *"><Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} /></FieldRow>
                <FieldRow label="Sexe">
                  <Select value={form.sexe} onValueChange={(v) => set("sexe", v)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F">Féminin</SelectItem>
                      <SelectItem value="M">Masculin</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></FieldRow>
                <FieldRow label="Téléphone"><Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+225" /></FieldRow>
                <FieldRow label="Spécialité"><Input value={form.specialite} onChange={(e) => set("specialite", e.target.value)} /></FieldRow>
                <FieldRow label="Diplôme"><Input value={form.diplome} onChange={(e) => set("diplome", e.target.value)} /></FieldRow>
                <FieldRow label="Contrat">
                  <Select value={form.type_contrat} onValueChange={(v) => set("type_contrat", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Vacataire">Vacataire</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <Button className="w-full" onClick={handleAdd} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{initials(s.nom, s.prenom)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{s.prenom} {s.nom}</p>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir la fiche</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
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
      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import d'enseignants"
        columns={IMPORT_COLUMNS}
        exampleRows={EXAMPLE_ROWS_ENS}
        exampleFileName="modele_enseignants.csv"
        onImport={handleImport}
      />
    </SettingsSection>
  );
}
