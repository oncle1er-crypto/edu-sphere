import { Users, UserPlus, Shield, ShieldOff, Loader2, Check, BookOpen, Calculator, Eye, ClipboardList, Bus, UtensilsCrossed, CreditCard, UserCog, KeyRound, SlidersHorizontal, Sun, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { PermissionsMatrixDialog } from "@/components/security/PermissionsMatrixDialog";
import { RolePermissionsDialog } from "@/components/security/RolePermissionsDialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner } from "@/components/help";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUsersRoles } from "@/hooks/useUsersRoles";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { CredentialsPreviewDialog } from "./CredentialsPreviewDialog";
import { messageErreurBase } from "@/lib/dbErrorMessages";



const ROLES = ["admin", "directeur", "enseignant", "educateur", "comptable", "secretaire", "surveillant", "parent"] as const;

const roleColors: Record<string, string> = {
  admin: "bg-accent/15 text-primary border-accent/30",
  directeur: "bg-primary/15 text-primary border-primary/30",
  enseignant: "bg-primary/10 text-primary border-primary/20",
  educateur: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  comptable: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  secretaire: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  surveillant: "bg-muted text-foreground",
  parent: "bg-orange-500/15 text-orange-600 border-orange-500/30",
};

const MODULES = [
  { key: "eleves", label: "Élèves", icon: Users },
  { key: "classes", label: "Classes", icon: BookOpen },
  { key: "examens", label: "Examens", icon: ClipboardList },
  { key: "finances", label: "Finances", icon: CreditCard },
  { key: "presences", label: "Présences", icon: Eye },
  { key: "vie_scolaire", label: "Vie scolaire", icon: Shield },
  { key: "transport", label: "Transport", icon: Bus },
  { key: "cantine", label: "Cantine", icon: UtensilsCrossed },
  { key: "cours_vacances", label: "Cours de vacances", icon: Sun },
  { key: "parametres", label: "Paramètres", icon: UserCog },
] as const;

const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  admin: MODULES.map(m => m.key),
  directeur: ["eleves", "classes", "examens", "presences", "vie_scolaire", "cours_vacances", "parametres"],
  enseignant: ["examens", "presences", "classes"],
  educateur: ["vie_scolaire", "presences", "eleves"],
  comptable: ["finances", "eleves", "cours_vacances"],
  secretaire: ["eleves", "classes", "vie_scolaire"],
  surveillant: ["presences", "eleves"],
  parent: ["eleves", "examens"],
};

