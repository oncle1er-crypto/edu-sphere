import { Users, UserPlus, MoreVertical, Mail, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const users = [
  { name: "Ello Charles Frédéric", email: "charles@notre-avenir.cm", role: "Admin", status: "Actif", initials: "CE" },
  { name: "Marie Ngono", email: "marie@notre-avenir.cm", role: "Enseignant", status: "Actif", initials: "MN" },
  { name: "Jean Mballa", email: "jean@notre-avenir.cm", role: "Comptable", status: "Actif", initials: "JM" },
  { name: "Aïcha Bello", email: "aicha@notre-avenir.cm", role: "Enseignant", status: "Invité", initials: "AB" },
  { name: "Paul Tchamba", email: "paul@notre-avenir.cm", role: "Surveillant", status: "Suspendu", initials: "PT" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-accent/15 text-accent border-accent/30",
  Enseignant: "bg-primary/10 text-primary border-primary/20",
  Comptable: "bg-info/15 text-info border-info/30",
  Surveillant: "bg-muted text-foreground",
};

export default function UsersRoles() {
  return (
    <SettingsSection
      title="Utilisateurs & rôles"
      description="Gestion des comptes ayant accès à la plateforme."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input placeholder="Rechercher un utilisateur…" className="md:max-w-sm" />
        <Button>
          <UserPlus className="h-4 w-4" />
          Inviter un utilisateur
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.email}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleColors[u.role] || ""}>{u.role}</Badge>
                </TableCell>
                <TableCell>
                  {u.status === "Actif" && <Badge className="bg-success text-success-foreground">Actif</Badge>}
                  {u.status === "Invité" && <Badge variant="secondary">Invité</Badge>}
                  {u.status === "Suspendu" && <Badge variant="destructive">Suspendu</Badge>}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Shield className="h-4 w-4" />Modifier le rôle</DropdownMenuItem>
                      <DropdownMenuItem><Mail className="h-4 w-4" />Renvoyer l'invitation</DropdownMenuItem>
                      <DropdownMenuItem><ShieldCheck className="h-4 w-4" />Réinitialiser mot de passe</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><ShieldOff className="h-4 w-4" />Suspendre</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg bg-muted/50 border p-4 text-sm">
        <p className="font-semibold text-primary mb-2">Rôles disponibles</p>
        <ul className="space-y-1 text-muted-foreground text-xs">
          <li><strong className="text-foreground">Admin</strong> — accès complet</li>
          <li><strong className="text-foreground">Enseignant</strong> — saisie des notes, présences, ses classes</li>
          <li><strong className="text-foreground">Comptable</strong> — finances, paiements, factures</li>
          <li><strong className="text-foreground">Surveillant</strong> — pointage, discipline</li>
          <li><strong className="text-foreground">Parent</strong> — consultation du dossier de son enfant</li>
        </ul>
      </div>
    </SettingsSection>
  );
}
