import { SettingsSection } from "@/components/settings/SettingsSection";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const stock = [
  { article: "Riz parfumé", unite: "kg", quantite: 145, seuil: 50, statut: "OK" },
  { article: "Huile végétale", unite: "L", quantite: 22, seuil: 30, statut: "Bas" },
  { article: "Tomate fraîche", unite: "kg", quantite: 38, seuil: 20, statut: "OK" },
  { article: "Poisson congelé", unite: "kg", quantite: 12, seuil: 25, statut: "Critique" },
  { article: "Oignons", unite: "kg", quantite: 60, seuil: 20, statut: "OK" },
  { article: "Sel", unite: "kg", quantite: 8, seuil: 10, statut: "Bas" },
];

export default function CanteenStock() {
  return (
    <SettingsSection
      title="Stock & approvisionnement"
      description="Suivi des denrées et alertes de réapprovisionnement."
      icon={<Package className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Bon de commande</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead className="text-center">Quantité</TableHead>
            <TableHead className="text-center">Seuil mini</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stock.map((s, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{s.article}</TableCell>
              <TableCell className="text-center">{s.quantite} {s.unite}</TableCell>
              <TableCell className="text-center text-muted-foreground">{s.seuil} {s.unite}</TableCell>
              <TableCell>
                <Badge variant={s.statut === "Critique" ? "destructive" : s.statut === "Bas" ? "secondary" : "default"}>
                  {s.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
