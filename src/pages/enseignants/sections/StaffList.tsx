import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Search, Plus, Download, MoreHorizontal } from "lucide-react";

const STAFF = [
  { id: "ENS-001", nom: "Sidibé Amadou", role: "Enseignant", matiere: "Mathématiques", contrat: "CDI", classes: 3, tel: "+223 76 00 11 22", email: "a.sidibe@edu.ml", statut: "Actif" },
  { id: "ENS-002", nom: "Touré Fatoumata", role: "Enseignant", matiere: "Français", contrat: "CDI", classes: 4, tel: "+223 66 33 44 55", email: "f.toure@edu.ml", statut: "Actif" },
  { id: "ENS-003", nom: "Diarra Mamadou", role: "Enseignant", matiere: "Physique-Chimie", contrat: "Vacataire", classes: 2, tel: "+223 70 66 77 88", email: "m.diarra@edu.ml", statut: "Actif" },
  { id: "ENS-004", nom: "Sanogo Aïssata", role: "Enseignant", matiere: "Anglais", contrat: "CDD", classes: 3, tel: "+223 65 99 00 11", email: "a.sanogo@edu.ml", statut: "Congé" },
  { id: "ADM-001", nom: "Konaté Boubacar", role: "Surveillant", matiere: "—", contrat: "CDI", classes: 0, tel: "+223 78 22 33 44", email: "b.konate@edu.ml", statut: "Actif" },
  { id: "ADM-002", nom: "Cissé Kadiatou", role: "Comptable", matiere: "—", contrat: "CDI", classes: 0, tel: "+223 69 55 66 77", email: "k.cisse@edu.ml", statut: "Actif" },
  { id: "ADM-003", nom: "Diakité Salif", role: "Directeur", matiere: "—", contrat: "CDI", classes: 0, tel: "+223 76 11 22 33", email: "s.diakite@edu.ml", statut: "Actif" },
];

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const contratColor: Record<string, string> = {
  CDI: "bg-emerald-600 hover:bg-emerald-600",
  CDD: "bg-amber-500 hover:bg-amber-500",
  Vacataire: "bg-blue-500 hover:bg-blue-500",
};

export default function StaffList() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [contrat, setContrat] = useState("all");

  const filtered = STAFF.filter((s) => {
    const ms = s.nom.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()) || s.matiere.toLowerCase().includes(search.toLowerCase());
    const mr = role === "all" || s.role === role;
    const mc = contrat === "all" || s.contrat === contrat;
    return ms && mr && mc;
  });

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title={`Personnel (${filtered.length})`}
      description="Recherchez et gérez tous les membres de l'établissement."
      hideSave
    >
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, matricule, matière..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="Enseignant">Enseignant</SelectItem>
              <SelectItem value="Surveillant">Surveillant</SelectItem>
              <SelectItem value="Comptable">Comptable</SelectItem>
              <SelectItem value="Directeur">Direction</SelectItem>
            </SelectContent>
          </Select>
          <Select value={contrat} onValueChange={setContrat}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous contrats</SelectItem>
              <SelectItem value="CDI">CDI</SelectItem>
              <SelectItem value="CDD">CDD</SelectItem>
              <SelectItem value="Vacataire">Vacataire</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4" />Nouveau</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle / Matière</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead className="hidden md:table-cell">Classes</TableHead>
              <TableHead className="hidden lg:table-cell">Contact</TableHead>
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
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{initials(s.nom)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{s.nom}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="leading-tight">
                    <p className="text-sm font-medium">{s.role}</p>
                    {s.matiere !== "—" && <p className="text-[11px] text-muted-foreground">{s.matiere}</p>}
                  </div>
                </TableCell>
                <TableCell><Badge className={contratColor[s.contrat] ?? ""}>{s.contrat}</Badge></TableCell>
                <TableCell className="hidden md:table-cell">
                  {s.classes > 0 ? <Badge variant="secondary">{s.classes} classe(s)</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">
                  <p>{s.tel}</p>
                  <p className="text-muted-foreground">{s.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={s.statut === "Actif" ? "default" : "secondary"} className="text-[10px]">{s.statut}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir la fiche</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Voir l'emploi du temps</DropdownMenuItem>
                      <DropdownMenuItem>Bulletin de paie</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Désactiver</DropdownMenuItem>
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
