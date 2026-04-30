import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const abonnes = [
  { nom: "Diallo Aminata", classe: "3ème A", type: "Mensuel", statut: "Actif", fin: "31/03/2026" },
  { nom: "Traoré Moussa", classe: "6ème B", type: "Trimestriel", statut: "Actif", fin: "30/06/2026" },
  { nom: "Koné Fatou", classe: "Tle S1", type: "Mensuel", statut: "Expiré", fin: "28/02/2026" },
  { nom: "Camara Ibrahim", classe: "2nde C", type: "Journalier", statut: "Actif", fin: "08/03/2026" },
  { nom: "Bamba Aïcha", classe: "4ème A", type: "Mensuel", statut: "Actif", fin: "31/03/2026" },
  { nom: "Coulibaly Seydou", classe: "5ème C", type: "Trimestriel", statut: "Actif", fin: "30/06/2026" },
];

export default function CanteenSubscribers() {
  return (
    <SettingsSection
      title="Abonnés cantine"
      description="Élèves inscrits aux différentes formules."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un abonné..." className="pl-9" />
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvel abonnement</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {abonnes.map((a, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{a.nom}</TableCell>
              <TableCell><Badge variant="secondary">{a.classe}</Badge></TableCell>
              <TableCell>{a.type}</TableCell>
              <TableCell className="text-muted-foreground">{a.fin}</TableCell>
              <TableCell><Badge variant={a.statut === "Actif" ? "default" : "destructive"}>{a.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
