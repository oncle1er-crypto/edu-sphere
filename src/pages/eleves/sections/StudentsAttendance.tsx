import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Check, X, Clock } from "lucide-react";

const eleves = [
  { id: "ELV-001", nom: "Diallo Aminata", statut: "P" },
  { id: "ELV-002", nom: "Traoré Moussa", statut: "P" },
  { id: "ELV-003", nom: "Koné Fatou", statut: "A" },
  { id: "ELV-005", nom: "Bamba Aïcha", statut: "R" },
  { id: "ELV-006", nom: "Coulibaly Seydou", statut: "P" },
  { id: "ELV-007", nom: "Sangaré Mariam", statut: "P" },
];

const stats = [
  { label: "Présents", value: 32, color: "text-emerald-600", icon: Check },
  { label: "Absents", value: 4, color: "text-destructive", icon: X },
  { label: "Retards", value: 2, color: "text-amber-600", icon: Clock },
];

const badgeFor = (s: string) =>
  s === "P" ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Présent</Badge>
  : s === "A" ? <Badge variant="destructive">Absent</Badge>
  : <Badge className="bg-amber-500 hover:bg-amber-500">Retard</Badge>;

export default function StudentsAttendance() {
  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<CalendarCheck className="h-5 w-5" />}
        title="Appel du jour"
        description="Faites l'appel pour une classe et une séance."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldRow label="Classe">
            <Select defaultValue="6a"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6a">6ème A</SelectItem>
                <SelectItem value="6b">6ème B</SelectItem>
                <SelectItem value="cm2">CM2</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Date"><Input type="date" /></FieldRow>
          <FieldRow label="Séance">
            <Select defaultValue="m1"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="m1">Matin - 1ère heure</SelectItem>
                <SelectItem value="m2">Matin - 2ème heure</SelectItem>
                <SelectItem value="a1">Après-midi - 1ère heure</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-6 w-6 ${s.color}`} />
                <div>
                  <p className="text-2xl font-extrabold font-display">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.id}</TableCell>
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell>{badgeFor(e.statut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2"><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 px-2"><X className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="h-7 px-2"><Clock className="h-3.5 w-3.5" /></Button>
                    </div>
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
