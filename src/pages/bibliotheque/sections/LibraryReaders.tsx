import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const readers = [
  { carte: "BIB-0142", nom: "Diallo Aminata", classe: "3ème A", emprunts: 18, en_cours: 1, statut: "Actif" },
  { carte: "BIB-0143", nom: "Traoré Moussa", classe: "6ème B", emprunts: 12, en_cours: 1, statut: "Actif" },
  { carte: "BIB-0144", nom: "Koné Fatou", classe: "Tle S1", emprunts: 25, en_cours: 1, statut: "Actif" },
  { carte: "BIB-0145", nom: "Camara Ibrahim", classe: "2nde C", emprunts: 8, en_cours: 1, statut: "Suspendu" },
  { carte: "BIB-0146", nom: "Bamba Aïcha", classe: "4ème A", emprunts: 15, en_cours: 0, statut: "Actif" },
];

export default function LibraryReaders() {
  return (
    <SettingsSection
      title="Lecteurs"
      description="Cartes de bibliothèque et historique de lecture."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, carte..." className="pl-9" />
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle carte</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Carte</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead className="text-center">Emprunts totaux</TableHead>
            <TableHead className="text-center">En cours</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {readers.map((r) => (
            <TableRow key={r.carte}>
              <TableCell className="font-mono text-xs">{r.carte}</TableCell>
              <TableCell className="font-medium">{r.nom}</TableCell>
              <TableCell><Badge variant="secondary">{r.classe}</Badge></TableCell>
              <TableCell className="text-center">{r.emprunts}</TableCell>
              <TableCell className="text-center">{r.en_cours}</TableCell>
              <TableCell><Badge variant={r.statut === "Actif" ? "default" : "destructive"}>{r.statut}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
