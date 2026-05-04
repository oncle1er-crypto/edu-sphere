import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Library, Search, Plus, Download, Upload, MoreHorizontal, Loader2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { ImportDialog, ImportColumn } from "@/components/ImportDialog";

const CATEGORIES = ["Fondamentale", "Scientifique", "Littéraire", "Religieuse", "Artistique", "Sportive", "Optionnelle"];

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "code", label: "Code" },
  { key: "categorie", label: "Catégorie" },
];

const EXAMPLE_ROWS = [
  { nom: "Mathématiques", code: "MATH", categorie: "Scientifique" },
  { nom: "Français", code: "FR", categorie: "Littéraire" },
  { nom: "Anglais", code: "ANG", categorie: "Littéraire" },
  { nom: "Sciences de la Vie et de la Terre", code: "SVT", categorie: "Scientifique" },
  { nom: "Éducation Physique et Sportive", code: "EPS", categorie: "Sportive" },
];

export default function SubjectsList() {
  const { matieres, loading, addMatiere } = useMatieres();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: "", code: "", categorie: "" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = matieres.filter((s) => {
    const ms = (s.nom + " " + (s.code ?? "")).toLowerCase().includes(search.toLowerCase());
    const mc = cat === "all" || s.categorie === cat;
    return ms && mc;
  });

  const handleAdd = async () => {
    if (!form.nom) return;
    setSaving(true);
    await addMatiere({ nom: form.nom, code: form.code || null, categorie: form.categorie || null, ecole_id: "" });
    setForm({ nom: "", code: "", categorie: "" });
    setShowNew(false);
    setSaving(false);
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    let success = 0, errors = 0;
    for (const row of rows) {
      if (!row.nom) { errors++; continue; }
      const res = await addMatiere({ nom: row.nom, code: row.code || null, categorie: row.categorie || null, ecole_id: "" });
      if (res) success++; else errors++;
    }
    return { success, errors };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Library className="h-5 w-5" />}
      title={`Toutes les matières (${filtered.length})`}
      description="Catalogue complet des disciplines enseignées."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom ou code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4" />Import CSV</Button>
          <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />Nouvelle matière</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Matière</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{s.code ?? "—"}</TableCell>
                <TableCell className="font-medium">{s.nom}</TableCell>
                <TableCell><Badge variant="outline">{s.categorie ?? "—"}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archiver</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucune matière trouvée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle matière</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Nom *"><Input value={form.nom} onChange={(e) => set("nom", e.target.value)} /></FieldRow>
            <FieldRow label="Code"><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="MATH" /></FieldRow>
            <FieldRow label="Catégorie">
              <Select value={form.categorie} onValueChange={(v) => set("categorie", v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <Button className="w-full" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import de matières"
        columns={IMPORT_COLUMNS}
        exampleRows={EXAMPLE_ROWS}
        exampleFileName="modele_matieres.csv"
        onImport={handleImport}
      />
    </SettingsSection>
  );
}
