import { SettingsSection } from "@/components/settings/SettingsSection";
import { Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const history = [
  { date: "29/04 14:22", canal: "SMS", sujet: "Absence Diallo A.", dest: 1, statut: "Délivré" },
  { date: "29/04 09:00", canal: "Email", sujet: "Rappel paiement scolarité", dest: 412, statut: "Délivré" },
  { date: "28/04 16:45", canal: "Push", sujet: "Bulletin T2 disponible", dest: 285, statut: "Délivré" },
  { date: "28/04 11:30", canal: "Email", sujet: "Convocation conseil de classe", dest: 32, statut: "Partiel" },
  { date: "27/04 08:15", canal: "SMS", sujet: "Retard cours 6A", dest: 28, statut: "Échec" },
];

export default function SendHistory() {
  return (
    <SettingsSection
      title="Historique d'envois"
      description="Tous les messages partis depuis la plateforme."
      icon={<Send className="h-5 w-5" />}
      hideSave
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Sujet</TableHead>
            <TableHead className="text-center">Destinataires</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((h, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{h.date}</TableCell>
              <TableCell><Badge variant="secondary">{h.canal}</Badge></TableCell>
              <TableCell className="font-medium">{h.sujet}</TableCell>
              <TableCell className="text-center">{h.dest}</TableCell>
              <TableCell>
                <Badge variant={h.statut === "Délivré" ? "default" : h.statut === "Partiel" ? "secondary" : "destructive"}>
                  {h.statut}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
