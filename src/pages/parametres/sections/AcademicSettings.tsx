import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const periodes = [
  { nom: "1er Trimestre", debut: "02/09/2025", fin: "20/12/2025", actif: true },
  { nom: "2ème Trimestre", debut: "06/01/2026", fin: "04/04/2026", actif: false },
  { nom: "3ème Trimestre", debut: "21/04/2026", fin: "30/06/2026", actif: false },
];

const mentions = [
  { min: 16, label: "Très Bien" },
  { min: 14, label: "Bien" },
  { min: 12, label: "Assez Bien" },
  { min: 10, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

export default function AcademicSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Année scolaire"
        description="Définition de l'année active et des périodes d'évaluation."
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <FieldRow label="Année scolaire active">
          <Select defaultValue="2025-2026">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-2026">2025 - 2026 (en cours)</SelectItem>
              <SelectItem value="2024-2025">2024 - 2025 (archivée)</SelectItem>
              <SelectItem value="2023-2024">2023 - 2024 (archivée)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Découpage" hint="Trimestriel ou semestriel">
          <Select defaultValue="trimestre">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trimestre">Trimestriel (3 périodes)</SelectItem>
              <SelectItem value="semestre">Semestriel (2 périodes)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Périodes">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodes.map((p) => (
                  <TableRow key={p.nom}>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.debut}</TableCell>
                    <TableCell>{p.fin}</TableCell>
                    <TableCell>
                      {p.actif ? <Badge>Actif</Badge> : <Badge variant="secondary">À venir</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Système de notation"
        description="Échelle de notes, mentions et règles de calcul."
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <FieldRow label="Échelle">
          <Select defaultValue="20">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Sur 20</SelectItem>
              <SelectItem value="100">Sur 100</SelectItem>
              <SelectItem value="letter">Lettres (A-F)</SelectItem>
              <SelectItem value="gpa">GPA (sur 4.0)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Note de passage" hint="En dessous, l'élève est en échec">
          <Input type="number" defaultValue={10} className="w-32" />
        </FieldRow>

        <FieldRow label="Mode de calcul">
          <Select defaultValue="pondere">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pondere">Moyenne pondérée (par coefficient)</SelectItem>
              <SelectItem value="simple">Moyenne simple</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Mentions automatiques" hint="Affichées sur les bulletins">
          <div className="space-y-2">
            {mentions.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">≥ {m.min}</span>
                <Input defaultValue={m.label} className="flex-1" />
                <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm"><Plus className="h-4 w-4" />Ajouter une mention</Button>
          </div>
        </FieldRow>

        <FieldRow label="Classement automatique" hint="Calcul du rang par classe">
          <Switch defaultChecked />
        </FieldRow>
      </SettingsSection>
    </div>
  );
}