export default function UsersRoles() {
  const { users, loading, addUserRole, removeUserRole, createUser, updateUser, deleteUser, resetPassword, ecoleId, fetchUsers } = useUsersRoles();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>(["enseignant"]);
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [resetMfaUser, setResetMfaUser] = useState<{ id: string; name: string } | null>(null);
  const [resetMotif, setResetMotif] = useState("");
  const [resettingMfa, setResettingMfa] = useState(false);
  const [permsUser, setPermsUser] = useState<{ id: string; name: string } | null>(null);
  const [editUser, setEditUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pwdUser, setPwdUser] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);
  const [credsPreview, setCredsPreview] = useState<{ fullName: string; identifier: string; password: string; channel: "email" | "phone" } | null>(null);
  const [rolePermsOpen, setRolePermsOpen] = useState(false);


  const handleResetMfa = async () => {
    if (!resetMfaUser || !ecoleId) return;
    if (resetMotif.trim().length < 5) {
      toast.error("Motif obligatoire (5 caractères min.)");
      return;
    }
    setResettingMfa(true);
    try {
      const { error } = await supabase.rpc("admin_reset_user_mfa", {
        _target_user_id: resetMfaUser.id,
        _ecole_id: ecoleId,
        _motif: resetMotif.trim(),
      });
      if (error) throw error;
      toast.success(`MFA réinitialisé pour ${resetMfaUser.name}`);
      setResetMfaUser(null);
      setResetMotif("");
    } catch (e) {
      toast.error(messageErreurBase(e) ?? "Échec de la réinitialisation");
    } finally {
      setResettingMfa(false);
    }
  };


  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const toggleNewRole = (role: string) => {
    setNewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreateUser = async () => {
    if (!newName || !ecoleId || newRoles.length === 0) {
      toast.error("Nom et au moins un rôle requis");
      return;
    }
    if (!newEmail && !newPhone) {
      toast.error("Renseignez un email OU un numéro à 10 chiffres");
      return;
    }
    if (newPhone && !/^\d{10}$/.test(newPhone.trim())) {
      toast.error("Le numéro de téléphone doit contenir exactement 10 chiffres");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères");
      return;
    }
    setCreating(true);
    const res = await createUser({
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      password: newPassword || undefined,
      full_name: newName.trim(),
      roles: newRoles,
    });
    setCreating(false);
    if (res.ok) {
      const savedName = newName.trim();
      setNewEmail("");
      setNewPhone("");
      setNewName("");
      setNewRoles(["enseignant"]);
      setNewPassword("");
      setDialogOpen(false);
      if (res.temp_password) {
        setCredsPreview({
          fullName: savedName,
          identifier: res.login_identifier,
          password: res.temp_password,
          channel: res.channel,
        });
      }
    }
  };



  const openEdit = (u: { user_id: string; full_name: string; email: string }) => {
    setEditUser({ id: u.user_id, name: u.full_name, email: u.email });
    setEditName(u.full_name);
    setEditEmail(u.email);
  };
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    const ok = await updateUser(editUser.id, {
      full_name: editName.trim(),
      email: editEmail.trim() !== editUser.email ? editEmail.trim() : undefined,
    });
    setSavingEdit(false);
    if (ok) setEditUser(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteUser(deleteTarget.id);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  const handleResetPwd = async () => {
    if (!pwdUser) return;
    if (!newPwd || newPwd.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères");
      return;
    }

    setResettingPwd(true);
    const ok = await resetPassword(pwdUser.id, newPwd);
    setResettingPwd(false);
    if (ok) { setPwdUser(null); setNewPwd(""); }
  };

  const handleToggleRole = async (userId: string, role: string, hasRole: boolean) => {
    if (hasRole) await removeUserRole(userId, role);
    else await addUserRole(userId, role);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const getUserRoles = (roleStr: string) => roleStr.split(", ").map(r => r.trim()).filter(Boolean);

  const getPermissions = (roleStr: string) => {
    const roles = getUserRoles(roleStr);
    const modules = new Set<string>();
    roles.forEach(r => (ROLE_DEFAULT_MODULES[r] || []).forEach(m => modules.add(m)));
    return modules;
  };

  return (
    <SettingsSection
      title="Utilisateurs & rôles"
      description="Gestion des comptes, rôles et permissions par module."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <HelpBanner storageKey="users-roles" title="Comprendre les rôles">
        Chaque rôle donne accès à un périmètre précis : <strong>Admin</strong> (tout), <strong>Directeur</strong> (gestion pédagogique et financière), <strong>Comptable</strong> (finances uniquement), <strong>Secrétaire</strong> (élèves et inscriptions), <strong>Enseignant</strong> (ses classes et notes), <strong>Bibliothécaire</strong> (bibliothèque). Un utilisateur peut avoir plusieurs rôles.
      </HelpBanner>
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input
          placeholder="Rechercher un utilisateur…"
          className="md:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRolePermsOpen(true)}>
            <ShieldCheck className="h-4 w-4" />Permissions par rôle
          </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4" />Créer un utilisateur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div>
                <Label>Email (optionnel si téléphone renseigné)</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jean@laprovidence.ci" />
              </div>
              <div>
                <Label>Téléphone — 10 chiffres (optionnel si email renseigné)</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="0700000000"
                />
              </div>
              <div>
                <Label>Mot de passe initial (optionnel)</Label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Laisser vide : l'utilisateur le choisira à la 1ère connexion" />
                <p className="text-[11px] text-muted-foreground mt-1">Min. 6 caractères. Si vide, un mot de passe temporaire s'affichera et devra être changé à la 1ère connexion.</p>
              </div>

              <div>
                <Label className="mb-2 block">Rôles (multi-sélection)</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleNewRole(r)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        newRoles.includes(r)
                          ? roleColors[r] + " ring-2 ring-primary/30"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {newRoles.includes(r) && <Check className="h-3 w-3" />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {newRoles.length > 0 && (
                <div className="rounded-lg bg-muted/30 border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Accès modules :</p>
                  <div className="flex flex-wrap gap-1">
                    {MODULES.map((m) => {
                      const hasAccess = newRoles.some(r => (ROLE_DEFAULT_MODULES[r] || []).includes(m.key));
                      return (
                        <Badge key={m.key} variant={hasAccess ? "default" : "outline"} className={hasAccess ? "bg-primary/15 text-primary text-xs" : "text-muted-foreground text-xs opacity-50"}>
                          {m.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button onClick={handleCreateUser} disabled={creating || newRoles.length === 0}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <RolePermissionsDialog open={rolePermsOpen} onOpenChange={setRolePermsOpen} />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const userRoles = getUserRoles(u.role);
            const permissions = getPermissions(u.role);
            const isExpanded = editingUser === u.user_id;

            return (
              <div key={u.user_id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setEditingUser(isExpanded ? null : u.user_id)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.full_name}</div>
                    {u.email && <div className="text-xs text-muted-foreground truncate">{u.email}{u.email_confirmed === false && <span className="ml-2 text-amber-600">(non confirmé)</span>}</div>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userRoles.map((r) => (
                        <Badge key={r} variant="outline" className={`text-[10px] ${roleColors[r] || ""}`}>{r}</Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{permissions.size} modules</span>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-muted/10 space-y-3">
                    <div className="pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Rôles :</p>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map((r) => {
                          const has = userRoles.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleToggleRole(u.user_id, r, has)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                has
                                  ? roleColors[r] + " ring-2 ring-primary/30"
                                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                              }`}
                            >
                              {has ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Accès modules :</p>
                      <div className="flex flex-wrap gap-1">
                        {MODULES.map((m) => {
                          const hasAccess = permissions.has(m.key);
                          const Icon = m.icon;
                          return (
                            <Badge
                              key={m.key}
                              variant={hasAccess ? "default" : "outline"}
                              className={`gap-1 ${hasAccess ? "bg-primary/15 text-primary text-xs" : "text-muted-foreground text-xs opacity-40"}`}
                            >
                              <Icon className="h-3 w-3" />
                              {m.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="pt-2 border-t flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPwdUser({ id: u.user_id, name: u.full_name })}>
                        <KeyRound className="h-3.5 w-3.5" />
                        Nouveau mot de passe
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPermsUser({ id: u.user_id, name: u.full_name })}>
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Permissions détaillées
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => setResetMfaUser({ id: u.user_id, name: u.full_name })}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Réinitialiser le MFA
                      </Button>
                      {currentUser?.id !== u.user_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => setDeleteTarget({ id: u.user_id, name: u.full_name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ Dialog Reset MFA (Super Admin) ============ */}
      <Dialog open={!!resetMfaUser} onOpenChange={(o) => !o && (setResetMfaUser(null), setResetMotif(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <KeyRound className="h-5 w-5" /> Réinitialiser le MFA
            </DialogTitle>
            <DialogDescription>
              Cette action <strong>critique</strong> supprime tous les facteurs MFA, codes de secours
              et appareils de confiance de <strong>{resetMfaUser?.name}</strong>.
              L'utilisateur devra reconfigurer le MFA à sa prochaine connexion.
              <br />Toutes ses sessions actives seront automatiquement déconnectées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motif (obligatoire, audité)</Label>
            <Textarea
              value={resetMotif}
              onChange={(e) => setResetMotif(e.target.value)}
              placeholder="Ex. perte du téléphone confirmée par appel téléphonique du directeur"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {resetMotif.length}/500 — minimum 5 caractères
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setResetMfaUser(null); setResetMotif(""); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetMfa}
              disabled={resettingMfa || resetMotif.trim().length < 5}
            >
              {resettingMfa && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer la réinitialisation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PermissionsMatrixDialog
        open={!!permsUser}
        onOpenChange={(o) => !o && setPermsUser(null)}
        userId={permsUser?.id ?? null}
        userName={permsUser?.name}
      />

      {/* ============ Dialog Édition utilisateur ============ */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom complet</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog Nouveau mot de passe ============ */}
      <Dialog open={!!pwdUser} onOpenChange={(o) => !o && (setPwdUser(null), setNewPwd(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Nouveau mot de passe</DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour <strong>{pwdUser?.name}</strong>. L'utilisateur pourra se connecter immédiatement avec ce mot de passe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nouveau mot de passe (8 caractères min.)</Label>
            <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPwdUser(null); setNewPwd(""); }}>Annuler</Button>
            <Button onClick={handleResetPwd} disabled={resettingPwd || newPwd.length < 8}>
              {resettingPwd && <Loader2 className="h-4 w-4 animate-spin" />}
              Réinitialiser
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog Suppression utilisateur ============ */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Cette action est <strong>définitive</strong>. Le compte de <strong>{deleteTarget?.name}</strong> sera supprimé (rôles, permissions, profil et compte de connexion).
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {credsPreview && (
        <CredentialsPreviewDialog
          open={!!credsPreview}
          onClose={() => setCredsPreview(null)}
          fullName={credsPreview.fullName}
          identifier={credsPreview.identifier}
          password={credsPreview.password}
          channel={credsPreview.channel}
        />
      )}







      <div className="rounded-lg bg-muted/50 border p-4 text-sm">
        <p className="font-semibold text-primary mb-2">Rôles & permissions</p>
        <ul className="space-y-1 text-muted-foreground text-xs">
          <li><strong className="text-foreground">Admin</strong> — accès complet à tous les modules</li>
          <li><strong className="text-foreground">Directeur</strong> — élèves, classes, examens, présences, paramètres</li>
          <li><strong className="text-foreground">Enseignant</strong> — examens, présences, classes</li>
          <li><strong className="text-foreground">Comptable</strong> — finances, élèves</li>
          <li><strong className="text-foreground">Surveillant</strong> — présences, élèves</li>
          <li><strong className="text-foreground">Parent</strong> — consultation élèves, examens</li>
        </ul>
      </div>
    </SettingsSection>
  );
}
