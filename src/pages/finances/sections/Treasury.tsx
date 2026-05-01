import { Landmark, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const accounts = [
  { name: "Compte principal — Afriland", number: "1000109876123456789012 23", balance: "8 450 000", type: "Banque" },
  { name: "Compte épargne — UBA", number: "2000201234567891234567 11", balance: "12 200 000", type: "Banque" },
  { name: "Caisse principale", number: "Espèces", balance: "385 000", type: "Caisse" },
  { name: "Wave Business", number: "+225 07 07 11 22 33", balance: "1 720 000", type: "Mobile" },
  { name: "Orange Money Pro", number: "+225 05 05 22 33 44", balance: "980 000", type: "Mobile" },
];

const movements = [
  { date: "26/04/2026", label: "Encaissement frais scolarité", account: "Afriland", in: "1 250 000", out: "" },
  { date: "26/04/2026", label: "Paiement CIE", account: "Afriland", in: "", out: "187 500" },
  { date: "25/04/2026", label: "Virement caisse → UBA", account: "UBA", in: "500 000", out: "" },
  { date: "25/04/2026", label: "Salaire Mme Fouda", account: "Afriland", in: "", out: "357 000" },
  { date: "24/04/2026", label: "Encaissement MoMo (lot)", account: "Wave Business", in: "820 000", out: "" },
];

export default function Treasury() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Comptes & soldes"
        description="Vue consolidée de toutes vos sources de trésorerie."
        icon={<Landmark className="h-5 w-5" />}
        hideSave
      >
        <div className="flex justify-end">
          <Button size="sm"><Plus className="h-4 w-4" />Ajouter un compte</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Card key={a.name} className="border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{a.type}</p>
                <p className="text-sm font-semibold mt-1">{a.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{a.number}</p>
                <p className="text-xl font-bold font-display text-primary mt-3">{a.balance} FCFA</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mouvements de trésorerie"
        description="Journal chronologique des entrées et sorties."
        icon={<Landmark className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead className="text-right">Entrée</TableHead>
                <TableHead className="text-right">Sortie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground text-xs">{m.date}</TableCell>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-muted-foreground">{m.account}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">
                    {m.in && (<span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" />{m.in}</span>)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {m.out && (<span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{m.out}</span>)}
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
