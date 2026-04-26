import { Landmark, Plus } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const suppliers = [
  { name: "Librairie Etoile", category: "Fournitures pédagogiques", balance: "0", contact: "+237 6 99 11 22 33", status: "Actif" },
  { name: "ENEO", category: "Énergie", balance: "187 500", contact: "service@eneocameroon.cm", status: "Actif" },
  { name: "Camwater", category: "Eau", balance: "62 000", contact: "+237 6 77 00 00 00", status: "Actif" },
  { name: "Garage Auto+", category: "Maintenance véhicules", balance: "245 000", contact: "+237 6 50 12 34 56", status: "Actif" },
  { name: "Marché Mokolo", category: "Cantine", balance: "0", contact: "—", status: "Actif" },
  { name: "Orange Cameroun", category: "Télécoms / Internet", balance: "85 000", contact: "pro@orange.cm", status: "Actif" },
];

export default function Suppliers() {
  return (
    <SettingsSection
      title="Fournisseurs & prestataires"
      description="Carnet de contacts et soldes des comptes fournisseurs."
      icon={<Landmark className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouveau fournisseur</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Solde dû</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.category}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{s.contact}</TableCell>
                <TableCell className={`text-right font-semibold ${s.balance !== "0" ? "text-destructive" : "text-muted-foreground"}`}>
                  {s.balance === "0" ? "—" : `${s.balance} FCFA`}
                </TableCell>
                <TableCell><span className="text-accent text-xs font-semibold">● {s.status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
