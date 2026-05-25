import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, AlertCircle, Files, Wallet, GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";
import { finalizeInscription } from "@/lib/finalizeInscription";
import { useAuth } from "@/context/AuthContext";

interface Props {
  eleve: any | null;
  open: boolean;
  onClose: () => void;
  onOpenDrawer?: (tab?: string) => void;
  onUpdated?: () => void;
}


const REQUIRED_DOCS = [
  { key: "acte_naissance", label: "Acte de naissance" },
  { key: "photo_identite", label: "Photo d'identité" },
  { key: "certificat_scolarite", label: "Certificat de scolarité" },
];

export default function InscriptionWorkflowDialog({ eleve, open, onClose, onOpenDrawer, onUpdated }: Props) {
  const { classes } = useClasses();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [classeId, setClasseId] = useState<string>("");
  const [savingClasse, setSavingClasse] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eleve) return;
    setLoading(true);
    const [docs, pays] = await Promise.all([
      supabase.from("documents_eleves").select("type_document").eq("eleve_id", eleve.id),
      supabase.from("paiements").select("montant").eq("eleve_id", eleve.id),
    ]);
    setDocuments((docs.data as any[]) ?? []);
    setPaiements((pays.data as any[]) ?? []);
    setClasseId(eleve.classe_id ?? "");
    setLoading(false);
  }, [eleve]);

  useEffect(() => {
    if (open && eleve) fetchData();
  }, [open, eleve, fetchData]);

  if (!eleve) return null;

  const docTypes = new Set(documents.map((d) => d.type_document));
  const missingDocs = REQUIRED_DOCS.filter((d) => !docTypes.has(d.key));
  const cDocs = missingDocs.length === 0;
  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0);
  const cPaie = totalPaye > 0;
  const cClasse = !!eleve.classe_id;
  const done = [cDocs, cPaie, cClasse].filter(Boolean).length;
  const progress = (done / 3) * 100;
  const allDone = done === 3;

  const handleSaveClasse = async () => {
    if (!classeId || classeId === eleve.classe_id) return;
    setSavingClasse(true);
    const { error } = await supabase.from("eleves").update({ classe_id: classeId }).eq("id", eleve.id);
    setSavingClasse(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Classe affectée");
    onUpdated?.();
    fetchData();
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    const operatorLabel = (user?.user_metadata as any)?.full_name || user?.email || null;
    const res = await finalizeInscription({
      eleve,
      operatorLabel,
      operatorId: user?.id ?? null,
    });
    setFinalizing(false);
    if (!res.ok) {
      toast.error(res.error ?? "Finalisation impossible");
      return;
    }
    if (res.warnings.length > 0) {
      toast.warning(`Inscription validée — ${res.warnings.length} avertissement(s)`, {
        description: res.warnings.join(" • "),
      });
    } else {
      toast.success(`${eleve.prenom} ${eleve.nom} inscrit(e) définitivement 🎓`, {
        description: `Notifications : ${res.notifications_sent} • PDF généré`,
      });
    }
    onUpdated?.();
    onClose();
  };

  const StepCard = ({
    ok, icon, title, detail, actionLabel, onAction, actionDisabled,
  }: {
    ok: boolean;
    icon: React.ReactNode;
    title: string;
    detail: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
  }) => (
    <div className={`rounded-lg border p-3 flex gap-3 ${ok ? "bg-green-50/60 border-green-200" : "bg-amber-50/60 border-amber-200"}`}>
      <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
        {ok ? <Check className="h-5 w-5" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-medium text-sm ${ok ? "text-green-800" : "text-amber-900"}`}>{title}</p>
          {ok && <Badge variant="outline" className="text-[10px] bg-green-100 border-green-300 text-green-800">Validé</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{detail}</div>
        {!ok && actionLabel && onAction && (
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onAction} disabled={actionDisabled}>
            {actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Finaliser l'inscription
          </DialogTitle>
          <DialogDescription>
            <strong>{eleve.prenom} {eleve.nom}</strong> ({eleve.matricule}) — complétez les 3 étapes pour valider l'inscription définitive.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs font-semibold tabular-nums">{done}/3</span>
            </div>

            <StepCard
              ok={cDocs}
              icon={<Files className="h-4 w-4" />}
              title={`Dossier administratif (${REQUIRED_DOCS.length - missingDocs.length}/${REQUIRED_DOCS.length})`}
              detail={cDocs
                ? "Tous les documents obligatoires sont fournis."
                : <>Manque : <span className="font-medium">{missingDocs.map((d) => d.label).join(", ")}</span></>}
              actionLabel="Téléverser les documents"
              onAction={() => { onClose(); onOpenDrawer?.("documents"); }}
            />

            <StepCard
              ok={cPaie}
              icon={<Wallet className="h-4 w-4" />}
              title="Paiement de la 1ʳᵉ tranche"
              detail={cPaie
                ? `${totalPaye.toLocaleString("fr-FR")} FCFA déjà encaissé.`
                : "Aucun paiement enregistré pour cet élève."}
              actionLabel="Saisir un règlement"
              onAction={() => { onClose(); onOpenDrawer?.("finances"); }}
            />


            <StepCard
              ok={cClasse}
              icon={<GraduationCap className="h-4 w-4" />}
              title="Affectation à une classe"
              detail={cClasse ? (
                `Classe : ${eleve.classe_nom ?? "—"}`
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Select value={classeId} onValueChange={setClasseId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir une classe…" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs" onClick={handleSaveClasse} disabled={savingClasse || !classeId}>
                    {savingClasse ? <Loader2 className="h-3 w-3 animate-spin" /> : "Affecter"}
                  </Button>
                </div>
              )}
            />

            {!allDone && (
              <div className="rounded-md bg-muted/50 border p-2.5 text-xs text-muted-foreground flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>L'inscription sera automatiquement validée dès que les 3 conditions seront remplies. Vous pouvez aussi cliquer sur « Valider l'inscription » ci-dessous une fois tout complété.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button
            onClick={handleFinalize}
            disabled={!allDone || finalizing || loading}
            className="gap-1.5"
          >
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider l'inscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
