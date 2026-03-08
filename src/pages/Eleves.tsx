import { useState } from "react";
import { Plus, Search, Filter, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const students = [
  { id: 1, nom: "Diallo", prenom: "Aminata", classe: "3ème A", dateNaissance: "12/05/2011", contact: "+223 76 12 34 56", statut: "Actif" },
  { id: 2, nom: "Traoré", prenom: "Moussa", classe: "6ème B", dateNaissance: "03/09/2014", contact: "+223 66 78 90 12", statut: "Actif" },
  { id: 3, nom: "Koné", prenom: "Fatou", classe: "Tle S1", dateNaissance: "22/01/2008", contact: "+223 70 45 67 89", statut: "Actif" },
  { id: 4, nom: "Camara", prenom: "Ibrahim", classe: "2nde C", dateNaissance: "15/07/2009", contact: "+223 65 23 45 67", statut: "Suspendu" },
  { id: 5, nom: "Bamba", prenom: "Aïcha", classe: "4ème A", dateNaissance: "28/11/2010", contact: "+223 78 56 78 90", statut: "Actif" },
  { id: 6, nom: "Coulibaly", prenom: "Seydou", classe: "5ème C", dateNaissance: "07/03/2012", contact: "+223 69 12 34 56", statut: "Actif" },
  { id: 7, nom: "Sangaré", prenom: "Mariam", classe: "1ère L", dateNaissance: "19/08/2009", contact: "+223 74 90 12 34", statut: "Actif" },
  { id: 8, nom: "Keita", prenom: "Oumar", classe: "6ème A", dateNaissance: "30/04/2014", contact: "+223 67 34 56 78", statut: "Actif" },
];

export default function Eleves() {
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (s) =>
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      s.prenom.toLowerCase().includes(search.toLowerCase()) ||
      s.classe.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Élèves</h1>
          <p className="text-sm text-muted-foreground">Gérer les inscriptions et fiches élèves</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel Élève
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-base font-display">Liste des élèves ({filtered.length})</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-9 h-9 w-56 bg-muted border-0"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filtrer
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom & Prénom</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="hidden md:table-cell">Date de Naissance</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact Parent</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{s.nom} {s.prenom}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{s.classe}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.dateNaissance}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{s.contact}</TableCell>
                    <TableCell>
                      <Badge variant={s.statut === "Actif" ? "default" : "destructive"} className="text-xs">
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
                          <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
