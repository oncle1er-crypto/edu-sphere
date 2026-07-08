import { useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Layers, Loader2, Pencil, Trash2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { toast } from "sonner";

export default function SubjectsCategories() {
  const { matieres, loading, renameCategorie, deleteCategorie } = useMatieres();
  const [renameOpen, setRenameOpen] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cats = useMemo(
    () => Array.from(new Set(matieres.map((m) => m.categorie).filter(Boolean)))
      .sort((a, b) => (a as string).localeCompare(b as string))
      .map((c) => ({ nom: c as string, matieres: matieres.filter((m) => m.categorie === c) })),
    [matieres],
  );

  const handleRename = async () => {
    if (!renameOpen) return;
    if (!renameValue.trim()) return toast.error("Nom obligatoire");
    setBusy(true);
    const ok = await renameCategorie(renameOpen, renameValue);
    setBusy(false);
    if (ok) { setRenameOpen(null); setRenameValue(""); }
  };

  const handleDelete = async () => {
    if (!deleteOpen) return;
    setBusy(true);
    const ok = await deleteCategorie(deleteOpen);
    setBusy(false);
    if (ok) setDeleteOpen(null);
  };

  return (
    <SettingsSection
      icon={<Layers className="h-5 w-5" />}
      title="Catégories & types de matières"
      description="Regroupez vos matières. Une nouvelle catégorie se crée en assignant sa valeur à une matière dans « Liste des matières »."
      hideSave
    >
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : cats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune catégorie. Créez d'abord une matière avec une catégorie.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cats.map((c) => (
            <Card key={c.nom} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-primary truncate">{c.nom}</h3>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{c.matieres.length}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setRenameOpen(c.nom); setRenameValue(c.nom); }}
                      aria-label="Renommer">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteOpen(c.nom)}
                      aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.matieres.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-[11px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${m.couleur || "bg-primary"} mr-1.5`} />
                      {m.code || m.nom}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Renommer */}
      <Dialog open={!!renameOpen} onOpenChange={(o) => !o && setRenameOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
            <DialogDescription>
              Toutes les matières de « {renameOpen} » seront mises à jour.
            </DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={50} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(null)}>Annuler</Button>
            <Button onClick={handleRename} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supprimer */}
      <Dialog open={!!deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie « {deleteOpen} » ?</DialogTitle>
            <DialogDescription>
              Les matières concernées ne seront pas supprimées, mais elles n'auront plus de catégorie assignée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
