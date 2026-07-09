import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertCircle, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEmprunts } from "@/hooks/useEmprunts";
import { useMemo } from "react";

const PENALITE_PAR_JOUR = 100; // FCFA / jour de retard

export default function LibraryOverdue() {
  const { emprunts, loading, returnEmprunt } = useEmprunts();

  const overdue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return emprunts
      .filter((e) => e.statut !== "rendu" && new Date(e.date_retour_prevue) < today)
      .map((e) => {
        const retard = Math.floor((today.getTime() - new Date(e.date_retour_prevue).getTime()) / 86400000);
        return {
          id: e.id,
          livre: e.livre_titre || "—",
          lecteur: e.eleve_nom || e.enseignant_nom || "—",
          retour: new Date(e.date_retour_prevue).toLocaleDateString("fr-FR"),
          retard,
          penalite: retard * PENALITE_PAR_JOUR,
        };
      })
      .sort((a, b) => b.retard - a.retard);
  }, [emprunts]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      title={`Retards & relances (${overdue.length})`}
      description="Emprunts dépassant la date de retour."
      icon={<AlertCircle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" disabled={overdue.length === 0}>
          <Send className="h-4 w-4" /> Envoyer relances
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ouvrage</TableHead>
            <TableHead>Lecteur</TableHead>
            <TableHead>Retour prévu</TableHead>
            <TableHead className="text-center">Retard</TableHead>
            <TableHead className="text-right">Pénalité</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {overdue.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.livre}</TableCell>
              <TableCell>{o.lecteur}</TableCell>
              <TableCell className="text-muted-foreground">{o.retour}</TableCell>
              <TableCell className="text-center"><Badge variant="destructive">{o.retard} j</Badge></TableCell>
              <TableCell className="text-right font-medium">{o.penalite.toLocaleString("fr-FR")} FCFA</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => returnEmprunt(o.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Retour
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {overdue.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                Aucun retard 🎉
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
