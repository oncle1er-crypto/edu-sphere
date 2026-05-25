import { PiggyBank, Plus, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/hooks/useBudget";
import { useState } from "react";

export default function Budget() {
  const { lignes, loading, addLigne } = useBudget();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ libelle: "", type: "depense", montant_prevu: "" });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const recettes = lignes.filter((l) => l.type === "recette");
  const depensesLignes = lignes.filter((l) => l.type === "depense");
  const totalPrevu = lignes.reduce((s, l) => s + l.montant_prevu, 0);
  const totalRealise = lignes.reduce((s, l) => s + l.montant_realise, 0);

  const handleSubmit = async () => {
    if (!form.libelle || !form.montant_prevu) return;
    await addLigne({ libelle: form.libelle, type: form.type, montant_prevu: Number(form.montant_prevu) });
    setForm({ libelle: "", type: "depense", montant_prevu: "" });
    setOpen(false);
  };

  const renderSection = (title: string, items: typeof lignes, color: string) => (
    items.length > 0 && (
      <div className="space-y-3">
        <h4 className={`text-sm font-bold uppercase tracking-wider ${color}`}>{title}</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((b) => {
            const pct = b.montant_prevu > 0 ? Math.round((b.montant_realise / b.montant_prevu) * 100) : 0;
            return (
              <Card key={b.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-semibold">{b.libelle}</p>
                    <span className="text-xs font-bold text-primary">{pct}%</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {b.montant_realise.toLocaleString("fr-FR")} / {b.montant_prevu.toLocaleString("fr-FR")} FCFA
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Budget annuel"
        description={lignes.length > 0 ? `Prévisionnel : ${totalPrevu.toLocaleString("fr-FR")} FCFA · Réalisé : ${totalRealise.toLocaleString("fr-FR")} FCFA` : "Configurez vos lignes budgétaires."}
        icon={<PiggyBank className="h-5 w-5" />}
        hideSave
      >
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Nouvelle ligne</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une ligne budgétaire</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Libellé *</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recette">Recette</SelectItem>
                        <SelectItem value="depense">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Montant prévu (FCFA)</Label><Input type="number" value={form.montant_prevu} onChange={(e) => setForm({ ...form, montant_prevu: e.target.value })} /></div>
                </div>
                <Button onClick={handleSubmit} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {lignes.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune ligne budgétaire. Cliquez sur « Nouvelle ligne » pour commencer.</p>}

        {renderSection("Recettes", recettes, "text-primary")}
        {renderSection("Dépenses", depensesLignes, "text-destructive")}
      </SettingsSection>
    </div>
  );
}
