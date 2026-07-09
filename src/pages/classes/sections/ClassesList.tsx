import { useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookOpen, Search, Plus, Download, Upload, MoreHorizontal, Loader2 } from "lucide-react";
import { useClasses, Classe } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useEleves } from "@/hooks/useEleves";
import { useAnneeId } from "@/hooks/useAnneeId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImportDialog, ImportColumn, DedupMode, ImportResult } from "@/components/ImportDialog";

const IMPORT_COLUMNS_CLASSES: ImportColumn[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "cycle", label: "Cycle", required: true },
  { key: "capacite", label: "Capacité" },
  { key: "salle", label: "Salle" },
];

const EXAMPLE_ROWS_CLASSES = [
  { nom: "6ème A", cycle: "Collège", capacite: "45", salle: "Salle 101" },
  { nom: "5ème B", cycle: "Collège", capacite: "40", salle: "Salle 102" },
  { nom: "CM2 A", cycle: "Primaire", capacite: "35", salle: "Salle 201" },
];

export default function ClassesList() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes, loading, addClass, fetchClasses, ecoleId } = useClasses(activeAnnee.id);
  const { cycles } = useCycles();
  const { enseignants } = useEnseignants();
  const { anneeId } = useAnneeId();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");

  // New class dialog
  const [showNew, setShowNew] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newCycleId, setNewCycleId] = useState("");
  const [newCapacite, setNewCapacite] = useState("40");
  const [newSalle, setNewSalle] = useState("");
  const [newProfId, setNewProfId] = useState("none");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editClass, setEditClass] = useState<Classe | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editCycleId, setEditCycleId] = useState("");
  const [editCapacite, setEditCapacite] = useState("");
  const [editSalle, setEditSalle] = useState("");
  const [editProfId, setEditProfId] = useState("none");

  // Eleves dialog
  const [viewElevesClass, setViewElevesClass] = useState<Classe | null>(null);
  const { eleves } = useEleves(activeAnnee.id);
  const [showImport, setShowImport] = useState(false);

  const filtered = classes.filter((c) => {
    const ms =
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.prof_nom ?? "").toLowerCase().includes(search.toLowerCase());
    const mc = cycle === "all" || c.cycle_nom === cycle;
    return ms && mc;
  });

  const handleCreate = async () => {
    if (!newNom.trim() || !newCycleId || !anneeId) return;
    setSaving(true);
    await addClass({
      nom: newNom.trim(),
      cycle_id: newCycleId,
      annee_id: anneeId,
      capacite: parseInt(newCapacite) || 40,
      salle: newSalle || null,
      professeur_principal_id: newProfId === "none" ? null : newProfId,
      ecole_id: ecoleId!,
    });
    setSaving(false);
    setShowNew(false);
    setNewNom("");
    setNewCycleId("");
    setNewCapacite("40");
    setNewSalle("");
    setNewProfId("none");
  };

  const handleEdit = async () => {
    if (!editClass || !editNom.trim() || !editCycleId) return;
    setSaving(true);
    const { error } = await supabase
      .from("classes")
      .update({
        nom: editNom.trim(),
        cycle_id: editCycleId,
        capacite: parseInt(editCapacite) || 40,
        salle: editSalle || null,
        professeur_principal_id: editProfId === "none" ? null : editProfId,
      })
      .eq("id", editClass.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Classe modifiée");
      await fetchClasses();
    }
    setSaving(false);
    setEditClass(null);
  };

  const openEdit = (c: Classe) => {
    setEditClass(c);
    setEditNom(c.nom);
    setEditCycleId(c.cycle_id);
    setEditCapacite(String(c.capacite ?? 40));
    setEditSalle(c.salle ?? "");
    setEditProfId(c.professeur_principal_id ?? "none");
  };

  const handleArchive = async (c: Classe) => {
    if (!confirm(`Archiver la classe "${c.nom}" ?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Classe archivée");
      await fetchClasses();
    }
  };

  const handleImportClasses = async (rows: Record<string, string>[], dedupMode: DedupMode): Promise<ImportResult> => {
    if (!ecoleId || !anneeId) return { success: 0, errors: 0, skipped: 0, updated: 0 };
    let success = 0, errors = 0, skipped = 0, updated = 0;

    // Dedup by class name
    const existingMap = new Map(classes.map((c) => [c.nom.toLowerCase(), c]));

    for (const row of rows) {
      if (!row.nom || !row.cycle) { errors++; continue; }
      const cycleMatch = cycles.find((c) => c.nom.toLowerCase() === row.cycle.toLowerCase());
      if (!cycleMatch) { errors++; continue; }

      const dup = existingMap.get(row.nom.toLowerCase());
      if (dup) {
        if (dedupMode === "skip") { skipped++; continue; }
        const { error } = await supabase.from("classes").update({
          cycle_id: cycleMatch.id,
          capacite: parseInt(row.capacite) || undefined,
          salle: row.salle || undefined,
        }).eq("id", dup.id);
        if (!error) { updated++; await fetchClasses(); } else errors++;
        continue;
      }

      const res = await addClass({
        nom: row.nom,
        cycle_id: cycleMatch.id,
        annee_id: anneeId,
        capacite: parseInt(row.capacite) || 40,
        salle: row.salle || null,
        professeur_principal_id: null,
        ecole_id: ecoleId,
      });
      if (res) success++; else errors++;
    }
    return { success, errors, skipped, updated };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  const elevesForClass = viewElevesClass
    ? eleves.filter((e) => e.classe_id === viewElevesClass.id)
    : [];

  return (
    <>
      <SettingsSection
        icon={<BookOpen className="h-5 w-5" />}
        title={`Toutes les classes (${filtered.length})`}
        description="Liste complète des classes de l'établissement."
        hideSave
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom, prof. principal..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cycles</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" />Nouvelle classe
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" />Import CSV
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Effectif</TableHead>
                <TableHead className="hidden md:table-cell">Prof. principal</TableHead>
                <TableHead className="hidden lg:table-cell">Salle</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const full = (c.effectif ?? 0) >= (c.capacite ?? 999);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    <TableCell className="text-sm">{c.cycle_nom}</TableCell>
                    <TableCell>
                      <Badge variant={full ? "destructive" : "secondary"}>
                        {c.effectif ?? 0} / {c.capacite ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.prof_nom || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline">{c.salle || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewElevesClass(c)}>Voir les élèves</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleArchive(c)}>Archiver</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Aucune classe trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      {/* New class dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle classe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de la classe *</Label>
              <Input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Ex: 6ème A" />
            </div>
            <div>
              <Label>Cycle *</Label>
              <Select value={newCycleId} onValueChange={setNewCycleId}>
                <SelectTrigger><SelectValue placeholder="Choisir un cycle" /></SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacité</Label>
                <Input type="number" value={newCapacite} onChange={(e) => setNewCapacite(e.target.value)} />
              </div>
              <div>
                <Label>Salle</Label>
                <Input value={newSalle} onChange={(e) => setNewSalle(e.target.value)} placeholder="C12" />
              </div>
            </div>
            <div>
              <Label>Prof. principal</Label>
              <Select value={newProfId} onValueChange={setNewProfId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !newNom.trim() || !newCycleId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit class dialog */}
      <Dialog open={!!editClass} onOpenChange={(o) => !o && setEditClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la classe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={editNom} onChange={(e) => setEditNom(e.target.value)} />
            </div>
            <div>
              <Label>Cycle *</Label>
              <Select value={editCycleId} onValueChange={setEditCycleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacité</Label>
                <Input type="number" value={editCapacite} onChange={(e) => setEditCapacite(e.target.value)} />
              </div>
              <div>
                <Label>Salle</Label>
                <Input value={editSalle} onChange={(e) => setEditSalle(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Prof. principal</Label>
              <Select value={editProfId} onValueChange={setEditProfId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClass(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !editNom.trim() || !editCycleId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View eleves dialog */}
      <Dialog open={!!viewElevesClass} onOpenChange={(o) => !o && setViewElevesClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Élèves — {viewElevesClass?.nom}</DialogTitle>
          </DialogHeader>
          {elevesForClass.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun élève dans cette classe.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Matricule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elevesForClass.map((e, i) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{e.nom}</TableCell>
                      <TableCell>{e.prenom}</TableCell>
                      <TableCell className="text-xs font-mono">{e.matricule || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import de classes"
        columns={IMPORT_COLUMNS_CLASSES}
        exampleRows={EXAMPLE_ROWS_CLASSES}
        exampleFileName="modele_classes.csv"
        onImport={handleImportClasses}
        dedupDescription="nom de la classe"
      />
    </>
  );
}
