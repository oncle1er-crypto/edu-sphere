import { Receipt, Download, Printer, Mail } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const receipts = [
  { id: "REC-2025-0892", student: "Mballa Junior", amount: "75 000", date: "26/04/2026", sent: true },
  { id: "REC-2025-0891", student: "Nguemo Sarah", amount: "150 000", date: "26/04/2026", sent: true },
  { id: "REC-2025-0890", student: "Tchoumi Paul", amount: "37 500", date: "25/04/2026", sent: false },
  { id: "REC-2025-0889", student: "Kamga Yves", amount: "350 000", date: "24/04/2026", sent: true },
  { id: "REC-2025-0888", student: "Fopa Inès", amount: "60 000", date: "23/04/2026", sent: true },
];

export default function Receipts() {
  return (
    <SettingsSection
      title="Reçus & quittances"
      description="Documents officiels remis aux familles après paiement."
      icon={<Receipt className="h-5 w-5" />}
      hideSave
    >
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>N° reçu</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Date d'émission</TableHead>
              <TableHead>Envoyé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium">{r.student}</TableCell>
                <TableCell className="text-right font-semibold">{r.amount} FCFA</TableCell>
                <TableCell className="text-muted-foreground">{r.date}</TableCell>
                <TableCell>
                  <span className={r.sent ? "text-accent text-xs font-semibold" : "text-muted-foreground text-xs"}>
                    {r.sent ? "✓ Envoyé" : "Non envoyé"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Télécharger PDF"><Download className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Imprimer"><Printer className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Envoyer par email"><Mail className="h-4 w-4" /></Button>
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
