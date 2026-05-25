import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Users, Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useEleves } from "@/hooks/useEleves";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

interface Abonnement {
  id: string;
  eleve_nom: string;
  classe_nom: string;
  regime: string | null;
  montant_mensuel: number | null;
  statut: string;
}

export default function CanteenSubscribers() {
  const { ecoleId } = useEcoleId();
  const { eleves } = useEleves();
  const { anneeId } = useAnneeId();
  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", regime: "normal", montant: "15000" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data, error } = await supabase
      .from("abonnements_cantine")
      .select("*, eleves(nom, prenom, classes(nom))")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); } else {
      setAbonnements((data ?? []).map((a: any) => ({
        id: a.id,
        eleve_nom: a.eleves ? `${a.eleves.nom} ${a.eleves.prenom}` : "?",
        classe_nom: a.eleves?.classes?.nom ?? "—",
        regime: a.regime,
        montant_mensuel: a.montant_mensuel,
        statut: a.statut,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.eleve_id || !ecoleId || !anneeId) return;
    setSaving(true);
    const { error } = await supabase.from("abonnements_cantine").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, annee_id: anneeId,
      regime: form.regime, montant_mensuel: parseFloat(form.montant) || 15000,
    });
    if (error) toast.error(error.message);
    else { toast.success("Abonnement créé"); await fetchData(); }
    setOpen(false);
    setSaving(false);
  };

  const filtered = abonnements.filter((a) =>
    a.eleve_nom.toLowerCase().includes(search.toLowerCase()) || a.classe_nom.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<Users className="h-5 w-5" />} title={`Abonnés (${filtered.length})`} description="Gestion des abonnements cantine." hideSave>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvel abonnement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel abonnement cantine</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.eleve_id} onValueChange={(v) => set("eleve_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                <SelectContent>{eleves.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent>
              </Select>
              <FieldRow label="Régime">
                <Select value={form.regime} onValueChange={(v) => set("regime", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="vegetarien">Végétarien</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="allergie">Allergie</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Montant mensuel (FCFA)"><Input type="number" value={form.montant} onChange={(e) => set("montant", e.target.value)} /></FieldRow>
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
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Régime</TableHead>
              <TableHead>Montant/mois</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.eleve_nom}</TableCell>
                <TableCell><Badge variant="secondary">{a.classe_nom}</Badge></TableCell>
                <TableCell className="text-sm">{a.regime ?? "normal"}</TableCell>
                <TableCell className="font-semibold">{(a.montant_mensuel ?? 0).toLocaleString("fr-FR")} FCFA</TableCell>
                <TableCell><Badge variant={a.statut === "actif" ? "default" : "secondary"}>{a.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun abonnement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
