import { Users, UserPlus, MoreVertical, Shield, ShieldOff, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsersRoles } from "@/hooks/useUsersRoles";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLES = ["admin", "directeur", "enseignant", "comptable", "surveillant", "parent"] as const;

const roleColors: Record<string, string> = {
  admin: "bg-accent/15 text-accent border-accent/30",
  directeur: "bg-primary/15 text-primary border-primary/30",
  enseignant: "bg-primary/10 text-primary border-primary/20",
  comptable: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  surveillant: "bg-muted text-foreground",
  parent: "bg-orange-500/15 text-orange-600 border-orange-500/30",
};

export default function UsersRoles() {
  const { users, loading, addUserRole, removeUserRole, ecoleId, fetchUsers } = useUsersRoles();
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>("enseignant");
  const [newPassword, setNewPassword] = useState("GSP2025!");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!newEmail || !newName || !ecoleId) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setCreating(true);

    // Create user via Supabase auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { full_name: newName } },
    });

    if (authErr || !authData.user) {
      toast.error(authErr?.message || "Erreur création utilisateur");
      setCreating(false);
      return;
    }

    const userId = authData.user.id;

    // Update profile ecole_id
    await supabase.from("profiles").update({ ecole_id: ecoleId, full_name: newName }).eq("id", userId);

    // Add role
    await addUserRole(userId, newRole);

    setNewEmail("");
    setNewName("");
    setNewRole("enseignant");
    setNewPassword("GSP2025!");
    setCreating(false);
    setDialogOpen(false);
    toast.success(`Utilisateur ${newName} créé avec le rôle ${newRole}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SettingsSection
      title="Utilisateurs & rôles"
      description="Gestion des comptes ayant accès à la plateforme."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input
          placeholder="Rechercher un utilisateur…"
          className="md:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              Créer un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jean@laprovidence.ci" />
              </div>
              <div>
                <Label>Mot de passe initial</Label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle(s)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{u.full_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.role.split(", ").map((r) => (
                        <Badge key={r} variant="outline" className={roleColors[r] || ""}>{r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ROLES.filter((r) => !u.role.includes(r)).map((r) => (
                          <DropdownMenuItem key={r} onClick={() => addUserRole(u.user_id, r)}>
                            <Shield className="h-4 w-4" />Ajouter rôle: {r}
                          </DropdownMenuItem>
                        ))}
                        {u.role.split(", ").map((r) => (
                          <DropdownMenuItem key={r} className="text-destructive" onClick={() => removeUserRole(u.user_id, r.trim())}>
                            <ShieldOff className="h-4 w-4" />Retirer: {r}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 border p-4 text-sm">
        <p className="font-semibold text-primary mb-2">Rôles disponibles</p>
        <ul className="space-y-1 text-muted-foreground text-xs">
          <li><strong className="text-foreground">Admin</strong> — accès complet à toute la plateforme</li>
          <li><strong className="text-foreground">Directeur</strong> — gestion académique, classes, élèves</li>
          <li><strong className="text-foreground">Enseignant</strong> — saisie des notes, présences, ses classes</li>
          <li><strong className="text-foreground">Comptable</strong> — finances, paiements, factures</li>
          <li><strong className="text-foreground">Surveillant</strong> — pointage, discipline</li>
          <li><strong className="text-foreground">Parent</strong> — consultation du dossier de son enfant</li>
        </ul>
      </div>
    </SettingsSection>
  );
}
