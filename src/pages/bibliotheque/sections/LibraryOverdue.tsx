import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const overdue = [
  { livre: "Tintin au Congo", lecteur: "Diallo A.", retour: "15/04/2026", retard: 14, penalite: 1400 },
  { livre: "Maths 4ème", lecteur: "Sow B.", retour: "18/04/2026", retard: 11, penalite: 1100 },
  { livre: "Le Vieux Nègre et la médaille", lecteur: "Ndiaye F.", retour: "20/04/2026", retard: 9, penalite: 900 },
  { livre: "Atlas Junior", lecteur: "Diop M.", retour: "22/04/2026", retard: 7, penalite: 700 },
];

export default function LibraryOverdue() {
  return (
    <SettingsSection
      title="Retards & relances"
      description="Emprunts dépassant la date de retour."
      icon={<AlertCircle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Send className="h-4 w-4" /> Envoyer relances</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ouvrage</TableHead>
            <TableHead>Lecteur</TableHead>
            <TableHead>Retour prévu</TableHead>
            <TableHead className="text-center">Retard</TableHead>
            <TableHead className="text-right">Pénalité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overdue.map((o, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{o.livre}</TableCell>
              <TableCell>{o.lecteur}</TableCell>
              <TableCell className="text-muted-foreground">{o.retour}</TableCell>
              <TableCell className="text-center">
                <Badge variant="destructive">{o.retard} j</Badge>
              </TableCell>
              <TableCell className="text-right font-medium">{o.penalite} FCFA</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
