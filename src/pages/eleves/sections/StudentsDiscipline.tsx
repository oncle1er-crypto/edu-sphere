import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Award, Plus, Loader2 } from "lucide-react";
import { useIncidentsDiscipline } from "@/hooks/useIncidentsDiscipline";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const variantFor = (g: string) =>
  g === "grave" ? "destructive" : g === "leger" ? "secondary" : "default";

const typeLabels: Record<string, string> = {
  avertissement: "Avertissement",
  sanction: "Sanction",
  exclusion: "Exclusion",
  felicitation: "Félicitation",
  encouragement: "Encouragement",
};

export default function StudentsDiscipline() {
  const { incidents, loading, addIncident, ecoleId } = useIncidentsDiscipline();
  const { eleves } = useEleves();
  const { classes } = useClasses();
  const { anneeId } = useAnneeId();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eleve_id: "", classe_id: "", type: "avertissement", motif: "", decision: "", gravite: "leger",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.eleve_id) { toast.error("Sélectionnez un élève"); return; }
    setSaving(true);
    await addIncident({
      ecole_id: ecoleId!,
      eleve_id: form.eleve_id,
      classe_id: form.classe_id || null,
      annee_id: anneeId,
      type: form.type,
      motif: form.motif,
      decision: form.decision,
      gravite: form.gravite,
      enregistre_par: user?.id ?? null,
    });
    setForm({ eleve_id: "", classe_id: "", type: "avertissement", motif: "", decision: "", gravite: "leger" });
    setOpen(false);
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Award className="h-5 w-5" />}
      title="Discipline, sanctions & encouragements"
      description="Registre des incidents, félicitations et décisions disciplinaires."
      hideSave
    >
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Nouvel enregistrement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel incident</DialogTitle></DialogHeader>
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
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Motif" value={form.motif} onChange={(e) => set("motif", e.target.value)} />
              <Input placeholder="Décision" value={form.decision} onChange={(e) => set("decision", e.target.value)} />
              <Select value={form.gravite} onValueChange={(v) => set("gravite", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leger">Léger</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
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
              <TableHead>Type</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead>Gravité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(i.date_incident).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="font-medium">{i.eleve_nom}</TableCell>
                <TableCell><Badge variant="secondary">{i.classe_nom || "—"}</Badge></TableCell>
                <TableCell>{typeLabels[i.type] ?? i.type}</TableCell>
                <TableCell className="text-sm">{i.motif}</TableCell>
                <TableCell className="text-sm">{i.decision}</TableCell>
                <TableCell><Badge variant={variantFor(i.gravite ?? "") as any}>{i.gravite}</Badge></TableCell>
              </TableRow>
            ))}
            {incidents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucun incident enregistré.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
