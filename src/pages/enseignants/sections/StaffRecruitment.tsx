import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Plus, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEnseignantCandidatures } from "@/hooks/useEnseignantsRH";

const STATUTS = ["recue", "presélectionnée", "entretien", "recrutee", "refusee"];

const variantFor = (s: string) =>
  s === "recrutee" ? "default" : s === "refusee" ? "destructive" : "secondary";

export default function StaffRecruitment() {
  const { items, loading, add, update, remove } = useEnseignantCandidatures();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    nom: "", prenom: "", email: "", telephone: "",
    matiere_souhaitee: "", niveau_etudes: "", experience_annees: 0, notes_entretien: "",
  });

  const handleAdd = async () => {
    if (!form.nom || !form.prenom) return;
    await add(form);
    setOpen(false);
    setForm({ nom: "", prenom: "", email: "", telephone: "", matiere_souhaitee: "", niveau_etudes: "", experience_annees: 0, notes_entretien: "" });
  };

  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Recrutement"
      description="Candidatures reçues et suivi du processus de sélection."
      hideSave
    >
      <Tabs defaultValue="candidats" className="w-full">
        <TabsList>
          <TabsTrigger value="candidats">Candidatures</TabsTrigger>
          <TabsTrigger value="nouveau">Nouvelle</TabsTrigger>
        </TabsList>

        <TabsContent value="candidats" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Saisir candidature</Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Aucune candidature.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Expérience</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.prenom} {c.nom}</TableCell>
                      <TableCell>{c.matiere_souhaitee ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{c.experience_annees ?? 0} ans</Badge></TableCell>
                      <TableCell className="text-xs">{c.email ?? c.telephone ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={c.statut} onValueChange={(v) => update(c.id, { statut: v })}>
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue>
                              <Badge variant={variantFor(c.statut) as any} className="text-xs">{c.statut}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="nouveau" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">Utilisez le bouton « Saisir candidature » dans l'onglet Candidatures.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle candidature</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom</Label><Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div><Label>Matière souhaitée</Label><Input value={form.matiere_souhaitee} onChange={(e) => setForm({ ...form, matiere_souhaitee: e.target.value })} /></div>
              <div><Label>Niveau d'études</Label><Input value={form.niveau_etudes} onChange={(e) => setForm({ ...form, niveau_etudes: e.target.value })} /></div>
              <div><Label>Expérience (années)</Label><Input type="number" min={0} value={form.experience_annees} onChange={(e) => setForm({ ...form, experience_annees: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Notes / entretien</Label><Textarea rows={3} value={form.notes_entretien} onChange={(e) => setForm({ ...form, notes_entretien: e.target.value })} /></div>
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
