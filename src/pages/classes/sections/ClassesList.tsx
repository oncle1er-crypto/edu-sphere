import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookOpen, Search, Plus, Download, MoreHorizontal, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";

export default function ClassesList() {
  const { classes, loading } = useClasses();
  const { cycles } = useCycles();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");

  const filtered = classes.filter((c) => {
    const ms =
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.prof_nom ?? "").toLowerCase().includes(search.toLowerCase());
    const mc = cycle === "all" || c.cycle_nom === cycle;
    return ms && mc;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <Input placeholder="Nom, prof. principal..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cycle} onValueChange={setCycle}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
              ))}
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
              <TableHead>Classe</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead className="hidden md:table-cell">Prof. principal</TableHead>
              <TableHead className="hidden lg:table-cell">Salle</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const full = (c.effectif ?? 0) >= (c.capacite ?? 999);
              return (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell className="text-sm">{c.cycle_nom}</TableCell>
                  <TableCell>
                    <Badge variant={full ? "destructive" : "secondary"}>
                      {c.effectif ?? 0} / {c.capacite ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.prof_nom || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{c.salle || "—"}</Badge>
                  </TableCell>
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Aucune classe trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
