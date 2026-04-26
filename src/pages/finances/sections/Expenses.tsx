import { Wallet, Plus } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const categories = [
  { name: "Salaires & paie", spent: 4200000, budget: 5000000 },
  { name: "Fournitures pédagogiques", spent: 850000, budget: 1200000 },
  { name: "Maintenance & entretien", spent: 620000, budget: 800000 },
  { name: "Énergie & utilities", spent: 480000, budget: 600000 },
  { name: "Transport scolaire", spent: 720000, budget: 900000 },
  { name: "Cantine", spent: 950000, budget: 1100000 },
];

const expenses = [
  { id: "DEP-0421", label: "Achat manuels SVT 6e", category: "Fournitures", amount: "320 000", supplier: "Librairie Etoile", date: "25/04/2026", status: "Validée" },
  { id: "DEP-0420", label: "Facture ENEO Avril", category: "Énergie", amount: "187 500", supplier: "ENEO", date: "24/04/2026", status: "Validée" },
  { id: "DEP-0419", label: "Réparation bus n°2", category: "Transport", amount: "245 000", supplier: "Garage Auto+", date: "22/04/2026", status: "En attente" },
  { id: "DEP-0418", label: "Approvisionnement cantine", category: "Cantine", amount: "412 000", supplier: "Marché Mokolo", date: "20/04/2026", status: "Validée" },
];

export default function Expenses() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Suivi budgétaire par catégorie"
        description="Comparaison dépenses réelles / budget prévisionnel."
        icon={<Wallet className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((c) => {
            const pct = Math.round((c.spent / c.budget) * 100);
            return (
              <Card key={c.name} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <span className={`text-xs font-bold ${pct > 90 ? "text-destructive" : pct > 75 ? "text-orange-600" : "text-accent"}`}>
                      {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {c.spent.toLocaleString()} / {c.budget.toLocaleString()} FCFA
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Dépenses récentes"
        description="Toutes les sorties de trésorerie enregistrées."
        icon={<Wallet className="h-5 w-5" />}
        hideSave
      >
        <div className="flex justify-end">
          <Button size="sm"><Plus className="h-4 w-4" />Nouvelle dépense</Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Référence</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.id}</TableCell>
                  <TableCell className="font-medium">{e.label}</TableCell>
                  <TableCell className="text-muted-foreground">{e.category}</TableCell>
                  <TableCell className="text-muted-foreground">{e.supplier}</TableCell>
                  <TableCell className="text-right font-semibold">{e.amount} FCFA</TableCell>
                  <TableCell className="text-muted-foreground">{e.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      e.status === "Validée"
                        ? "bg-accent/15 text-accent border-accent/30"
                        : "bg-orange-500/15 text-orange-600 border-orange-500/30"
                    }>{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>
    </div>
  );
}
