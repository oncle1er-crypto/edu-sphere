import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, Plus, Pencil, Trash2, Download, Shield, ShieldOff, ShieldCheck, Search, ChevronDown, X } from "lucide-react";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import type { PermRow } from "@/hooks/useUserPermissions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const ROLES = ["directeur", "secretaire", "comptable", "enseignant", "educateur", "surveillant", "parent"] as const;

const ACTIONS: { key: keyof Omit<PermRow, "module_key">; label: string; icon: any }[] = [
  { key: "can_view", label: "Voir", icon: Eye },
  { key: "can_create", label: "Créer", icon: Plus },
  { key: "can_update", label: "Modifier", icon: Pencil },
  { key: "can_delete", label: "Supprimer", icon: Trash2 },
  { key: "can_export", label: "Exporter", icon: Download },
];

export function RolePermissionsDialog({ open, onOpenChange }: Props) {
  const [role, setRole] = useState<string>("secretaire");
  const { modules, perms, loading, saving, isDefault, toggle, setAllForModule, setActionForModules, applyPreset, save } = useRolePermissions(role);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { if (!open) { setQuery(""); setSelected(new Set()); } }, [open]);
  useEffect(() => { setSelected(new Set()); }, [role]);

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(m => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q));
  }, [modules, query]);

  const visibleKeys = filteredModules.map(m => m.key);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(k => selected.has(k));
  const someVisibleSelected = visibleKeys.some(k => selected.has(k));

  const toggleRow = (k: string) => setSelected(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleAllVisible = () => setSelected(prev => { const n = new Set(prev); if (allVisibleSelected) visibleKeys.forEach(k => n.delete(k)); else visibleKeys.forEach(k => n.add(k)); return n; });
  const targetKeys = () => (selected.size > 0 ? Array.from(selected) : visibleKeys);

  const handleSave = async () => { const ok = await save(); if (ok) onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissions par rôle
          </DialogTitle>
          <DialogDescription>
            Ces permissions s'appliquent à <strong>tous les utilisateurs</strong> ayant le rôle sélectionné.
            Les permissions individuelles (bouton « Permissions » sur une ligne) restent prioritaires en cas de conflit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rôle :</span>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un module…" className="pl-9 pr-9" />
              {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </div>
          </div>

          {!loading && isDefault && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              Aucune permission n'est encore enregistrée pour le rôle « <strong className="capitalize">{role}</strong> ». Les cases pré-cochées ci-dessous correspondent aux <strong>valeurs par défaut recommandées</strong> (lecture + export sur les modules attendus). Ajustez si besoin puis cliquez sur <strong>Enregistrer</strong> pour les valider.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selected.size > 0 ? `${selected.size} module${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""}` : `Cible : ${visibleKeys.length} module${visibleKeys.length > 1 ? "s" : ""} affiché${visibleKeys.length > 1 ? "s" : ""}`}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Appliquer un preset <ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{selected.size > 0 ? "Aux lignes sélectionnées" : "À toutes les lignes affichées"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => applyPreset("full", targetKeys())}><Shield className="mr-2 h-4 w-4 text-primary" /> Plein accès</DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyPreset("readonly", targetKeys())}><Eye className="mr-2 h-4 w-4" /> Lecture seule</DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyPreset("none", targetKeys())}><ShieldOff className="mr-2 h-4 w-4 text-muted-foreground" /> Aucun accès</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selected.size > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="mr-1 h-3 w-3" /> Effacer</Button>}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="h-[50vh] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false} onCheckedChange={toggleAllVisible} />
                  </TableHead>
                  <TableHead className="w-[260px]">Module</TableHead>
                  {ACTIONS.map(a => {
                    const keys = targetKeys();
                    const allOn = keys.length > 0 && keys.every(k => perms[k]?.[a.key]);
                    return (
                      <TableHead key={a.key} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <a.icon className="h-3.5 w-3.5" />
                          <span className="text-xs">{a.label}</span>
                          <button onClick={() => setActionForModules(a.key, !allOn, keys)} className="text-[10px] text-primary hover:underline">
                            {allOn ? "tout décocher" : "tout cocher"}
                          </button>
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-center w-[90px]">Ligne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModules.length === 0 && (
                  <TableRow><TableCell colSpan={ACTIONS.length + 3} className="text-center text-muted-foreground py-8">Aucun module.</TableCell></TableRow>
                )}
                {filteredModules.map(m => {
                  const row = perms[m.key];
                  if (!row) return null;
                  const isSelected = selected.has(m.key);
                  return (
                    <TableRow key={m.key} data-state={isSelected ? "selected" : undefined}>
                      <TableCell><Checkbox checked={isSelected} onCheckedChange={() => toggleRow(m.key)} /></TableCell>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      {ACTIONS.map(a => (
                        <TableCell key={a.key} className="text-center">
                          <Checkbox checked={row[a.key]} onCheckedChange={() => toggle(m.key, a.key)} />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => setAllForModule(m.key, true)} className="text-[10px] text-primary hover:underline">✓</button>
                          <button onClick={() => setAllForModule(m.key, false)} className="text-[10px] text-muted-foreground hover:underline">✗</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les permissions du rôle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
