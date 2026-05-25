import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, Loader2 } from "lucide-react";
import { useEnseignants } from "@/hooks/useEnseignants";

export default function StaffContracts() {
  const { enseignants, loading } = useEnseignants();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileSignature className="h-5 w-5" />}
      title="Contrats & affectations"
      description="Suivi des contrats actifs."
      hideSave
    >
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Membre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Embauche</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enseignants.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.matricule ?? "—"}</TableCell>
                <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                <TableCell><Badge>{e.type_contrat}</Badge></TableCell>
                <TableCell className="text-sm">{e.date_embauche ? new Date(e.date_embauche).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell className="text-sm">{e.specialite ?? "—"}</TableCell>
                <TableCell><Badge variant={e.statut === "actif" ? "default" : "secondary"}>{e.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {enseignants.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun contrat.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
