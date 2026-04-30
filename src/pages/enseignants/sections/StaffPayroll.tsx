import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Download, Send } from "lucide-react";

const kpis = [
  { label: "Masse salariale", value: "18 420 000 FCFA", color: "text-primary" },
  { label: "Charges sociales", value: "2 850 000 FCFA", color: "text-blue-600" },
  { label: "Net à payer", value: "15 570 000 FCFA", color: "text-emerald-600" },
];

const fiches = [
  { id: "PAY-2026-04-001", membre: "Sidibé Amadou", brut: "320 000", charges: "48 000", net: "272 000", statut: "Payé" },
  { id: "PAY-2026-04-002", membre: "Touré Fatoumata", brut: "350 000", charges: "52 500", net: "297 500", statut: "Payé" },
  { id: "PAY-2026-04-003", membre: "Diarra Mamadou", brut: "180 000", charges: "27 000", net: "153 000", statut: "En attente" },
  { id: "PAY-2026-04-004", membre: "Sanogo Aïssata", brut: "260 000", charges: "39 000", net: "221 000", statut: "En attente" },
  { id: "PAY-2026-04-005", membre: "Konaté Boubacar", brut: "150 000", charges: "22 500", net: "127 500", statut: "Payé" },
];

export default function StaffPayroll() {
  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Wallet className="h-5 w-5" />}
        title="Paie & salaires"
        description="Bulletins de paie mensuels et virements."
        hideSave
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Select defaultValue="2026-04">
            <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-04">Avril 2026</SelectItem>
              <SelectItem value="2026-03">Mars 2026</SelectItem>
              <SelectItem value="2026-02">Février 2026</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4" />Tout exporter</Button>
            <Button size="sm"><Send className="h-4 w-4" />Lancer la paie</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className="border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-extrabold font-display mt-1 ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Bulletin</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead>Brut</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiches.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.id}</TableCell>
                  <TableCell className="font-medium">{f.membre}</TableCell>
                  <TableCell>{f.brut}</TableCell>
                  <TableCell className="text-muted-foreground">{f.charges}</TableCell>
                  <TableCell className="font-semibold">{f.net}</TableCell>
                  <TableCell>
                    <Badge variant={f.statut === "Payé" ? "default" : "secondary"}>{f.statut}</Badge>
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
