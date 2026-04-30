import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Search, Plus, Download, MoreHorizontal, Filter } from "lucide-react";

const STUDENTS = [
  { id: "ELV-001", nom: "Diallo", prenom: "Aminata", sexe: "F", classe: "3ème A", cycle: "Collège", dateNaissance: "12/05/2011", parent: "Mamadou Diallo", contact: "+223 76 12 34 56", statut: "Actif" },
  { id: "ELV-002", nom: "Traoré", prenom: "Moussa", sexe: "M", classe: "6ème B", cycle: "Collège", dateNaissance: "03/09/2014", parent: "Awa Traoré", contact: "+223 66 78 90 12", statut: "Actif" },
  { id: "ELV-003", nom: "Koné", prenom: "Fatou", sexe: "F", classe: "Tle S1", cycle: "Lycée", dateNaissance: "22/01/2008", parent: "Ibrahim Koné", contact: "+223 70 45 67 89", statut: "Actif" },
  { id: "ELV-004", nom: "Camara", prenom: "Ibrahim", sexe: "M", classe: "2nde C", cycle: "Lycée", dateNaissance: "15/07/2009", parent: "Salif Camara", contact: "+223 65 23 45 67", statut: "Suspendu" },
  { id: "ELV-005", nom: "Bamba", prenom: "Aïcha", sexe: "F", classe: "CM2", cycle: "Primaire", dateNaissance: "28/11/2013", parent: "Ousmane Bamba", contact: "+223 78 56 78 90", statut: "Actif" },
  { id: "ELV-006", nom: "Coulibaly", prenom: "Seydou", sexe: "M", classe: "CE1", cycle: "Primaire", dateNaissance: "07/03/2016", parent: "Kadiatou Coulibaly", contact: "+223 69 12 34 56", statut: "Actif" },
  { id: "ELV-007", nom: "Sangaré", prenom: "Mariam", sexe: "F", classe: "1ère L", cycle: "Lycée", dateNaissance: "19/08/2009", parent: "Adama Sangaré", contact: "+223 74 90 12 34", statut: "Actif" },
  { id: "ELV-008", nom: "Keita", prenom: "Oumar", sexe: "M", classe: "GS", cycle: "Maternelle", dateNaissance: "30/04/2019", parent: "Fanta Keita", contact: "+223 67 34 56 78", statut: "Actif" },
];

const initials = (n: string, p: string) => `${p[0] ?? ""}${n[0] ?? ""}`.toUpperCase();

export default function StudentsList() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");
  const [statut, setStatut] = useState("all");

  const filtered = STUDENTS.filter((s) => {
    const matchSearch =
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      s.prenom.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.classe.toLowerCase().includes(search.toLowerCase());
    const matchCycle = cycle === "all" || s.cycle === cycle;
    const matchStatut = statut === "all" || s.statut === statut;
    return matchSearch && matchCycle && matchStatut;
  });

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title={`Liste des élèves (${filtered.length})`}
      description="Recherchez, filtrez et consultez la fiche d'un élève."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nom, prénom, matricule, classe..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="Actif">Actif</SelectItem>
              <SelectItem value="Suspendu">Suspendu</SelectItem>
              <SelectItem value="Sorti">Sorti</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4" />Plus</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4" />Nouvel élève</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead className="hidden md:table-cell">Né(e) le</TableHead>
              <TableHead className="hidden lg:table-cell">Parent / Tuteur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{s.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">
                        {initials(s.nom, s.prenom)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-tight">{s.prenom} {s.nom}</p>
                      <p className="text-[11px] text-muted-foreground">{s.sexe === "F" ? "Fille" : "Garçon"} • {s.cycle}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary">{s.classe}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{s.dateNaissance}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  <div className="leading-tight">
                    <p>{s.parent}</p>
                    <p className="text-[11px] text-muted-foreground">{s.contact}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={s.statut === "Actif" ? "default" : "destructive"} className="text-[10px]">
                    {s.statut}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir la fiche</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Imprimer carnet</DropdownMenuItem>
                      <DropdownMenuItem>Transférer de classe</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Désinscrire</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Aucun élève trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
