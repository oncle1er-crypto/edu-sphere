import { useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { BookOpen, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLivres } from "@/hooks/useLivres";
import { toast } from "sonner";

export default function LibraryCatalog() {
  const { livres, loading, addLivre, deleteLivre, ecoleId } = useLivres();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titre: "", auteur: "", isbn: "", categorie: "", editeur: "", quantite: "1", emplacement: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filtered = livres.filter((l) =>
    `${l.titre} ${l.auteur ?? ""} ${l.isbn ?? ""} ${l.categorie ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.titre) { toast.error("Titre obligatoire"); return; }
    setSaving(true);
    await addLivre({
      ecole_id: ecoleId!,
      titre: form.titre,
      auteur: form.auteur || null,
      isbn: form.isbn || null,
      categorie: form.categorie || null,
      editeur: form.editeur || null,
      quantite: parseInt(form.quantite) || 1,
      disponible: parseInt(form.quantite) || 1,
      emplacement: form.emplacement || null,
    });
    setForm({ titre: "", auteur: "", isbn: "", categorie: "", editeur: "", quantite: "1", emplacement: "" });
    setOpen(false);
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      title={`Catalogue (${filtered.length})`}
      description="Tous les ouvrages référencés."
      icon={<BookOpen className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Titre, auteur, ISBN..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvel ouvrage</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un livre</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Titre *"><Input value={form.titre} onChange={(e) => set("titre", e.target.value)} /></FieldRow>
              <FieldRow label="Auteur"><Input value={form.auteur} onChange={(e) => set("auteur", e.target.value)} /></FieldRow>
              <FieldRow label="ISBN"><Input value={form.isbn} onChange={(e) => set("isbn", e.target.value)} /></FieldRow>
              <FieldRow label="Catégorie"><Input value={form.categorie} onChange={(e) => set("categorie", e.target.value)} placeholder="Roman, Manuel, Sciences..." /></FieldRow>
              <FieldRow label="Éditeur"><Input value={form.editeur} onChange={(e) => set("editeur", e.target.value)} /></FieldRow>
              <FieldRow label="Quantité"><Input type="number" value={form.quantite} onChange={(e) => set("quantite", e.target.value)} className="w-24" /></FieldRow>
              <FieldRow label="Emplacement"><Input value={form.emplacement} onChange={(e) => set("emplacement", e.target.value)} placeholder="Rayon A, Étagère 3" /></FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-center">Exemplaires</TableHead>
              <TableHead className="text-center">Disponibles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.titre}</TableCell>
                <TableCell className="text-muted-foreground">{l.auteur ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary">{l.categorie ?? "—"}</Badge></TableCell>
                <TableCell className="text-center">{l.quantite}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={l.disponible === 0 ? "destructive" : l.disponible < 3 ? "secondary" : "default"}>
                    {l.disponible}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun ouvrage trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
