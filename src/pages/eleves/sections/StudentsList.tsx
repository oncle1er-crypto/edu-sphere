import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Search, Plus, Download, MoreHorizontal, Filter, Loader2 } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useCycles } from "@/hooks/useCycles";

const initials = (n: string, p: string) => `${(p?.[0] ?? "")}${(n?.[0] ?? "")}`.toUpperCase();

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
};

export default function StudentsList() {
  const { eleves, loading } = useEleves();
  const { cycles } = useCycles();
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("all");
  const [statut, setStatut] = useState("all");

  const filtered = eleves.filter((s) => {
    const matchSearch =
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      s.prenom.toLowerCase().includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase()) ||
      (s.classe_nom ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCycle = cycle === "all" || s.cycle_nom === cycle;
    const matchStatut = statut === "all" || s.statut === statut;
    return matchSearch && matchCycle && matchStatut;
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
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="inscrit">Inscrit</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="suspendu">Suspendu</SelectItem>
              <SelectItem value="sorti">Sorti</SelectItem>
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
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{s.matricule}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">
                        {initials(s.nom, s.prenom)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-tight">{s.prenom} {s.nom}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.sexe === "F" ? "Fille" : s.sexe === "M" ? "Garçon" : "—"} • {s.cycle_nom ?? "—"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary">{s.classe_nom ?? "Non affecté"}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(s.date_naissance)}</TableCell>
                <TableCell>
                  <Badge variant={s.statut === "inscrit" || s.statut === "actif" ? "default" : "destructive"} className="text-[10px]">
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
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
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
