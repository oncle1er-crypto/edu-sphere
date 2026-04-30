import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const templates = [
  { nom: "Absence non justifiée", canal: "SMS", langue: "FR", utilisations: 124 },
  { nom: "Rappel paiement scolarité", canal: "Email", langue: "FR", utilisations: 86 },
  { nom: "Bulletin disponible", canal: "Push", langue: "FR", utilisations: 412 },
  { nom: "Convocation conseil de classe", canal: "Email", langue: "FR", utilisations: 32 },
  { nom: "Confirmation inscription", canal: "Email", langue: "FR", utilisations: 215 },
  { nom: "Retard récurrent", canal: "SMS", langue: "FR", utilisations: 48 },
];

export default function MessageTemplates() {
  return (
    <SettingsSection
      title="Modèles de message"
      description="Trames réutilisables avec variables ({{nom}}, {{classe}}, ...)."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouveau modèle</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Langue</TableHead>
            <TableHead className="text-center">Utilisations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{t.nom}</TableCell>
              <TableCell><Badge variant="secondary">{t.canal}</Badge></TableCell>
              <TableCell>{t.langue}</TableCell>
              <TableCell className="text-center">{t.utilisations}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
