import { SettingsSection } from "@/components/settings/SettingsSection";
import { Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const acqs = [
  { date: "12/04/2026", fournisseur: "Librairie Clairafrique", titres: 32, montant: 480000, statut: "Reçue" },
  { date: "20/04/2026", fournisseur: "Hachette Sénégal", titres: 18, montant: 215000, statut: "Reçue" },
  { date: "28/04/2026", fournisseur: "Don Ambassade France", titres: 45, montant: 0, statut: "En traitement" },
  { date: "30/04/2026", fournisseur: "Présence Africaine", titres: 12, montant: 156000, statut: "Commandée" },
];

export default function LibraryAcquisitions() {
  return (
    <SettingsSection
      title="Acquisitions"
      description="Achats, dons et nouvelles entrées au catalogue."
      icon={<Archive className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle acquisition</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Fournisseur / Source</TableHead>
            <TableHead className="text-center">Titres</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {acqs.map((a, i) => (
            <TableRow key={i}>
              <TableCell>{a.date}</TableCell>
              <TableCell className="font-medium">{a.fournisseur}</TableCell>
              <TableCell className="text-center">{a.titres}</TableCell>
              <TableCell className="text-right">{a.montant === 0 ? "Don" : `${a.montant.toLocaleString()} FCFA`}</TableCell>
              <TableCell>
                <Badge variant={a.statut === "Reçue" ? "default" : a.statut === "Commandée" ? "secondary" : "outline"}>
                  {a.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
