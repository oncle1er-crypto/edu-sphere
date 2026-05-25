import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Library, Search, Plus, Download, Upload, MoreHorizontal, Loader2, Sparkles } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useEcoleId } from "@/hooks/useEcoleId";
import { ImportDialog, ImportColumn, DedupMode, ImportResult } from "@/components/ImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = ["Fondamentale", "Scientifique", "Littéraire", "Religieuse", "Artistique", "Sportive", "Optionnelle"];
const CYCLES = ["Maternelle", "Primaire", "Collège", "Lycée"] as const;

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "code", label: "Code" },
  { key: "categorie", label: "Catégorie" },
  { key: "cycles", label: "Cycles (séparés par ;)" },
];

const EXAMPLE_ROWS = [
  { nom: "Mathématiques", code: "MATH", categorie: "Scientifique", cycles: "Primaire;Collège;Lycée" },
  { nom: "Français", code: "FR", categorie: "Littéraire", cycles: "Primaire;Collège;Lycée" },
  { nom: "Philosophie", code: "PHILO", categorie: "Littéraire", cycles: "Lycée" },
  { nom: "Lecture", code: "LECT", categorie: "Fondamentale", cycles: "Primaire" },
];

// Référentiel MENA Côte d'Ivoire
const MENA_REFERENTIEL = [
  // Maternelle / Primaire
  { nom: "Lecture", code: "LECT", categorie: "Fondamentale", cycles: ["Primaire"], couleur: "bg-rose-400", coefficient: 3 },
  { nom: "Écriture / Expression écrite", code: "ECRIT", categorie: "Fondamentale", cycles: ["Primaire"], couleur: "bg-fuchsia-500", coefficient: 2 },
  { nom: "Activités d'éveil", code: "EVEIL", categorie: "Fondamentale", cycles: ["Maternelle"], couleur: "bg-lime-500", coefficient: 1, note_sur: 10 },
  { nom: "Sciences d'observation", code: "SCIOBS", categorie: "Scientifique", cycles: ["Primaire"], couleur: "bg-green-600", coefficient: 2 },
  { nom: "Histoire-Géographie (Primaire)", code: "HGP", categorie: "Littéraire", cycles: ["Primaire"], couleur: "bg-amber-500", coefficient: 2 },
  { nom: "Chant / Éducation musicale", code: "CHANT", categorie: "Artistique", cycles: ["Maternelle", "Primaire"], couleur: "bg-purple-400", coefficient: 1 },
  { nom: "Dessin", code: "DESS", categorie: "Artistique", cycles: ["Maternelle", "Primaire"], couleur: "bg-pink-400", coefficient: 1 },
  // Tous cycles
  { nom: "Mathématiques", code: "MATH", categorie: "Scientifique", cycles: ["Primaire", "Collège", "Lycée"], couleur: "bg-blue-500", coefficient: 4 },
  { nom: "Français", code: "FR", categorie: "Littéraire", cycles: ["Primaire", "Collège", "Lycée"], couleur: "bg-rose-500", coefficient: 4 },
  { nom: "Anglais", code: "ANG", categorie: "Littéraire", cycles: ["Primaire", "Collège", "Lycée"], couleur: "bg-indigo-500", coefficient: 3 },
  { nom: "Éducation Physique et Sportive", code: "EPS", categorie: "Sportive", cycles: ["Primaire", "Collège", "Lycée"], couleur: "bg-orange-500", coefficient: 1 },
  { nom: "Éducation religieuse / Catéchèse", code: "REL", categorie: "Religieuse", cycles: ["Maternelle", "Primaire", "Collège", "Lycée"], couleur: "bg-primary", coefficient: 1 },
  { nom: "Éducation aux Droits de l'Homme et à la Citoyenneté", code: "EDHC", categorie: "Fondamentale", cycles: ["Primaire", "Collège"], couleur: "bg-slate-500", coefficient: 1 },
  // Secondaire
  { nom: "Histoire-Géographie", code: "HG", categorie: "Littéraire", cycles: ["Collège", "Lycée"], couleur: "bg-amber-600", coefficient: 3 },
  { nom: "Sciences de la Vie et de la Terre", code: "SVT", categorie: "Scientifique", cycles: ["Collège", "Lycée"], couleur: "bg-emerald-500", coefficient: 3 },
  { nom: "Physique-Chimie", code: "PC", categorie: "Scientifique", cycles: ["Collège", "Lycée"], couleur: "bg-cyan-500", coefficient: 3 },
  { nom: "Philosophie", code: "PHILO", categorie: "Littéraire", cycles: ["Lycée"], couleur: "bg-purple-500", coefficient: 2 },
  { nom: "Informatique / TICE", code: "INFO", categorie: "Optionnelle", cycles: ["Collège", "Lycée"], couleur: "bg-teal-500", coefficient: 2 },
  { nom: "Espagnol (LV2)", code: "ESP", categorie: "Optionnelle", cycles: ["Collège", "Lycée"], couleur: "bg-yellow-600", coefficient: 2 },
  { nom: "Arts plastiques & Musique", code: "ART", categorie: "Artistique", cycles: ["Maternelle", "Primaire", "Collège"], couleur: "bg-pink-500", coefficient: 1 },
];

