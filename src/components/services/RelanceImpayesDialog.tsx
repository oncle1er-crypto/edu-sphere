import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtF } from "./serviceKpis";

export interface CibleRelance {
  /** Présent lorsque la relance part de la liste des abonnés (trace la dernière relance). */
  abonnement_id?: string;
  eleve_id: string;
  eleve_nom: string;
  classe_nom: string;
  reste: number;
}


interface Props {
  cibles: CibleRelance[];
  ecoleId: string | null;
  service: "cantine" | "transport";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}

interface Destinataire extends CibleRelance {
  parent: string;
  telephone: string | null;
}

const LABEL = { cantine: "la cantine", transport: "le transport scolaire" } as const;

/** Relance SMS groupée des familles en retard de paiement (cantine / transport). */
export function RelanceImpayesDialog({ cibles, ecoleId, service, open, onOpenChange, onDone }: Props) {
  const [dest, setDest] = useState<Destinataire[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || cibles.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("eleve_parents")
        .select("eleve_id, est_contact_principal, parents(nom, prenom, telephone, telephone2)")
        .in("eleve_id", cibles.map((c) => c.eleve_id));
      const byEleve = new Map<string, { parent: string; telephone: string | null }>();
      ((data ?? []) as any[])
        .sort((a, b) => Number(b.est_contact_principal) - Number(a.est_contact_principal))
        .forEach((l) => {
          if (byEleve.has(l.eleve_id)) return;
          const p = l.parents;
          if (!p) return;
          byEleve.set(l.eleve_id, {
            parent: `${p.nom ?? ""} ${p.prenom ?? ""}`.trim() || "Parent",
            telephone: p.telephone || p.telephone2 || null,
          });
        });
      if (cancelled) return;
      setDest(cibles.map((c) => ({
        ...c,
        parent: byEleve.get(c.eleve_id)?.parent ?? "Parent",
        telephone: byEleve.get(c.eleve_id)?.telephone ?? null,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, cibles]);

  // Un même élève/numéro ne doit recevoir qu'un seul SMS, même s'il a plusieurs abonnements.
  const joignables = dest.filter(
    (d, i) => !!d.telephone && dest.findIndex((x) => x.eleve_id === d.eleve_id && x.telephone === d.telephone) === i,
  );


  const send = async () => {
    if (!ecoleId || joignables.length === 0) return;
    setSending(true);
    let ok = 0;
    for (const d of joignables) {
      const message =
        `GSP - Bonjour ${d.parent}, un montant de ${fmtF(d.reste).replace(" F", " FCFA")} reste dû pour ` +
        `${LABEL[service]} de ${d.eleve_nom} (${d.classe_nom}). Merci de régulariser au secrétariat. ` +
        `Foi, Savoir, Excellence.`;
      try {
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { ecole_id: ecoleId, destinataires: [d.telephone], message },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if ((data?.sent ?? 0) > 0) ok += 1;
      } catch (e) {
        console.error("relance sms", d.eleve_nom, e);
      }
    }

    const table = service === "cantine" ? "abonnements_cantine" : "abonnements_transport";
    const abos = joignables.map((d) => d.abonnement_id).filter((id): id is string => !!id);
    if (abos.length > 0) {
      await (supabase as any).from(table)
        .update({ derniere_relance_at: new Date().toISOString() })
        .in("id", abos);
    }


    setSending(false);
    if (ok > 0) toast.success(`${ok} relance(s) SMS envoyée(s)`);
    else toast.error("Aucun SMS n'a pu être envoyé — vérifiez la configuration SMS");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Relancer les impayés — {service === "cantine" ? "Cantine" : "Transport"}
          </DialogTitle>
          <DialogDescription>
            Un SMS personnalisé est envoyé au contact principal de chaque famille ayant un reste dû sur une échéance
            déjà passée.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {dest.map((d) => (
              <div key={d.abonnement_id ?? d.eleve_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.eleve_nom} <span className="text-muted-foreground">· {d.classe_nom}</span></p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.parent} — {d.telephone ?? <span className="text-destructive">aucun numéro</span>}
                  </p>
                </div>
                <Badge variant="destructive">{fmtF(d.reste)}</Badge>
              </div>
            ))}
            {dest.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune famille en retard.</p>
            )}
          </div>
        )}

        <DialogFooter className="items-center">
          <p className="text-xs text-muted-foreground mr-auto">
            {joignables.length} joignable(s) sur {dest.length}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={send} disabled={sending || joignables.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer les SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RelanceImpayesDialog;
