import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Trash2, Eye, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import type { Eleve } from "@/hooks/useEleves";
import { messageErreurBase } from "@/lib/dbErrorMessages";

interface Props {
  open: boolean;
  onClose: () => void;
  eleves: Eleve[];
  onView: (e: Eleve) => void;
  onDeleted: () => void;
}

interface Group {
  key: string;
  reason: string;
  members: Eleve[];
}

const norm = (s?: string | null) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export default function DuplicatesDialog({ open, onClose, eleves, onView, onDeleted }: Props) {
  const { isAdmin } = useIsAdmin();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups: Group[] = useMemo(() => {
    const byNP = new Map<string, Eleve[]>();
    const byND = new Map<string, Eleve[]>();
    for (const e of eleves) {
      const kNP = `${norm(e.nom)}|${norm(e.prenom)}`;
      const kND = e.date_naissance ? `${norm(e.nom)}|${e.date_naissance}` : null;
      if (norm(e.nom) && norm(e.prenom)) {
        byNP.set(kNP, [...(byNP.get(kNP) ?? []), e]);
      }
      if (kND) byND.set(kND, [...(byND.get(kND) ?? []), e]);
    }
    const gs: Group[] = [];
    const seen = new Set<string>();
    for (const [k, arr] of byNP) {
      if (arr.length > 1) {
        gs.push({ key: `np:${k}`, reason: "Nom + prénom identiques", members: arr });
        arr.forEach((e) => seen.add(e.id));
      }
    }
    for (const [k, arr] of byND) {
      if (arr.length > 1 && !arr.every((e) => seen.has(e.id))) {
        gs.push({ key: `nd:${k}`, reason: "Nom + date de naissance identiques", members: arr });
      }
    }
    return gs;
  }, [eleves]);

  const permanentDelete = async (e: Eleve) => {
    if (!isAdmin) return;
    if (!confirm(`Supprimer DÉFINITIVEMENT ${e.nom} ${e.prenom} (${e.matricule}) ?\n\nCette action est irréversible.`)) return;
    setDeletingId(e.id);
    // Sécurité : vérifier zéro paiement côté serveur
    const { count, error: cErr } = await supabase
      .from("paiements")
      .select("id", { head: true, count: "exact" })
      .eq("eleve_id", e.id);
    if (cErr) { setDeletingId(null); toast.error(cErr.message); return; }
    if ((count ?? 0) > 0) {
      setDeletingId(null);
      toast.error("Suppression refusée", { description: "Cet élève a déjà des paiements enregistrés." });
      return;
    }
    const { error } = await supabase.from("eleves").delete().eq("id", e.id);
    setDeletingId(null);
    if (error) { toast.error(messageErreurBase(error)); return; }
    toast.success("Élève supprimé définitivement");
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Doublons d'élèves détectés
          </DialogTitle>
          <DialogDescription>
            Élèves partageant le même nom/prénom ou nom + date de naissance sur l'année active.
            {isAdmin ? (
              <span className="block mt-1 text-xs text-primary flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> En tant qu'administrateur, vous pouvez supprimer définitivement les élèves sans paiement.
              </span>
            ) : (
              <span className="block mt-1 text-xs text-muted-foreground">
                Seuls les administrateurs peuvent supprimer définitivement un élève.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aucun doublon détecté.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">{g.reason}</Badge>
                  <span className="text-xs text-muted-foreground">{g.members.length} fiches</span>
                </div>
                <div className="space-y-1.5">
                  {g.members.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded bg-background border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.nom} {e.prenom}
                          <span className="ml-2 text-[10px] font-mono text-muted-foreground">{e.matricule}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {e.classe_nom ?? "Non affecté"} • {e.date_naissance ?? "—"} • {e.statut}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onView(e)}>
                          <Eye className="h-3 w-3" /> Voir
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => permanentDelete(e)}
                            disabled={deletingId === e.id}
                            title="Supprimer définitivement (uniquement si aucun paiement)"
                          >
                            {deletingId === e.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />}
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
