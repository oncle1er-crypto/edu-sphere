import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookOpen, Search, Plus, Download, MoreHorizontal } from "lucide-react";

const CLASSES = [
  { id: "CL-001", nom: "PS A", cycle: "Maternelle", niveau: "Petite Section", effectif: 22, capacite: 25, prof: "Mme Diarra", salle: "M01" },
  { id: "CL-005", nom: "GS A", cycle: "Maternelle", niveau: "Grande Section", effectif: 26, capacite: 30, prof: "Mme Touré", salle: "M05" },
  { id: "CL-010", nom: "CP A", cycle: "Primaire", niveau: "CP", effectif: 35, capacite: 35, prof: "M. Konaté", salle: "P01" },
  { id: "CL-015", nom: "CM2", cycle: "Primaire", niveau: "CM2", effectif: 32, capacite: 35, prof: "Mme Konaté", salle: "P15" },
  { id: "CL-020", nom: "6ème A", cycle: "Collège", niveau: "6ème", effectif: 38, capacite: 40, prof: "M. Coulibaly", salle: "C12" },
  { id: "CL-021", nom: "6ème B", cycle: "Collège", niveau: "6ème", effectif: 35, capacite: 40, prof: "Mme Diarra", salle: "C13" },
  { id: "CL-025", nom: "3ème A", cycle: "Collège", niveau: "3ème", effectif: 36, capacite: 40, prof: "M. Sidibé", salle: "C25" },
  { id: "CL-030", nom: "2nde C", cycle: "Lycée", niveau: "2nde", effectif: 28, capacite: 35, prof: "M. Bah", salle: "L08" },
  { id: "CL-035", nom: "1ère L", cycle: "Lycée", niveau: "1ère", effectif: 24, capacite: 30, prof: "Mme Sangaré", salle: "L15" },
  { id: "CL-040", nom: "Tle S1", cycle: "Lycée", niveau: "Terminale", effectif: 28, capacite: 30, prof: "M. Sangaré", salle: "L20" },
];

export default function ClassesList() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");

  const filtered = CLASSES.filter((c) => {
    const ms = c.nom.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()) || c.prof.toLowerCase().includes(search.toLowerCase());
    const mc = cycle === "all" || c.cycle === cycle;
    return ms && mc;
  });

  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title={`Toutes les classes (${filtered.length})`}
      description="Liste complète des classes de l'établissement."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, code, prof. principal..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cycle} onValueChange={setCycle}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cycles</SelectItem>
              <SelectItem value="Maternelle">Maternelle</SelectItem>
              <SelectItem value="Primaire">Primaire</SelectItem>
              <SelectItem value="Collège">Collège</SelectItem>
              <SelectItem value="Lycée">Lycée</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4" />Nouvelle classe</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Cycle / Niveau</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead className="hidden md:table-cell">Prof. principal</TableHead>
              <TableHead className="hidden lg:table-cell">Salle</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const full = c.effectif >= c.capacite;
              return (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell>
                    <div className="leading-tight">
                      <p className="text-sm">{c.cycle}</p>
                      <p className="text-[11px] text-muted-foreground">{c.niveau}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={full ? "destructive" : "secondary"}>
                      {c.effectif} / {c.capacite}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.prof}</TableCell>
                  <TableCell className="hidden lg:table-cell"><Badge variant="outline">{c.salle}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir les élèves</DropdownMenuItem>
                        <DropdownMenuItem>Emploi du temps</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Imprimer la liste</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Archiver</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
