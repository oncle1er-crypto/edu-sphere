import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_EMPRUNT } from "@/components/help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Repeat, Loader2 } from "lucide-react";
import { useEmprunts } from "@/hooks/useEmprunts";

export default function LibraryLoans() {
  const { emprunts, loading, returnEmprunt } = useEmprunts();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      title={`Emprunts (${emprunts.length})`}
      description="Suivi de tous les emprunts en cours et passés."
      icon={<Repeat className="h-5 w-5" />}
      hideSave
    >
      <HelpBanner storageKey="biblio-emprunts" title="Gérer les emprunts">
        Suivez les livres prêtés et leur date de retour. Un emprunt passe en <strong>retard</strong> dès que la date d'échéance est dépassée — pensez à relancer l'élève.
      </HelpBanner>
      <StatusLegend items={STATUTS_EMPRUNT} />
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Livre</TableHead>
              <TableHead>Emprunteur</TableHead>
              <TableHead>Date emprunt</TableHead>
              <TableHead>Retour prévu</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {emprunts.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.livre_titre}</TableCell>
                <TableCell>{e.eleve_nom || e.enseignant_nom || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(e.date_emprunt).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-sm">{new Date(e.date_retour_prevue).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  <Badge variant={e.statut === "en_cours" ? "secondary" : e.statut === "rendu" ? "default" : "destructive"}>
                    {e.statut === "en_cours" ? "En cours" : e.statut === "rendu" ? "Rendu" : e.statut}
                  </Badge>
                </TableCell>
                <TableCell>
                  {e.statut === "en_cours" && (
                    <Button size="sm" variant="outline" onClick={() => returnEmprunt(e.id)}>Retourner</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {emprunts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun emprunt enregistré.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
