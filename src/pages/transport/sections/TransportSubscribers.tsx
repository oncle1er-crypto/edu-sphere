import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const subs = [
  { nom: "Diallo Aminata", classe: "3ème A", ligne: "A", arret: "Médina HLM", formule: "Mensuel", statut: "Actif" },
  { nom: "Traoré Moussa", classe: "6ème B", ligne: "C", arret: "Pikine Marché", formule: "Trimestriel", statut: "Actif" },
  { nom: "Koné Fatou", classe: "Tle S1", ligne: "B", arret: "Yoff Plage", formule: "Mensuel", statut: "Expiré" },
  { nom: "Camara Ibrahim", classe: "2nde C", ligne: "D", arret: "Almadies Nord", formule: "Mensuel", statut: "Actif" },
  { nom: "Bamba Aïcha", classe: "4ème A", ligne: "A", arret: "Médina Centre", formule: "Trimestriel", statut: "Actif" },
];

export default function TransportSubscribers() {
  return (
    <SettingsSection
      title="Élèves abonnés"
      description="Inscrits au transport scolaire."
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
            <TableHead>Ligne</TableHead>
            <TableHead>Arrêt</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((s, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{s.nom}</TableCell>
              <TableCell><Badge variant="secondary">{s.classe}</Badge></TableCell>
              <TableCell>{s.ligne}</TableCell>
              <TableCell className="text-muted-foreground">{s.arret}</TableCell>
              <TableCell>{s.formule}</TableCell>
              <TableCell><Badge variant={s.statut === "Actif" ? "default" : "destructive"}>{s.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