export default function SubjectsList() {
  const { matieres, loading, addMatiere, fetchMatieres } = useMatieres();
  const { ecoleId } = useEcoleId();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState<{ nom: string; code: string; categorie: string; cycles: string[] }>({ nom: "", code: "", categorie: "", cycles: [] });

  const toggleCycle = (c: string) =>
    setForm((p) => ({ ...p, cycles: p.cycles.includes(c) ? p.cycles.filter((x) => x !== c) : [...p.cycles, c] }));

  const filtered = matieres.filter((s) => {
    const ms = (s.nom + " " + (s.code ?? "")).toLowerCase().includes(search.toLowerCase());
    const mc = cat === "all" || s.categorie === cat;
    const mcy = cycleFilter === "all" || (s.cycles ?? []).includes(cycleFilter);
    return ms && mc && mcy;
  });

  const handleAdd = async () => {
    if (!form.nom) return;
    setSaving(true);
    await addMatiere({ nom: form.nom, code: form.code || null, categorie: form.categorie || null, cycles: form.cycles, ecole_id: "" } as any);
    setForm({ nom: "", code: "", categorie: "", cycles: [] });
    setShowNew(false);
    setSaving(false);
  };

  const handleExport = () => {
    if (!matieres.length) return toast.warning("Aucune matière à exporter");
    const headers = ["code", "nom", "categorie", "cycles", "coefficient", "note_sur"];
    const rows = matieres.map((m) => [m.code ?? "", m.nom, m.categorie ?? "", (m.cycles ?? []).join(";"), m.coefficient, m.note_sur]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "matieres.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  };

  const seedMena = async () => {
    if (!ecoleId) return;
    if (!confirm("Charger le référentiel MENA (Côte d'Ivoire) ? Les matières existantes (même code) seront conservées.")) return;
    setSeeding(true);
    const existingCodes = new Set(matieres.map((m) => (m.code || "").toUpperCase()));
    const toInsert = MENA_REFERENTIEL.filter((m) => !existingCodes.has(m.code.toUpperCase()))
      .map((m) => ({ ...m, ecole_id: ecoleId, note_sur: (m as any).note_sur ?? 20 }));
    if (toInsert.length === 0) { setSeeding(false); return toast.info("Toutes les matières du référentiel sont déjà présentes"); }
    const { error } = await supabase.from("matieres").insert(toInsert as any);
    setSeeding(false);
    if (error) toast.error(error.message);
    else { toast.success(`${toInsert.length} matière(s) du référentiel MENA ajoutée(s)`); fetchMatieres(); }
  };

  const handleImport = async (rows: Record<string, string>[], dedupMode: DedupMode): Promise<ImportResult> => {
    let success = 0, errors = 0, skipped = 0, updated = 0;
    const existingByName = new Map(matieres.map((m) => [m.nom.toLowerCase(), m]));
    const existingByCode = new Map(matieres.filter((m) => m.code).map((m) => [m.code!.toLowerCase(), m]));
    for (const row of rows) {
      if (!row.nom) { errors++; continue; }
      const cyclesArr = row.cycles ? row.cycles.split(";").map((c) => c.trim()).filter(Boolean) : [];
      const dup = (row.code && existingByCode.get(row.code.toLowerCase())) || existingByName.get(row.nom.toLowerCase());
      if (dup) {
        if (dedupMode === "skip") { skipped++; continue; }
        const { error } = await supabase.from("matieres").update({
          code: row.code || undefined, categorie: row.categorie || undefined,
          cycles: cyclesArr.length ? cyclesArr : undefined,
        }).eq("id", dup.id);
        if (!error) updated++; else errors++;
        continue;
      }
      const res = await addMatiere({ nom: row.nom, code: row.code || null, categorie: row.categorie || null, cycles: cyclesArr, ecole_id: "" } as any);
      if (res) success++; else errors++;
    }
    return { success, errors, skipped, updated };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Library className="h-5 w-5" />}
      title={`Toutes les matières (${filtered.length})`}
      description="Catalogue complet des disciplines enseignées (Maternelle, Primaire, Collège, Lycée)."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom ou code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous cycles</SelectItem>
              {CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={seedMena} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Référentiel MENA
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" />Export</Button>
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
              <TableHead>Cycles</TableHead>
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
                  <div className="flex flex-wrap gap-1">
                    {(s.cycles ?? []).length === 0
                      ? <span className="text-xs text-muted-foreground">—</span>
                      : (s.cycles ?? []).map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                  </div>
                </TableCell>
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
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune matière trouvée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle matière</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Nom *"><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></FieldRow>
            <FieldRow label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MATH" /></FieldRow>
            <FieldRow label="Catégorie">
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Cycles concernés">
              <div className="flex flex-wrap gap-3">
                {CYCLES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.cycles.includes(c)} onCheckedChange={() => toggleCycle(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </FieldRow>
            <Button className="w-full" onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enregistrer
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
        dedupDescription="nom ou code"
      />
    </SettingsSection>
  );
}
