import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import { useEvaluations } from "@/hooks/useEvaluations";

const tone: Record<string, string> = {
  "devoir": "bg-primary/15 text-primary",
  "composition": "bg-accent/15 text-accent",
  "interrogation": "bg-orange-500/15 text-orange-600",
};

export default function Evaluations() {
  const { evaluations, loading } = useEvaluations();

  return (
    <SettingsSection
      icon={<ClipboardList className='h-5 w-5' />}
      title={`Évaluations & devoirs (${evaluations.length})`}
      description="Gérez tous les devoirs surveillés, interrogations et travaux pratiques."
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Aucune évaluation trouvée.</p>
          <p className="text-xs mt-1">Créez votre première évaluation pour commencer la saisie des notes.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Coef.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes saisies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.titre}</TableCell>
                  <TableCell>{e.classe_nom ?? "—"}</TableCell>
                  <TableCell>{e.matiere_nom ?? "—"}</TableCell>
                  <TableCell>{e.coefficient}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(e.date_eval).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge className={tone[e.type] || "bg-muted"} variant="secondary">
                      {e.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.nb_notes ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsSection>
  );
}
