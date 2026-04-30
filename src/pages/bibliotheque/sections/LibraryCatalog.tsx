import { SettingsSection } from "@/components/settings/SettingsSection";
import { BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const livres = [
  { cote: "L-001", titre: "Le Petit Prince", auteur: "A. de Saint-Exupéry", cat: "Roman", expl: 8, dispo: 5 },
  { cote: "L-045", titre: "L'Aventure ambiguë", auteur: "C. Hamidou Kane", cat: "Roman", expl: 6, dispo: 2 },
  { cote: "M-128", titre: "Maths 3ème", auteur: "Collectif", cat: "Manuel", expl: 35, dispo: 18 },
  { cote: "S-072", titre: "Atlas Junior", auteur: "Larousse", cat: "Sciences", expl: 4, dispo: 1 },
  { cote: "L-203", titre: "Une si longue lettre", auteur: "M. Bâ", cat: "Roman", expl: 7, dispo: 4 },
  { cote: "J-019", titre: "Tintin au Congo", auteur: "Hergé", cat: "Jeunesse", expl: 3, dispo: 0 },
];

export default function LibraryCatalog() {
  return (
    <SettingsSection
      title="Catalogue"
      description="Tous les ouvrages référencés."
      icon={<BookOpen className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Titre, auteur, ISBN..." className="pl-9" />
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvel ouvrage</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cote</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Auteur</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead className="text-center">Exemplaires</TableHead>
            <TableHead className="text-center">Disponibles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {livres.map((l) => (
            <TableRow key={l.cote}>
              <TableCell className="font-mono text-xs">{l.cote}</TableCell>
              <TableCell className="font-medium">{l.titre}</TableCell>
              <TableCell className="text-muted-foreground">{l.auteur}</TableCell>
              <TableCell><Badge variant="secondary">{l.cat}</Badge></TableCell>
              <TableCell className="text-center">{l.expl}</TableCell>
              <TableCell className="text-center">
                <Badge variant={l.dispo === 0 ? "destructive" : l.dispo < 3 ? "secondary" : "default"}>
                  {l.dispo}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
