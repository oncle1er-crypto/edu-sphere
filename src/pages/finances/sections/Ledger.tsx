import { FileSpreadsheet, Download } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const entries = [
  { date: "26/04/2026", account: "411 - Clients", debit: "1 250 000", credit: "", label: "FAC-2025-0142" },
  { date: "26/04/2026", account: "706 - Prestations services", debit: "", credit: "1 250 000", label: "Scolarité Avril" },
  { date: "26/04/2026", account: "606 - Énergie", debit: "187 500", credit: "", label: "Facture ENEO" },
  { date: "26/04/2026", account: "401 - Fournisseurs", debit: "", credit: "187 500", label: "ENEO" },
  { date: "25/04/2026", account: "641 - Salaires", debit: "357 000", credit: "", label: "Mme Fouda Claire" },
  { date: "25/04/2026", account: "512 - Banque", debit: "", credit: "357 000", label: "Virement" },
];

export default function Ledger() {
  return (
    <SettingsSection
      title="Grand livre comptable"
      description="Écritures comptables détaillées (plan comptable OHADA)."
      icon={<FileSpreadsheet className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les comptes</SelectItem>
              <SelectItem value="411">411 - Clients</SelectItem>
              <SelectItem value="401">401 - Fournisseurs</SelectItem>
              <SelectItem value="512">512 - Banque</SelectItem>
              <SelectItem value="641">641 - Salaires</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="april">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="april">Avril 2026</SelectItem>
              <SelectItem value="march">Mars 2026</SelectItem>
              <SelectItem value="trimester">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export Excel</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Débit</TableHead>
              <TableHead className="text-right">Crédit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground text-xs">{e.date}</TableCell>
                <TableCell className="font-mono text-xs">{e.account}</TableCell>
                <TableCell className="text-muted-foreground">{e.label}</TableCell>
                <TableCell className="text-right font-semibold">{e.debit}</TableCell>
                <TableCell className="text-right font-semibold">{e.credit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
