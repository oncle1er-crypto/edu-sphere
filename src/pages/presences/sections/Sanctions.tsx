import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { eleve: "Ousmane Ndiaye", classe: "6ème A", absences: 8, sanction: "Avertissement écrit", date: "2026-04-25" },
  { eleve: "Sékou Keita", classe: "5ème B", absences: 12, sanction: "Conseil de discipline", date: "2026-04-22" },
  { eleve: "Awa Diallo", classe: "6ème A", absences: 5, sanction: "Convocation parents", date: "2026-04-20" },
];

export default function Sanctions() {
  return (
    <SettingsSection
      icon={<FileWarning className="h-5 w-5" />}
      title="Sanctions liées à l'absentéisme"
      description="Mesures disciplinaires déclenchées par les seuils d'absences."
    >
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Absences cumulées</TableHead>
              <TableHead>Sanction</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.eleve}</TableCell>
                <TableCell>{r.classe}</TableCell>
                <TableCell><Badge variant="outline">{r.absences}</Badge></TableCell>
                <TableCell>{r.sanction}</TableCell>
                <TableCell className="text-sm">{r.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
