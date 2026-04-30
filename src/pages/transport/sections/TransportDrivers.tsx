import { SettingsSection } from "@/components/settings/SettingsSection";
import { UserCog, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const drivers = [
  { nom: "Keita Bakary", permis: "D — valide", expiration: "03/2028", ligne: "A", anciennete: "6 ans", statut: "Actif" },
  { nom: "Sissoko Drissa", permis: "D — valide", expiration: "11/2027", ligne: "B", anciennete: "9 ans", statut: "Actif" },
  { nom: "Dembélé Moussa", permis: "D — valide", expiration: "07/2026", ligne: "C", anciennete: "4 ans", statut: "Actif" },
  { nom: "Diakité Amadou", permis: "D — valide", expiration: "12/2026", ligne: "D", anciennete: "7 ans", statut: "Congé" },
  { nom: "Ndour Cheikh", permis: "D — valide", expiration: "02/2028", ligne: "E", anciennete: "2 ans", statut: "Actif" },
];

export default function TransportDrivers() {
  return (
    <SettingsSection
      title="Chauffeurs"
      description="Personnel de conduite et validité des permis."
      icon={<UserCog className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter un chauffeur</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Permis</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="text-center">Ligne</TableHead>
            <TableHead>Ancienneté</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{d.nom}</TableCell>
              <TableCell>{d.permis}</TableCell>
              <TableCell className="text-muted-foreground">{d.expiration}</TableCell>
              <TableCell className="text-center">{d.ligne}</TableCell>
              <TableCell>{d.anciennete}</TableCell>
              <TableCell><Badge variant={d.statut === "Actif" ? "default" : "secondary"}>{d.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
