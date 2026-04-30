import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Plus } from "lucide-react";

const incidents = [
  { date: "29/04/2026", eleve: "Camara Ibrahim", classe: "2nde C", type: "Sanction", motif: "Bagarre dans la cour", decision: "Exclusion 2 jours", gravite: "Grave" },
  { date: "28/04/2026", eleve: "Traoré Moussa", classe: "6ème B", type: "Avertissement", motif: "Bavardage répété", decision: "Convocation parents", gravite: "Léger" },
  { date: "27/04/2026", eleve: "Diallo Aminata", classe: "3ème A", type: "Félicitation", motif: "Excellents résultats", decision: "Tableau d'honneur", gravite: "—" },
  { date: "25/04/2026", eleve: "Sangaré Mariam", classe: "1ère L", type: "Encouragement", motif: "Progrès remarquables", decision: "Mention au bulletin", gravite: "—" },
];

const variantFor = (g: string) =>
  g === "Grave" ? "destructive" : g === "Léger" ? "secondary" : "default";

export default function StudentsDiscipline() {
  return (
    <SettingsSection
      icon={<Award className="h-5 w-5" />}
      title="Discipline, sanctions & encouragements"
      description="Registre des incidents, félicitations et décisions disciplinaires."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvel enregistrement</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead>Gravité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((i, k) => (
              <TableRow key={k}>
                <TableCell className="text-sm text-muted-foreground">{i.date}</TableCell>
                <TableCell className="font-medium">{i.eleve}</TableCell>
                <TableCell><Badge variant="secondary">{i.classe}</Badge></TableCell>
                <TableCell>{i.type}</TableCell>
                <TableCell className="text-sm">{i.motif}</TableCell>
                <TableCell className="text-sm">{i.decision}</TableCell>
                <TableCell><Badge variant={variantFor(i.gravite) as any}>{i.gravite}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
