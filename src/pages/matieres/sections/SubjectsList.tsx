import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Library, Search, Plus, Download, MoreHorizontal } from "lucide-react";
import { SUBJECTS } from "../data";

export default function SubjectsList() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = SUBJECTS.filter((s) => {
    const ms = s.nom.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const mc = cat === "all" || s.categorie === cat;
    return ms && mc;
  });

  return (
    <SettingsSection
      icon={<Library className="h-5 w-5" />}
      title={`Toutes les matières (${filtered.length})`}
      description="Catalogue complet des disciplines enseignées."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom ou code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="Fondamentale">Fondamentale</SelectItem>
              <SelectItem value="Scientifique">Scientifique</SelectItem>
              <SelectItem value="Littéraire">Littéraire</SelectItem>
              <SelectItem value="Religieuse">Religieuse</SelectItem>
              <SelectItem value="Artistique">Artistique</SelectItem>
              <SelectItem value="Sportive">Sportive</SelectItem>
              <SelectItem value="Optionnelle">Optionnelle</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4" />Nouvelle matière</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Matière</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Cycles</TableHead>
              <TableHead>Coef.</TableHead>
              <TableHead className="hidden md:table-cell">Note sur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{s.code}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.couleur}`} />
                    {s.nom}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{s.categorie}</Badge></TableCell>
                <TableCell className="text-xs">{s.cycles.join(", ")}</TableCell>
                <TableCell><Badge variant="secondary">×{s.coef}</Badge></TableCell>
                <TableCell className="hidden md:table-cell">/ {s.noteSur}</TableCell>
                <TableCell>
                  <Badge variant={s.active ? "default" : "outline"}>
                    {s.active ? "Active" : "Archivée"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Affecter à des classes</DropdownMenuItem>
                      <DropdownMenuItem>Affecter des enseignants</DropdownMenuItem>
                      <DropdownMenuItem>Voir le programme</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archiver</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
