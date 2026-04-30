import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Plus } from "lucide-react";

const transferts = [
  { date: "28/04/2026", eleve: "Diallo Aminata", de: "3ème A", vers: "3ème B", motif: "Demande des parents", statut: "Validé" },
  { date: "25/04/2026", eleve: "Camara Ibrahim", de: "2nde C", vers: "2nde A", motif: "Réorientation pédagogique", statut: "Validé" },
  { date: "20/04/2026", eleve: "Bamba Aïcha", de: "CM2", vers: "—", motif: "Passage en 6ème (anticipé)", statut: "En attente" },
  { date: "15/04/2026", eleve: "Sangaré Ibrahim", de: "1ère L", vers: "1ère ES", motif: "Changement de filière", statut: "Refusé" },
];

const variantFor = (s: string) => s === "Validé" ? "default" : s === "Refusé" ? "destructive" : "secondary";

export default function ClassesTransfers() {
  return (
    <SettingsSection
      icon={<ArrowRightLeft className="h-5 w-5" />}
      title="Transferts & passages"
      description="Mouvements d'élèves entre classes et changements de filière."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm"><Plus className="h-4 w-4" />Nouveau transfert</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferts.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-muted-foreground">{t.date}</TableCell>
                <TableCell className="font-medium">{t.eleve}</TableCell>
                <TableCell><Badge variant="secondary">{t.de}</Badge></TableCell>
                <TableCell>{t.vers !== "—" ? <Badge>{t.vers}</Badge> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                <TableCell className="text-sm">{t.motif}</TableCell>
                <TableCell><Badge variant={variantFor(t.statut) as any}>{t.statut}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
