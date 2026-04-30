import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Plus } from "lucide-react";

const formations = [
  { membre: "Sidibé Amadou", titre: "Pédagogie numérique", organisme: "CIEP", date: "12/03/2026", duree: "3 jours", statut: "Validée" },
  { membre: "Touré Fatoumata", titre: "Approche par compétences", organisme: "AEFE", date: "20/02/2026", duree: "2 jours", statut: "Validée" },
  { membre: "Diarra Mamadou", titre: "Sécurité en laboratoire", organisme: "INRS", date: "05/05/2026", duree: "1 jour", statut: "Planifiée" },
  { membre: "Sanogo Aïssata", titre: "Cambridge TKT", organisme: "British Council", date: "18/06/2026", duree: "5 jours", statut: "Planifiée" },
  { membre: "Cissé Kadiatou", titre: "Excel avancé", organisme: "Centre Formations", date: "10/01/2026", duree: "2 jours", statut: "Validée" },
];

export default function StaffTraining() {
  return (
    <SettingsSection
      icon={<GraduationCap className="h-5 w-5" />}
      title="Formations & certifications"
      description="Plan de formation continue et certifications obtenues."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Inscrire à une formation</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Organisme</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formations.map((f, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{f.membre}</TableCell>
                <TableCell>{f.titre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.organisme}</TableCell>
                <TableCell className="text-sm">{f.date}</TableCell>
                <TableCell><Badge variant="secondary">{f.duree}</Badge></TableCell>
                <TableCell>
                  <Badge variant={f.statut === "Validée" ? "default" : "secondary"}>{f.statut}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
