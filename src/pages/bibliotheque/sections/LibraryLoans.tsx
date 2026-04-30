import { SettingsSection } from "@/components/settings/SettingsSection";
import { Repeat, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const loans = [
  { livre: "Le Petit Prince", cote: "L-001", lecteur: "Diallo Aminata", classe: "3ème A", emprunt: "20/04/2026", retour: "04/05/2026" },
  { livre: "Maths 3ème", cote: "M-128", lecteur: "Traoré Moussa", classe: "6ème B", emprunt: "22/04/2026", retour: "06/05/2026" },
  { livre: "Une si longue lettre", cote: "L-203", lecteur: "Koné Fatou", classe: "Tle S1", emprunt: "25/04/2026", retour: "09/05/2026" },
  { livre: "Atlas Junior", cote: "S-072", lecteur: "Camara Ibrahim", classe: "2nde C", emprunt: "27/04/2026", retour: "11/05/2026" },
];

export default function LibraryLoans() {
  return (
    <SettingsSection
      title="Emprunts en cours"
      description="Ouvrages actuellement sortis."
      icon={<Repeat className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvel emprunt</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ouvrage</TableHead>
            <TableHead>Cote</TableHead>
            <TableHead>Lecteur</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Emprunté le</TableHead>
            <TableHead>Retour prévu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((l, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{l.livre}</TableCell>
              <TableCell className="font-mono text-xs">{l.cote}</TableCell>
              <TableCell>{l.lecteur}</TableCell>
              <TableCell><Badge variant="secondary">{l.classe}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{l.emprunt}</TableCell>
              <TableCell className="text-muted-foreground">{l.retour}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
