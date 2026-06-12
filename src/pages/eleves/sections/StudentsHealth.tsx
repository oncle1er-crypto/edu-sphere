import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Plus, Loader2 } from "lucide-react";
import { useVisitesInfirmerie } from "@/hooks/useVisitesInfirmerie";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function StudentsHealth() {
  const { visites, loading, addVisite, ecoleId } = useVisitesInfirmerie();
  const { eleves } = useEleves();
  const { classes } = useClasses();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", classe_id: "", motif: "", traitement: "", suivi: "" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.eleve_id || !form.motif) { toast.error("Élève et motif obligatoires"); return; }
    setSaving(true);
    await addVisite({
      ecole_id: ecoleId!,
      eleve_id: form.eleve_id,
      classe_id: form.classe_id || null,
      motif: form.motif,
      traitement: form.traitement || null,
      suivi: form.suivi || null,
      enregistre_par: user?.id ?? null,
    });
    setForm({ eleve_id: "", classe_id: "", motif: "", traitement: "", suivi: "" });
    setOpen(false);
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Heart className="h-5 w-5" />}
      title="Infirmerie & registre des visites"
      description="Suivi médical, allergies et passages à l'infirmerie."
      hideSave
    >
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Nouvelle visite</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle visite infirmerie</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <SearchableSelect
                value={form.eleve_id}
                onValueChange={(v) => set("eleve_id", v)}
                placeholder="Sélectionner un élève"
                searchPlaceholder="Rechercher un élève..."
                options={eleves.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}`, keywords: `${e.matricule ?? ""} ${e.classe_nom ?? ""}` }))}
              />
              <Select value={form.classe_id} onValueChange={(v) => set("classe_id", v)}>
                <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Motif de la visite" value={form.motif} onChange={(e) => set("motif", e.target.value)} />
              <Input placeholder="Traitement administré" value={form.traitement} onChange={(e) => set("traitement", e.target.value)} />
              <Input placeholder="Suivi / Orientation" value={form.suivi} onChange={(e) => set("suivi", e.target.value)} />
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
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Traitement</TableHead>
              <TableHead>Suivi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visites.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(v.date_visite).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="font-medium">{v.eleve_nom}</TableCell>
                <TableCell><Badge variant="secondary">{v.classe_nom || "—"}</Badge></TableCell>
                <TableCell>{v.motif}</TableCell>
                <TableCell className="text-sm">{v.traitement}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.suivi}</TableCell>
              </TableRow>
            ))}
            {visites.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucune visite enregistrée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
