import { CreditCard, Plus, Smartphone, Banknote, Building2, CreditCard as CardIcon } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { LockBanner } from "@/components/LockGuard";
import { useLock } from "@/context/AcademicPeriodContext";
import { toast } from "sonner";

const methodStats = [
  { name: "MTN Mobile Money", count: 142, amount: "5 320 000", icon: Smartphone, color: "text-yellow-600 bg-yellow-500/15" },
  { name: "Orange Money", count: 98, amount: "3 670 000", icon: Smartphone, color: "text-orange-600 bg-orange-500/15" },
  { name: "Espèces", count: 67, amount: "2 010 000", icon: Banknote, color: "text-accent bg-accent/15" },
  { name: "Virement", count: 24, amount: "1 450 000", icon: Building2, color: "text-primary bg-primary/15" },
];

const payments = [
  { id: "PAY-2042", student: "Mballa Junior", invoice: "FAC-2025-0142", method: "MTN MoMo", amount: "75 000", date: "26/04/2026 14:32", status: "Confirmé" },
  { id: "PAY-2041", student: "Nguemo Sarah", invoice: "FAC-2025-0141", method: "Virement", amount: "150 000", date: "26/04/2026 11:08", status: "Confirmé" },
  { id: "PAY-2040", student: "Tchoumi Paul", invoice: "FAC-2025-0140", method: "Espèces", amount: "37 500", date: "25/04/2026 16:45", status: "Confirmé" },
  { id: "PAY-2039", student: "Atangana Léa", invoice: "FAC-2025-0139", method: "Orange Money", amount: "75 000", date: "25/04/2026 09:20", status: "En attente" },
  { id: "PAY-2038", student: "Kamga Yves", invoice: "FAC-2025-0138", method: "Stripe", amount: "350 000", date: "24/04/2026 18:55", status: "Confirmé" },
];

export default function Payments() {
  const lock = useLock("paiements");
  return (
    <div className="space-y-6">
      <LockBanner module="paiements" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {methodStats.map((m) => (
          <Card key={m.name} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">{m.name}</p>
              <p className="text-lg font-bold font-display text-primary mt-1">{m.amount}</p>
              <p className="text-xs text-muted-foreground">{m.count} transactions</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SettingsSection
        title="Encaissements"
        description="Historique de toutes les transactions reçues."
        icon={<CreditCard className="h-5 w-5" />}
        hideSave
      >
        <div className="flex justify-end">
          <Button size="sm" disabled={lock.locked} title={lock.locked ? lock.reason : undefined}>
            <Plus className="h-4 w-4" />
            Saisir un paiement
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Référence</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.student}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.invoice}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="text-right font-semibold">{p.amount} FCFA</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      p.status === "Confirmé"
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
    </div>
  );
}
