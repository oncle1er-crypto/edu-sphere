import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ChefHat, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCantinePersonnel } from "@/hooks/useCantine";

const getInitials = (nom: string, prenom: string) =>
  `${(prenom?.[0] ?? "")}${(nom?.[0] ?? "")}`.toUpperCase();

export default function CanteenTeam() {
  const { items, loading, add, update, remove } = useCantinePersonnel();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", fonction: "Cuisinier", telephone: "", email: "" });

  const handleAdd = async () => {
    if (!form.nom || !form.prenom) return;
    await add(form);
    setOpen(false);
    setForm({ nom: "", prenom: "", fonction: "Cuisinier", telephone: "", email: "" });
  };

  return (
    <SettingsSection
      title="Équipe cuisine"
      description="Personnel affecté à la restauration."
      icon={<ChefHat className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouveau membre</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun membre enregistré.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Fonction</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{getInitials(t.nom, t.prenom)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{t.prenom} {t.nom}</span>
                  </div>
                </TableCell>
                <TableCell>{t.fonction}</TableCell>
                <TableCell>{t.telephone ?? "—"}</TableCell>
                <TableCell>{t.email ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={t.actif ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => update(t.id, { actif: !t.actif })}
                  >
                    {t.actif ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau membre</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom</Label><Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            </div>
            <div><Label>Fonction</Label><Input value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!form.nom || !form.prenom}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
