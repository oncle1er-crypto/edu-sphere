import { Users, Plus, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useBulletinsPaie } from "@/hooks/useBulletinsPaie";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useState } from "react";

const MOIS_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function Payroll() {
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee] = useState(new Date().getFullYear());
  const { bulletins, loading, addBulletin, payBulletin } = useBulletinsPaie(mois, annee);
  const { enseignants } = useEnseignants();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ enseignant_id: "", salaire_brut: "", retenues: "" });

  const masse = bulletins.reduce((s, b) => s + b.net_a_payer, 0);

  const handleSubmit = async () => {
    if (!form.enseignant_id || !form.salaire_brut) return;
    const brut = Number(form.salaire_brut);
    const ret = Number(form.retenues) || Math.round(brut * 0.15);
    await addBulletin({ enseignant_id: form.enseignant_id, salaire_brut: brut, retenues: ret, net_a_payer: brut - ret });
    setForm({ enseignant_id: "", salaire_brut: "", retenues: "" });
    setOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title="Salaires & paie" description={`${MOIS_LABELS[mois - 1]} ${annee} · Masse salariale : ${masse.toLocaleString("fr-FR")} FCFA`} icon={<Users className="h-5 w-5" />} hideSave>
      <div className="flex flex-wrap justify-between gap-3">
        <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{MOIS_LABELS.map((l, i) => <SelectItem key={i} value={String(i + 1)}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Générer un bulletin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau bulletin de paie</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Employé *</Label>
                <SearchableSelect
                  value={form.enseignant_id}
                  onValueChange={(v) => setForm({ ...form, enseignant_id: v })}
                  placeholder="Choisir..."
                  searchPlaceholder="Rechercher un employé..."
                  options={enseignants.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Salaire brut (FCFA) *</Label><Input type="number" value={form.salaire_brut} onChange={(e) => setForm({ ...form, salaire_brut: e.target.value })} /></div>
                <div><Label>Retenues (FCFA)</Label><Input type="number" value={form.retenues} onChange={(e) => setForm({ ...form, retenues: e.target.value })} placeholder="Auto: 15%" /></div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Créer le bulletin</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Employé</TableHead>
              <TableHead>Fonction</TableHead>
              <TableHead className="text-right">Brut</TableHead>
              <TableHead className="text-right">Retenues</TableHead>
              <TableHead className="text-right">Net à payer</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulletins.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.enseignant_nom}</TableCell>
                <TableCell className="text-muted-foreground">{p.enseignant_fonction}</TableCell>
                <TableCell className="text-right">{p.salaire_brut.toLocaleString("fr-FR")} FCFA</TableCell>
                <TableCell className="text-right text-destructive">-{p.retenues.toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right font-bold text-primary">{p.net_a_payer.toLocaleString("fr-FR")} FCFA</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={p.statut === "paye" ? "bg-accent/15 text-primary border-accent/30 cursor-default" : "bg-orange-500/15 text-orange-600 border-orange-500/30 cursor-pointer"}
                    onClick={() => p.statut !== "paye" && payBulletin(p.id)}
                  >
                    {p.statut === "paye" ? "Payé" : "En attente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {bulletins.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun bulletin pour ce mois.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
