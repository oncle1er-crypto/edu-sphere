import { useState } from "react";
import { FileText, Plus, Search, Download, Eye } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const invoices = [
  { id: "FAC-2025-0142", student: "Mballa Junior", class: "6e A", amount: "150 000", due: "30/04/2026", status: "Payée" },
  { id: "FAC-2025-0141", student: "Nguemo Sarah", class: "Term D", amount: "225 000", due: "30/04/2026", status: "Payée" },
  { id: "FAC-2025-0140", student: "Tchoumi Paul", class: "CE2", amount: "75 000", due: "30/04/2026", status: "Partielle" },
  { id: "FAC-2025-0139", student: "Atangana Léa", class: "5e B", amount: "150 000", due: "15/04/2026", status: "En retard" },
  { id: "FAC-2025-0138", student: "Kamga Yves", class: "L2 Info", amount: "350 000", due: "30/04/2026", status: "Brouillon" },
  { id: "FAC-2025-0137", student: "Fopa Inès", class: "GS", amount: "60 000", due: "30/04/2026", status: "Payée" },
];

const statusVariant: Record<string, string> = {
  "Payée": "bg-accent/15 text-accent border-accent/30",
  "Partielle": "bg-orange-500/15 text-orange-600 border-orange-500/30",
  "En retard": "bg-destructive/15 text-destructive border-destructive/30",
  "Brouillon": "bg-muted text-muted-foreground border-border",
};

export default function Invoices() {
  const [q, setQ] = useState("");
  const filtered = invoices.filter(
    (i) => i.student.toLowerCase().includes(q.toLowerCase()) || i.id.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <SettingsSection
      title="Factures & frais de scolarité"
      description="Émettez, suivez et exportez les factures de vos élèves."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une facture ou un élève..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="partial">Partielle</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>N° facture</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.id}</TableCell>
                <TableCell className="font-medium">{i.student}</TableCell>
                <TableCell className="text-muted-foreground">{i.class}</TableCell>
                <TableCell className="text-right font-semibold">{i.amount} FCFA</TableCell>
                <TableCell className="text-muted-foreground">{i.due}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariant[i.status]}>{i.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
