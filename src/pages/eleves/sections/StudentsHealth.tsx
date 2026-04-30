import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, Plus } from "lucide-react";

const visites = [
  { date: "28/04/2026", eleve: "Diallo Aminata", classe: "3ème A", motif: "Maux de tête", traitement: "Paracétamol", suivi: "Retour en classe" },
  { date: "27/04/2026", eleve: "Bamba Aïcha", classe: "CM2", motif: "Chute en cour", traitement: "Pansement", suivi: "Parents informés" },
  { date: "26/04/2026", eleve: "Keita Oumar", classe: "GS", motif: "Fièvre 38,5°C", traitement: "Repos", suivi: "Renvoyé à la maison" },
  { date: "25/04/2026", eleve: "Coulibaly Seydou", classe: "CE1", motif: "Crise d'asthme", traitement: "Ventoline", suivi: "Surveillance accrue" },
];

export default function StudentsHealth() {
  return (
    <SettingsSection
      icon={<Heart className="h-5 w-5" />}
      title="Infirmerie & registre des visites"
      description="Suivi médical, allergies et passages à l'infirmerie."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouvelle visite</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Traitement</TableHead>
              <TableHead>Suivi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visites.map((v, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-muted-foreground">{v.date}</TableCell>
                <TableCell className="font-medium">{v.eleve}</TableCell>
                <TableCell><Badge variant="secondary">{v.classe}</Badge></TableCell>
                <TableCell>{v.motif}</TableCell>
                <TableCell className="text-sm">{v.traitement}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.suivi}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
