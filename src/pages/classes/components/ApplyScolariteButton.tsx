import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUTS_ACTIFS } from "@/lib/eleveStatus";
import { toast } from "sonner";

interface Props {
  classeId: string;
  classeNom: string;
  onDone?: () => void;
}

/**
 * Bouton "Appliquer la scolarité" au niveau d'une classe.
 * Génère les tranches (RPC `generer_tranches_eleve`) pour chaque élève actif
 * de la classe. Nécessite qu'une ligne de grille tarifaire existe pour le
 * niveau/cycle de la classe.
 */
export default function ApplyScolariteButton({ classeId, classeNom, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    setLoadingCount(true);
    const { count: c } = await supabase
      .from("eleves")
      .select("id", { count: "exact", head: true })
      .eq("classe_id", classeId)
      .in("statut", STATUTS_ACTIFS as unknown as string[]);
    setCount(c ?? 0);
    setLoadingCount(false);
  };

  const run = async () => {
    setRunning(true);
    const { data: rows, error } = await supabase
      .from("eleves")
      .select("id")
      .eq("classe_id", classeId)
      .in("statut", STATUTS_ACTIFS as unknown as string[]);

    if (error) {
      setRunning(false);
      toast.error("Impossible de récupérer les élèves", { description: error.message });
      return;
    }

    const ids = (rows ?? []).map((r: any) => r.id as string);
    if (ids.length === 0) {
      setRunning(false);
      toast.info("Aucun élève actif dans cette classe.");
      setOpen(false);
      return;
    }

    const results = await Promise.allSettled(
      ids.map((id) => supabase.rpc("generer_tranches_eleve" as any, { _eleve_id: id })),
    );

    let ok = 0;
    let fail = 0;
    const errors: string[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && !(r.value as any).error) ok++;
      else {
        fail++;
        const msg =
          r.status === "rejected"
            ? String((r.reason as any)?.message ?? r.reason)
            : String(((r.value as any).error?.message) ?? "erreur");
        if (errors.length < 3) errors.push(msg);
      }
    });

    setRunning(false);
    setOpen(false);

    if (fail === 0) {
      toast.success(`Scolarité appliquée à ${ok} élève(s) de ${classeNom}`);
    } else {
      toast.warning(`Scolarité : ${ok} OK, ${fail} en échec`, {
        description: errors.join(" • ") || "Vérifiez la grille tarifaire du niveau.",
      });
    }
    onDone?.();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog} className="h-8 text-xs gap-1.5">
        <Wallet className="h-3.5 w-3.5" />
        Appliquer la scolarité
      </Button>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appliquer la scolarité — {classeNom}</DialogTitle>
            <DialogDescription>
              Génère l'échéancier (tranches) pour tous les élèves actifs de la classe à
              partir de la grille tarifaire du niveau. Les élèves ayant déjà des tranches
              ne sont pas dupliqués.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            {loadingCount ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Comptage…
              </span>
            ) : (
              <>
                Élèves actifs concernés :{" "}
                <strong className="text-foreground">{count ?? 0}</strong>
              </>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Astuce : configurez d'abord la grille dans <em>Finances → Configuration →
              Grille tarifaire</em> pour le niveau de cette classe.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
              Annuler
            </Button>
            <Button onClick={run} disabled={running || loadingCount || (count ?? 0) === 0}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Wallet className="h-4 w-4 mr-1.5" />}
              Lancer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
