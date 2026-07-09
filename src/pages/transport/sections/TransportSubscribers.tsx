import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Users, Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useEleves } from "@/hooks/useEleves";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

interface Row {
  id: string; eleve_nom: string; classe_nom: string; ligne_nom: string; statut: string;
}

export default function TransportSubscribers() {
  const { ecoleId } = useEcoleId();
  const { eleves } = useEleves();
  const { anneeId } = useAnneeId();
  const [rows, setRows] = useState<Row[]>([]);
  const [lignes, setLignes] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", ligne_id: "" });

  const fetchData = async () => {
    if (!ecoleId) return;
    const [{ data: ab }, { data: lg }] = await Promise.all([
      supabase.from("abonnements_transport").select("id, statut, eleves(nom, prenom, classes(nom)), lignes_transport(nom)").eq("ecole_id", ecoleId).order("created_at", { ascending: false }),
      supabase.from("lignes_transport").select("id, nom").eq("ecole_id", ecoleId).order("nom"),
    ]);
    setRows(((ab ?? []) as any[]).map((a) => ({
      id: a.id, statut: a.statut,
      eleve_nom: a.eleves ? `${a.eleves.nom} ${a.eleves.prenom}` : "?",
      classe_nom: a.eleves?.classes?.nom ?? "—",
      ligne_nom: a.lignes_transport?.nom ?? "—",
    })));
    setLignes(lg ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.eleve_id || !form.ligne_id || !ecoleId || !anneeId) return;
    setSaving(true);
    const { error } = await supabase.from("abonnements_transport").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, ligne_id: form.ligne_id, annee_id: anneeId, statut: "actif",
    });
    if (error) toast.error(error.message);
    else { toast.success("Abonnement créé"); await fetchData(); setForm({ eleve_id: "", ligne_id: "" }); }
    setOpen(false); setSaving(false);
  };

  const filtered = rows.filter((a) => a.eleve_nom.toLowerCase().includes(search.toLowerCase()) || a.classe_nom.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<Users className="h-5 w-5" />} title={`Élèves abonnés (${filtered.length})`} description="Inscrits au transport scolaire." hideSave>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvel abonnement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel abonnement transport</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Élève *">
                <SearchableSelect
                  value={form.eleve_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, eleve_id: v }))}
                  placeholder="Sélectionner un élève"
                  searchPlaceholder="Rechercher un élève..."
                  options={eleves.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}`, keywords: `${e.matricule ?? ""} ${e.classe_nom ?? ""}` }))}
                />
              </FieldRow>
              <FieldRow label="Ligne *">
                <Select value={form.ligne_id} onValueChange={(v) => setForm((p) => ({ ...p, ligne_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une ligne" /></SelectTrigger>
                  <SelectContent>{lignes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving || !form.eleve_id || !form.ligne_id}>
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
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Ligne</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.eleve_nom}</TableCell>
                <TableCell><Badge variant="secondary">{a.classe_nom}</Badge></TableCell>
                <TableCell>{a.ligne_nom}</TableCell>
                <TableCell><Badge variant={a.statut === "actif" ? "default" : "secondary"}>{a.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucun abonnement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
