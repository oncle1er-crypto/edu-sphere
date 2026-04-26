import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Download, Eye } from "lucide-react";

const bulletins = [
  { eleve: "Mballa Junior", classe: "Tle C", moyenne: "15.42", rang: "3 / 38", mention: "Bien", statut: "Validé" },
  { eleve: "Nguemo Sarah", classe: "3ème A", moyenne: "16.85", rang: "1 / 42", mention: "Très bien", statut: "Validé" },
  { eleve: "Tchoumi Paul", classe: "1ère D", moyenne: "11.20", rang: "18 / 35", mention: "Passable", statut: "À valider" },
  { eleve: "Atangana Léa", classe: "6ème B", moyenne: "13.75", rang: "8 / 45", mention: "Assez bien", statut: "Validé" },
  { eleve: "Kamga Yves", classe: "5ème C", moyenne: "9.10", rang: "32 / 40", mention: "Insuffisant", statut: "À valider" },
];

const tone: Record<string, string> = {
  "Validé": "bg-accent/15 text-accent",
  "À valider": "bg-orange-500/15 text-orange-600",
};

export default function Bulletins() {
  return (
    <SettingsSection
      icon={<GraduationCap className='h-5 w-5' />}
      title="Bulletins scolaires"
      description="Génération PDF des bulletins trimestriels et annuels."
      >
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Moyenne</TableHead>
              <TableHead>Rang</TableHead>
              <TableHead>Mention</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulletins.map((b, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{b.eleve}</TableCell>
                <TableCell>{b.classe}</TableCell>
                <TableCell className="font-bold text-primary">{b.moyenne}</TableCell>
                <TableCell>{b.rang}</TableCell>
                <TableCell>{b.mention}</TableCell>
                <TableCell><Badge className={tone[b.statut]} variant="secondary">{b.statut}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
