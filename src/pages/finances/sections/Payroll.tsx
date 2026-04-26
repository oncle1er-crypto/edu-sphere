import { Users, Plus, FileDown } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const payroll = [
  { name: "M. Owono Jean", role: "Enseignant Maths", gross: "450 000", deductions: "67 500", net: "382 500", status: "Payé" },
  { name: "Mme Fouda Claire", role: "Enseignante Français", gross: "420 000", deductions: "63 000", net: "357 000", status: "Payé" },
  { name: "M. Biya Patrick", role: "Surveillant général", gross: "280 000", deductions: "42 000", net: "238 000", status: "Payé" },
  { name: "Mme Ekobo Sandra", role: "Comptable", gross: "350 000", deductions: "52 500", net: "297 500", status: "Payé" },
  { name: "M. Ndoumbe Alain", role: "Chauffeur", gross: "180 000", deductions: "27 000", net: "153 000", status: "En attente" },
  { name: "Mme Toko Linda", role: "Cuisinière", gross: "150 000", deductions: "22 500", net: "127 500", status: "En attente" },
];

export default function Payroll() {
  return (
    <SettingsSection
      title="Salaires & paie"
      description="Gestion des bulletins de paie du personnel pour le mois en cours."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Masse salariale du mois : </span>
          <span className="font-bold text-primary">1 555 000 FCFA</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileDown className="h-4 w-4" />Exporter bulletins</Button>
          <Button size="sm"><Plus className="h-4 w-4" />Générer la paie</Button>
        </div>
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
            {payroll.map((p) => (
              <TableRow key={p.name}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.role}</TableCell>
                <TableCell className="text-right">{p.gross} FCFA</TableCell>
                <TableCell className="text-right text-destructive">-{p.deductions}</TableCell>
                <TableCell className="text-right font-bold text-primary">{p.net} FCFA</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    p.status === "Payé"
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "bg-orange-500/15 text-orange-600 border-orange-500/30"
                  }>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
