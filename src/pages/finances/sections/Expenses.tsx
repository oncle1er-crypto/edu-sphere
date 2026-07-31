import { Wallet, Plus, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepenses } from "@/hooks/useDepenses";
import { useFournisseurs } from "@/hooks/useFournisseurs";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useNiveau, niveauOfCycle, NIVEAU_LABELS } from "@/context/NiveauContext";
import { useEffect, useState } from "react";

const CATEGORIES = ["Fournitures pédagogiques", "Énergie & utilities", "Maintenance & entretien", "Transport scolaire", "Cantine", "Télécoms", "Autre"];

const COMMUN = "__commun__";

export default function Expenses() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const range = periodLoading || !activeAnnee ? undefined : { from: activeAnnee.debut, to: activeAnnee.fin };
  const { depenses, loading, addDepense, updateStatut } = useDepenses(range);
  const { fournisseurs } = useFournisseurs();
  const { cycles, niveau, isGlobal, cycleIds, label } = useNiveau();
  const [open, setOpen] = useState(false);
  const emptyForm = {
    libelle: "",
    categorie: "",
    montant: "",
    fournisseur_id: "",
    cycle_id: COMMUN,
    date_depense: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  const cycleName = (id?: string | null) => cycles.find((c) => c.id === id)?.nom ?? null;

  // En vue niveau, on préselectionne le premier cycle du niveau courant
  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, cycle_id: isGlobal ? COMMUN : cycleIds[0] ?? COMMUN }));
  }, [open, isGlobal, cycleIds.join(",")]);

  // Budget tracking by category
  const parCategorie = CATEGORIES.map((cat) => {
    const items = depenses.filter((d) => d.categorie === cat && d.statut === "validee");
    const spent = items.reduce((s, d) => s + d.montant, 0);
    return { name: cat, spent };
  }).filter((c) => c.spent > 0);

  const handleSubmit = async () => {
    if (!form.libelle || !form.montant) return;
    await addDepense({
      libelle: form.libelle,
      categorie: form.categorie || null,
      montant: Number(form.montant),
      fournisseur_id: form.fournisseur_id || null,
      cycle_id: form.cycle_id === COMMUN ? null : form.cycle_id,
      date_depense: form.date_depense,
      statut: "en_attente",
      reference: null,
      notes: null,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const totalDepenses = depenses.filter((d) => d.statut === "validee").reduce((s, d) => s + d.montant, 0);

  return (
    <div className="space-y-6">
      {parCategorie.length > 0 && (
        <SettingsSection title="Répartition par catégorie" description="Dépenses validées par poste." icon={<Wallet className="h-5 w-5" />} hideSave>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parCategorie.map((c) => {
              const pct = totalDepenses > 0 ? Math.round((c.spent / totalDepenses) * 100) : 0;
              return (
                <Card key={c.name} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <span className="text-xs font-bold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{c.spent.toLocaleString("fr-FR")} FCFA</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </SettingsSection>
      )}

      <SettingsSection title={`Dépenses (${depenses.length})`} description="Toutes les sorties de trésorerie enregistrées." icon={<Wallet className="h-5 w-5" />} hideSave>
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" />Nouvelle dépense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enregistrer une dépense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Libellé *</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Montant (FCFA) *</Label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></div>
                  <div><Label>Date</Label><Input type="date" value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} /></div>
                </div>
                <div><Label>Catégorie</Label>
                  <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {fournisseurs.length > 0 && (
                  <div><Label>Fournisseur</Label>
                    <Select value={form.fournisseur_id} onValueChange={(v) => setForm({ ...form, fournisseur_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                      <SelectContent>{fournisseurs.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {cycles.length > 0 && (
                  <div>
                    <Label>Imputation par niveau</Label>
                    <Select value={form.cycle_id} onValueChange={(v) => setForm({ ...form, cycle_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={COMMUN}>Commun (réparti entre les niveaux)</SelectItem>
                        {cycles.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nom} — {NIVEAU_LABELS[niveauOfCycle(c)]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      « Commun » : la dépense sera répartie au prorata dans les bilans par niveau.
                    </p>
                  </div>
                )}
                <Button onClick={handleSubmit} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.libelle}</TableCell>
                  <TableCell className="text-muted-foreground">{e.categorie ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.fournisseur_nom ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{e.montant.toLocaleString("fr-FR")} FCFA</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(e.date_depense).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={e.statut === "validee" ? "bg-accent/15 text-primary border-accent/30 cursor-default" : "bg-orange-500/15 text-orange-600 border-orange-500/30 cursor-pointer"}
                      onClick={() => e.statut !== "validee" && updateStatut(e.id, "validee")}
                    >
                      {e.statut === "validee" ? "Validée" : e.statut === "rejetee" ? "Rejetée" : "En attente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {depenses.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucune dépense enregistrée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>
    </div>
  );
}
