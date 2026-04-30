import { SettingsSection } from "@/components/settings/SettingsSection";
import { ChefHat } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const team = [
  { nom: "Mariama Sy", poste: "Chef cuisinier", contrat: "CDI", anciennete: "8 ans", statut: "Actif" },
  { nom: "Ousmane Diatta", poste: "Aide cuisinier", contrat: "CDI", anciennete: "3 ans", statut: "Actif" },
  { nom: "Awa Diop", poste: "Plongeuse", contrat: "CDD", anciennete: "1 an", statut: "Actif" },
  { nom: "Pape Ndiaye", poste: "Magasinier", contrat: "CDI", anciennete: "5 ans", statut: "Congé" },
];

export default function CanteenTeam() {
  return (
    <SettingsSection
      title="Équipe cuisine"
      description="Personnel affecté à la restauration."
      icon={<ChefHat className="h-5 w-5" />}
      hideSave
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Poste</TableHead>
            <TableHead>Contrat</TableHead>
            <TableHead>Ancienneté</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{t.nom}</TableCell>
              <TableCell>{t.poste}</TableCell>
              <TableCell>{t.contrat}</TableCell>
              <TableCell>{t.anciennete}</TableCell>
              <TableCell><Badge variant={t.statut === "Actif" ? "default" : "secondary"}>{t.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
