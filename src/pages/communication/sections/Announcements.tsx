import { useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Loader2 } from "lucide-react";
import { useAnnonces } from "@/hooks/useAnnonces";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Announcements() {
  const { annonces, loading, addAnnonce, ecoleId } = useAnnonces();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", audience: "tous" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.titre) { toast.error("Titre obligatoire"); return; }
    setSaving(true);
    await addAnnonce({ ecole_id: ecoleId!, titre: form.titre, contenu: form.contenu, audience: form.audience, auteur_id: user?.id ?? null, publie: true, publie_le: new Date().toISOString() });
    setForm({ titre: "", contenu: "", audience: "tous" });
    setOpen(false); setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<Megaphone className="h-5 w-5" />} title={`Annonces (${annonces.length})`} description="Circulaires et communications officielles." hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle annonce</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle annonce</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Titre *"><Input value={form.titre} onChange={(e) => set("titre", e.target.value)} /></FieldRow>
              <FieldRow label="Contenu"><Textarea rows={4} value={form.contenu} onChange={(e) => set("contenu", e.target.value)} /></FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Publier</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Date</TableHead><TableHead>Audience</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {annonces.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.titre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell><Badge variant="secondary">{a.audience}</Badge></TableCell>
                <TableCell><Badge variant={a.publie ? "default" : "secondary"}>{a.publie ? "Publiée" : "Brouillon"}</Badge></TableCell>
              </TableRow>
            ))}
            {annonces.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucune annonce.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
