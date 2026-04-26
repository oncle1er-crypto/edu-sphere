import { ScrollText, Search, Download, Filter } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const logs = [
  { date: "24/04/2026 10:42", user: "Charles Ello", action: "Création élève", target: "Marie Tchoumi (CE2-A)", level: "info" },
  { date: "24/04/2026 09:18", user: "Marie Ngono", action: "Saisie notes", target: "Mathématiques 6ème B", level: "info" },
  { date: "24/04/2026 08:55", user: "Jean Mballa", action: "Paiement enregistré", target: "Facture FAC-2025-0142 (75 000 FCFA)", level: "success" },
  { date: "23/04/2026 16:32", user: "Charles Ello", action: "Modification rôle", target: "Aïcha Bello → Enseignant", level: "warning" },
  { date: "23/04/2026 14:10", user: "Système", action: "Sauvegarde automatique", target: "12.3 Mo", level: "info" },
  { date: "23/04/2026 11:24", user: "Paul Tchamba", action: "Tentative connexion échouée", target: "Mauvais mot de passe (3x)", level: "danger" },
  { date: "22/04/2026 17:48", user: "Charles Ello", action: "Suppression utilisateur", target: "compte démo désactivé", level: "danger" },
];

const levelStyles: Record<string, string> = {
  info: "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ActivityLogs() {
  return (
    <SettingsSection
      title="Journal d'activité"
      description="Historique complet des actions effectuées sur la plateforme."
      icon={<ScrollText className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher dans les logs…" className="pl-9" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="md:w-48"><Filter className="h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            <SelectItem value="admin">Admins uniquement</SelectItem>
            <SelectItem value="system">Système</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline"><Download className="h-4 w-4" />Exporter</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead>Niveau</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.date}</TableCell>
                <TableCell className="text-sm font-medium">{l.user}</TableCell>
                <TableCell className="text-sm">{l.action}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.target}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={levelStyles[l.level]}>
                    {l.level === "info" && "Info"}
                    {l.level === "success" && "Succès"}
                    {l.level === "warning" && "Attention"}
                    {l.level === "danger" && "Critique"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
