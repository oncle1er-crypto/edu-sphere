import { AlertTriangle, Bell, Mail, MessageSquare } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const unpaid = [
  { student: "Atangana Léa", class: "5e B", amount: "75 000", overdue: 11, reminders: 2 },
  { student: "Mbarga Eric", class: "Term C", amount: "225 000", overdue: 24, reminders: 3 },
  { student: "Ngono Carine", class: "CM1", amount: "75 000", overdue: 5, reminders: 1 },
  { student: "Ekwalla Joël", class: "L1 Droit", amount: "350 000", overdue: 38, reminders: 4 },
  { student: "Ondoa Marie", class: "PS", amount: "60 000", overdue: 8, reminders: 1 },
];

export default function Unpaid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total impayés</p>
            <p className="text-2xl font-bold font-display text-destructive mt-1">1 985 000 FCFA</p>
            <p className="text-xs text-muted-foreground mt-1">32 élèves concernés</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Retard moyen</p>
            <p className="text-2xl font-bold font-display text-orange-600 mt-1">17 jours</p>
            <p className="text-xs text-muted-foreground mt-1">+3 jours vs mois dernier</p>
          </CardContent>
        </Card>
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Relances envoyées</p>
            <p className="text-2xl font-bold font-display text-primary mt-1">87</p>
            <p className="text-xs text-muted-foreground mt-1">Ce mois-ci</p>
          </CardContent>
        </Card>
      </div>

      <SettingsSection
        title="Impayés & relances"
        description="Suivez les retards de paiement et déclenchez les rappels automatiques."
        icon={<AlertTriangle className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm"><Mail className="h-4 w-4" />Email groupé</Button>
          <Button variant="outline" size="sm"><MessageSquare className="h-4 w-4" />SMS groupé</Button>
          <Button size="sm"><Bell className="h-4 w-4" />Lancer relance</Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Montant dû</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead>Relances</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaid.map((u) => (
                <TableRow key={u.student}>
                  <TableCell className="font-medium">{u.student}</TableCell>
                  <TableCell className="text-muted-foreground">{u.class}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{u.amount} FCFA</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      u.overdue > 30
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-orange-500/15 text-orange-600 border-orange-500/30"
                    }>{u.overdue} jours</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.reminders}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">Relancer</Button>
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
