import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenSquare, Save } from "lucide-react";

const students = [
  { matricule: "EL-2451", nom: "Mballa Junior", note: "15" },
  { matricule: "EL-2452", nom: "Nguemo Sarah", note: "17.5" },
  { matricule: "EL-2453", nom: "Tchoumi Paul", note: "11" },
  { matricule: "EL-2454", nom: "Atangana Léa", note: "13.5" },
  { matricule: "EL-2455", nom: "Kamga Yves", note: "9" },
  { matricule: "EL-2456", nom: "Owono Marie", note: "16" },
  { matricule: "EL-2457", nom: "Bessala André", note: "12" },
];

export default function GradeEntry() {
  return (
    <SettingsSection
      icon={<PenSquare className='h-5 w-5' />}
      title="Saisie des notes"
      description="Saisissez les notes par classe, matière et évaluation. Auto-sauvegarde activée."
      >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-xs">Classe</Label>
          <Select defaultValue="3a">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3a">3ème A</SelectItem>
              <SelectItem value="3b">3ème B</SelectItem>
              <SelectItem value="tlc">Tle C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Matière</Label>
          <Select defaultValue="maths">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="maths">Mathématiques</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="ang">Anglais</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Évaluation</Label>
          <Select defaultValue="ev101">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ev101">Devoir n°3 — Algèbre</SelectItem>
              <SelectItem value="ev102">Interro chap. 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Nom de l'élève</TableHead>
              <TableHead className="w-32">Note / 20</TableHead>
              <TableHead className="w-48">Appréciation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.matricule}>
                <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                <TableCell className="font-medium">{s.nom}</TableCell>
                <TableCell><Input defaultValue={s.note} className="h-8 w-20" /></TableCell>
                <TableCell><Input placeholder="Optionnel..." className="h-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
