import { FileSpreadsheet } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const declarations = [
  { period: "Mars 2026", type: "TVA", amount: "245 000", due: "15/04/2026", status: "Déclarée" },
  { period: "Q1 2026", type: "Acompte IS", amount: "1 200 000", due: "30/04/2026", status: "À payer" },
  { period: "Avril 2026", type: "CNPS", amount: "385 000", due: "15/05/2026", status: "À déclarer" },
  { period: "Mars 2026", type: "IRPP", amount: "168 500", due: "15/04/2026", status: "Déclarée" },
];

export default function Tax() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Configuration fiscale"
        description="Régime fiscal de votre établissement et taux applicables."
        icon={<FileSpreadsheet className="h-5 w-5" />}
      >
        <FieldRow label="Régime fiscal">
          <Select defaultValue="reel">
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reel">Réel normal</SelectItem>
              <SelectItem value="simplifie">Réel simplifié</SelectItem>
              <SelectItem value="liberatoire">Impôt libératoire</SelectItem>
              <SelectItem value="exonere">Exonéré (associatif)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Numéro contribuable (NIU)">
          <Input defaultValue="P057812345678X" className="w-56" />
        </FieldRow>
        <FieldRow label="Centre des impôts">
          <Input defaultValue="CDI Yaoundé Centre" />
        </FieldRow>
        <FieldRow label="Taux TVA standard (%)">
          <Input type="number" defaultValue={19.25} className="w-32" />
        </FieldRow>
        <FieldRow label="Activité exonérée de TVA" hint="Enseignement = exonéré au Cameroun">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Rappel automatique des échéances">
          <Switch defaultChecked />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Déclarations fiscales & sociales"
        description="Suivi des obligations à venir."
        icon={<FileSpreadsheet className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Période</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {declarations.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.period}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell className="text-right font-semibold">{d.amount} FCFA</TableCell>
                  <TableCell className="text-muted-foreground">{d.due}</TableCell>
                  <TableCell>
                    <span className={
                      d.status === "Déclarée" ? "text-accent text-xs font-semibold"
                        : d.status === "À payer" ? "text-destructive text-xs font-semibold"
                        : "text-orange-600 text-xs font-semibold"
                    }>● {d.status}</span>
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
