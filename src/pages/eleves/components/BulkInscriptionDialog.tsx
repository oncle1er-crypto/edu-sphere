import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, Files, Wallet, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { finalizeInscription } from "@/lib/finalizeInscription";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  eleves: any[]; // candidates (pre_inscrit)
  onDone?: () => void;
}

interface Readiness {
  eleve: any;
  cDocs: boolean;
  cPaie: boolean;
  cClasse: boolean;
  missingDocs: string[];
  totalPaye: number;
}

interface RunResult {
  id: string;
  full_name: string;
  status: "success" | "warning" | "error";
  detail: string;
}

const REQUIRED_DOCS = [
  { key: "acte_naissance", label: "Acte de naissance" },
  { key: "photo_identite", label: "Photo" },
  { key: "certificat_scolarite", label: "Certif. scolarité" },
];

export default function BulkInscriptionDialog({ open, onClose, eleves, onDone }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [readiness, setReadiness] = useState<Readiness[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RunResult[]>([]);

  useEffect(() => {
    if (!open) return;
    setResults([]);
    setProgress(0);
    (async () => {
      setLoading(true);
      const ids = eleves.map((e) => e.id);
      if (ids.length === 0) { setReadiness([]); setLoading(false); return; }
      const [docs, pays] = await Promise.all([
        supabase.from("documents_eleves").select("eleve_id, type_document").in("eleve_id", ids),
        supabase.from("paiements").select("eleve_id, montant").in("eleve_id", ids),
      ]);
      const docsByEleve = new Map<string, Set<string>>();
      (docs.data ?? []).forEach((d: any) => {
        if (!docsByEleve.has(d.eleve_id)) docsByEleve.set(d.eleve_id, new Set());
        docsByEleve.get(d.eleve_id)!.add(d.type_document);
      });
      const payByEleve = new Map<string, number>();
      (pays.data ?? []).forEach((p: any) => {
        payByEleve.set(p.eleve_id, (payByEleve.get(p.eleve_id) ?? 0) + Number(p.montant ?? 0));
      });
      const list: Readiness[] = eleves.map((e) => {
        const docSet = docsByEleve.get(e.id) ?? new Set();
        const missing = REQUIRED_DOCS.filter((d) => !docSet.has(d.key));
        const totalPaye = payByEleve.get(e.id) ?? 0;
        return {
          eleve: e,
          cDocs: missing.length === 0,
          cPaie: totalPaye > 0,
          cClasse: !!e.classe_id,
          missingDocs: missing.map((d) => d.label),
          totalPaye,
        };
      });
      setReadiness(list);
      // Documents facultatifs : « prêt » = classe + paiement OK.
      const init: Record<string, boolean> = {};
      list.forEach((r) => { if (r.cPaie && r.cClasse) init[r.eleve.id] = true; });
      setSelected(init);
      setLoading(false);
    })();
  }, [open, eleves]);

  const readyCount = readiness.filter((r) => r.cPaie && r.cClasse).length;
  const selectedReady = readiness.filter((r) => selected[r.eleve.id] && r.cPaie && r.cClasse);

  const toggleAllReady = () => {
    const allOn = selectedReady.length === readyCount && readyCount > 0;
    const next: Record<string, boolean> = {};
    readiness.forEach((r) => {
      if (r.cPaie && r.cClasse) next[r.eleve.id] = !allOn;
    });
    setSelected(next);
  };

  const runBulk = async () => {
    if (selectedReady.length === 0) return;
    setRunning(true);
    setResults([]);
    const operatorLabel = (user?.user_metadata as any)?.full_name || user?.email || null;
    const out: RunResult[] = [];
    let done = 0;
    for (const r of selectedReady) {
      try {
        const res = await finalizeInscription({
          eleve: r.eleve,
          operatorLabel,
          operatorId: user?.id ?? null,
          // PDFs en lot = bruyant : on coupe pour limiter le nombre de téléchargements
          generatePdf: selectedReady.length <= 3,
        });
        out.push({
          id: r.eleve.id,
          full_name: `${r.eleve.nom} ${r.eleve.prenom}`,
          status: res.ok ? (res.warnings.length ? "warning" : "success") : "error",
          detail: res.ok ? res.steps.join(" • ") : (res.error ?? "Erreur"),
        });
      } catch (e: any) {
        out.push({
          id: r.eleve.id,
          full_name: `${r.eleve.nom} ${r.eleve.prenom}`,
          status: "error",
          detail: e?.message ?? "Erreur",
        });
      }
      done += 1;
      setProgress((done / selectedReady.length) * 100);
      setResults([...out]);
    }
    setRunning(false);
    const ok = out.filter((r) => r.status === "success").length;
    const warn = out.filter((r) => r.status === "warning").length;
    const err = out.filter((r) => r.status === "error").length;
    if (err === 0 && warn === 0) toast.success(`${ok} élève(s) inscrit(s) avec succès`);
    else toast.warning(`${ok} OK • ${warn} avertissement(s) • ${err} erreur(s)`);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Finalisation en lot des inscriptions
          </DialogTitle>
          <DialogDescription>
            Validez plusieurs pré-inscrits d'un coup. Seuls les élèves dont les 3 conditions (documents, paiement, classe) sont remplies peuvent être finalisés.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : readiness.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Aucun élève pré-inscrit sélectionné.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{readyCount}</strong> prêt(s) sur {readiness.length} pré-inscrits — sélection : <strong className="text-foreground">{selectedReady.length}</strong>
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={toggleAllReady} disabled={readyCount === 0 || running}>
                {selectedReady.length === readyCount && readyCount > 0 ? "Tout désélectionner" : "Tout sélectionner (prêts)"}
              </Button>
            </div>

            <div className="border rounded-lg max-h-[40vh] overflow-y-auto divide-y">
              {readiness.map((r) => {
                const ready = r.cDocs && r.cPaie && r.cClasse;
                const res = results.find((x) => x.id === r.eleve.id);
                return (
                  <div key={r.eleve.id} className={`flex items-start gap-3 p-3 ${!ready ? "bg-muted/30" : ""}`}>
                    <Checkbox
                      checked={!!selected[r.eleve.id]}
                      disabled={!ready || running}
                      onCheckedChange={(c) => setSelected((s) => ({ ...s, [r.eleve.id]: !!c }))}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.eleve.nom} {r.eleve.prenom}</p>
                        <Badge variant="outline" className="text-[10px] font-mono">{r.eleve.matricule}</Badge>
                        {ready ? (
                          <Badge className="text-[10px] bg-green-100 text-green-800 border-green-300">Prêt</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">À compléter</Badge>
                        )}
                        {res?.status === "success" && <Badge className="text-[10px] bg-green-600">✓ Inscrit</Badge>}
                        {res?.status === "warning" && <Badge className="text-[10px] bg-amber-500">⚠ Avec avertissement</Badge>}
                        {res?.status === "error" && <Badge variant="destructive" className="text-[10px]">✗ Erreur</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
                        <span className={`flex items-center gap-1 ${r.cDocs ? "text-green-700" : "text-amber-700"}`}>
                          <Files className="h-3 w-3" /> {r.cDocs ? "Docs OK" : `Manque: ${r.missingDocs.join(", ")}`}
                        </span>
                        <span className={`flex items-center gap-1 ${r.cPaie ? "text-green-700" : "text-amber-700"}`}>
                          <Wallet className="h-3 w-3" /> {r.cPaie ? `${r.totalPaye.toLocaleString("fr-FR")} FCFA` : "Aucun paiement"}
                        </span>
                        <span className={`flex items-center gap-1 ${r.cClasse ? "text-green-700" : "text-amber-700"}`}>
                          <GraduationCap className="h-3 w-3" /> {r.cClasse ? (r.eleve.classe_nom ?? "Classe affectée") : "Pas de classe"}
                        </span>
                      </div>
                      {res?.detail && (
                        <p className={`mt-1 text-[11px] ${res.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{res.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {running && (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-center">Traitement en cours…</p>
              </div>
            )}

            {results.length > 0 && !running && (
              <div className="flex items-center gap-3 text-xs justify-center pt-1">
                <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> {results.filter(r => r.status === "success").length}</span>
                <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {results.filter(r => r.status === "warning").length}</span>
                <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> {results.filter(r => r.status === "error").length}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={running}>Fermer</Button>
          <Button onClick={runBulk} disabled={running || selectedReady.length === 0} className="gap-1.5">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Finaliser {selectedReady.length > 0 ? `(${selectedReady.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
