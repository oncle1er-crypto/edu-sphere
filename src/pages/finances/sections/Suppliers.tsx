import { Landmark, Plus, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFournisseurs } from "@/hooks/useFournisseurs";
import { useState } from "react";

export default function Suppliers() {
  const { fournisseurs, loading, addFournisseur } = useFournisseurs();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", categorie: "", contact: "", email: "" });

  const handleSubmit = async () => {
    if (!form.nom) return;
    await addFournisseur({ nom: form.nom, categorie: form.categorie || null, contact: form.contact || null, email: form.email || null });
    setForm({ nom: "", categorie: "", contact: "", email: "" });
    setOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={`Fournisseurs (${fournisseurs.length})`} description="Carnet de contacts et soldes des comptes fournisseurs." icon={<Landmark className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Nouveau fournisseur</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un fournisseur</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Catégorie</Label><Input value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} placeholder="Ex: Fournitures, Énergie..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Solde dû</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fournisseurs.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nom}</TableCell>
                <TableCell className="text-muted-foreground">{s.categorie ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{s.contact ?? s.email ?? "—"}</TableCell>
                <TableCell className={`text-right font-semibold ${s.solde_du > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {s.solde_du > 0 ? `${s.solde_du.toLocaleString("fr-FR")} FCFA` : "—"}
                </TableCell>
                <TableCell><span className="text-accent text-xs font-semibold">● {s.statut === "actif" ? "Actif" : s.statut}</span></TableCell>
              </TableRow>
            ))}
            {fournisseurs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun fournisseur enregistré.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
