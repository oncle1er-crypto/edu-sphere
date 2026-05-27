import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye, Plus, Pencil, Trash2, Download, Shield, ShieldOff, ShieldCheck } from "lucide-react";
import { useUserPermissions, PermRow } from "@/hooks/useUserPermissions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  userName?: string;
}

const ACTIONS: { key: keyof Omit<PermRow, "module_key">; label: string; icon: any }[] = [
  { key: "can_view", label: "Voir", icon: Eye },
  { key: "can_create", label: "Créer", icon: Plus },
  { key: "can_update", label: "Modifier", icon: Pencil },
  { key: "can_delete", label: "Supprimer", icon: Trash2 },
  { key: "can_export", label: "Exporter", icon: Download },
];

export function PermissionsMatrixDialog({ open, onOpenChange, userId, userName }: Props) {
  const { modules, perms, loading, saving, toggle, setAllForModule, setAllForAction, applyPreset, save } = useUserPermissions(userId);

  const handleSave = async () => {
    const ok = await save();
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissions — {userName ?? "Utilisateur"}
          </DialogTitle>
          <DialogDescription>
            Définissez précisément ce que cet utilisateur peut voir et faire dans chaque module. Ces permissions remplacent celles du rôle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 py-2">
          <Badge variant="outline">Préréglages :</Badge>
          <Button size="sm" variant="outline" onClick={() => applyPreset("none")}>
            <ShieldOff className="mr-1 h-3 w-3" /> Aucun accès
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyPreset("readonly")}>
            <Eye className="mr-1 h-3 w-3" /> Lecture seule
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyPreset("full")}>
            <Shield className="mr-1 h-3 w-3" /> Plein accès
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="h-[55vh] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[200px]">Module</TableHead>
                  {ACTIONS.map(a => (
                    <TableHead key={a.key} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <a.icon className="h-3.5 w-3.5" />
                        <span className="text-xs">{a.label}</span>
                        <div className="flex gap-0.5">
                          <button onClick={() => setAllForAction(a.key, true)} className="text-[10px] text-primary hover:underline">tous</button>
                          <span className="text-[10px] text-muted-foreground">/</span>
                          <button onClick={() => setAllForAction(a.key, false)} className="text-[10px] text-muted-foreground hover:underline">aucun</button>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center w-[80px]">Ligne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(m => {
                  const row = perms[m.key];
                  if (!row) return null;
                  return (
                    <TableRow key={m.key}>
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
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
