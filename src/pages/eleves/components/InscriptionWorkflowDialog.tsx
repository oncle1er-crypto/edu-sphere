import { useEffect, useState, useCallback, useRef } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, AlertCircle, Files, Wallet, GraduationCap, Sparkles, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClasses } from "@/hooks/useClasses";
import { useDocumentsEleves } from "@/hooks/useDocumentsEleves";
import { useEcoleId } from "@/hooks/useEcoleId";
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

const MOYENS = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "mtn_money", label: "MTN MoMo" },
  { value: "moov_money", label: "Moov Money" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
];

interface TrancheRow {
  id: string;
  numero: number;
  label: string;
  montant: number;
  paye: number;
  echeance: string;
  statut: string;
}

export default function InscriptionWorkflowDialog({ eleve, open, onClose, onOpenDrawer, onUpdated }: Props) {
  const { activeAnnee } = useAcademicPeriod();
  const { classes } = useClasses(activeAnnee.id);
  const { user } = useAuth();
  const { ecoleId } = useEcoleId();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [tranches, setTranches] = useState<TrancheRow[]>([]);
  const [classeId, setClasseId] = useState<string>("");
  const [savingClasse, setSavingClasse] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Upload inline
  const { uploadDocument } = useDocumentsEleves(eleve?.id);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<string | null>(null);

  // Paiement inline
  const [payMontant, setPayMontant] = useState<string>("");
  const [payMode, setPayMode] = useState<string>("wave");
  const [payRef, setPayRef] = useState<string>("");
  const [payLoading, setPayLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eleve) return;
    setLoading(true);
    const [docs, pays, trs] = await Promise.all([
      supabase.from("documents_eleves").select("type_document").eq("eleve_id", eleve.id),
      supabase.from("paiements").select("montant").eq("eleve_id", eleve.id),
      supabase.from("tranches").select("id,numero,label,montant,paye,echeance,statut").eq("eleve_id", eleve.id).order("numero"),
    ]);
    setDocuments((docs.data as any[]) ?? []);
    setPaiements((pays.data as any[]) ?? []);
    setTranches((trs.data as any[]) ?? []);
    setClasseId(eleve.classe_id ?? "");
    setLoading(false);
  }, [eleve]);

  useEffect(() => {
    if (open && eleve) fetchData();
  }, [open, eleve, fetchData]);

  // Pré-remplir le montant quand la tranche cible change
  const nextTranche = tranches.find((t) => Number(t.paye) < Number(t.montant));
  useEffect(() => {
    if (nextTranche) {
      const reste = Number(nextTranche.montant) - Number(nextTranche.paye);
      setPayMontant(String(Math.max(0, reste)));
    }
  }, [nextTranche?.id]);

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

  const triggerUpload = (type: string) => {
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingTypeRef.current;
    if (!file || !type || !eleve) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }
    setUploadingType(type);
    await uploadDocument(eleve.id, type, file, user?.id);
    setUploadingType(null);
    pendingTypeRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchData();
  };

  const notifyParentsPayment = async (montant: number) => {
    try {
      const { data: links } = await supabase
        .from("eleve_parents")
        .select("parents(telephone, telephone2)")
        .eq("eleve_id", eleve.id);
      const phones: string[] = [];
      (links ?? []).forEach((l: any) => {
        if (l.parents?.telephone) phones.push(l.parents.telephone);
        if (l.parents?.telephone2) phones.push(l.parents.telephone2);
      });
      if (phones.length === 0 || !ecoleId) return;
      const message = `Bonjour, nous accusons reception du 1er paiement de ${montant.toLocaleString("fr-FR")} FCFA pour ${eleve.nom} ${eleve.prenom} (mat. ${eleve.matricule}). Merci.`;
      await supabase.functions.invoke("send-sms", {
        body: { ecole_id: ecoleId, destinataires: phones, message },
      });
    } catch {/* silencieux */}
  };

  const handlePayInline = async () => {
    if (!ecoleId) return;
    const montant = Number(payMontant) || 0;
    if (montant <= 0) {
      toast.error("Montant invalide");
      return;
    }

    setPayLoading(true);

    // 1) S'assurer qu'une tranche existe (sinon, générer l'échéancier)
    let tranche = nextTranche;
    if (!tranche) {
      const { error: genErr } = await supabase.rpc("generer_tranches_eleve" as any, { _eleve_id: eleve.id });
      if (genErr) {
        setPayLoading(false);
        toast.error("Génération de l'échéancier impossible", { description: genErr.message + " — vérifiez les frais de scolarité du cycle." });
        return;
      }
      const { data: trs } = await supabase
        .from("tranches")
        .select("id,numero,label,montant,paye,echeance,statut")
        .eq("eleve_id", eleve.id)
        .order("numero");
      const rows = (trs as any[]) ?? [];
      setTranches(rows);
      tranche = rows.find((t) => Number(t.paye) < Number(t.montant)) as any;
      if (!tranche) {
        setPayLoading(false);
        toast.error("Aucune tranche disponible après génération. Configurez les frais de scolarité.");
        return;
      }
    }

    const reste = Number(tranche.montant) - Number(tranche.paye);
    const montantFinal = Math.min(montant, reste);

    // 2) Encaisser
    const { error } = await supabase.rpc("enregistrer_paiement", {
      _ecole_id: ecoleId,
      _eleve_id: eleve.id,
      _tranche_id: tranche.id,
      _montant: montantFinal,
      _mode: payMode,
      _reference: payRef || null,
      _recu_par: user?.id ?? null,
    });
    if (error) {
      setPayLoading(false);
      toast.error("Encaissement refusé", { description: error.message });
      return;
    }

    // 3) Notifier les parents
    await notifyParentsPayment(montantFinal);

    setPayLoading(false);
    toast.success(`1er paiement enregistré (${montantFinal.toLocaleString("fr-FR")} FCFA) — SMS envoyé aux parents`);
    setPayRef("");
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
      toast.success(`${eleve.nom} ${eleve.prenom} inscrit(e) définitivement 🎓`, {
        description: `Notifications : ${res.notifications_sent} • PDF généré`,
      });
    }
    onUpdated?.();
    onClose();
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Finaliser l'inscription
          </DialogTitle>
          <DialogDescription>
            <strong>{eleve.nom} {eleve.prenom}</strong> ({eleve.matricule}) — complétez les 3 étapes ci-dessous sans quitter cette fenêtre.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileChange}
        />

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs font-semibold tabular-nums">{done}/3</span>
            </div>

            {/* Étape 1 : Documents */}
            <div className={`rounded-lg border p-3 ${cDocs ? "bg-green-50/60 border-green-200" : "bg-amber-50/60 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cDocs ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                  {cDocs ? <Check className="h-4 w-4" /> : <Files className="h-4 w-4" />}
                </div>
                <p className={`font-medium text-sm ${cDocs ? "text-green-800" : "text-amber-900"}`}>
                  Dossier administratif ({REQUIRED_DOCS.length - missingDocs.length}/{REQUIRED_DOCS.length})
                </p>
                {cDocs && <Badge variant="outline" className="text-[10px] bg-green-100 border-green-300 text-green-800 ml-auto">Validé</Badge>}
              </div>
              {!cDocs && (
                <div className="space-y-1.5">
                  {missingDocs.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-2 bg-background/60 rounded px-2 py-1.5 border">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{d.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => triggerUpload(d.key)}
                        disabled={uploadingType !== null}
                      >
                        {uploadingType === d.key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        Téléverser
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Étape 2 : Paiement */}
            <div className={`rounded-lg border p-3 ${cPaie ? "bg-green-50/60 border-green-200" : "bg-amber-50/60 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cPaie ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                  {cPaie ? <Check className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                </div>
                <p className={`font-medium text-sm ${cPaie ? "text-green-800" : "text-amber-900"}`}>
                  Paiement de la 1ʳᵉ tranche
                </p>
                {cPaie && <Badge variant="outline" className="text-[10px] bg-green-100 border-green-300 text-green-800 ml-auto">Validé</Badge>}
              </div>
              {cPaie ? (
                <p className="text-xs text-muted-foreground">{fmt(totalPaye)} FCFA déjà encaissé.</p>
              ) : nextTranche ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 bg-background/60 rounded p-2 border text-center">
                    <div><p className="text-[9px] uppercase text-muted-foreground">Tranche</p><p className="text-xs font-semibold">T{nextTranche.numero}</p></div>
                    <div><p className="text-[9px] uppercase text-muted-foreground">Montant</p><p className="text-xs font-semibold">{fmt(Number(nextTranche.montant))}</p></div>
                    <div><p className="text-[9px] uppercase text-muted-foreground">Reste</p><p className="text-xs font-semibold text-destructive">{fmt(Number(nextTranche.montant) - Number(nextTranche.paye))}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Montant (FCFA)</Label>
                      <Input className="h-8 text-xs" type="number" value={payMontant} onChange={(e) => setPayMontant(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Moyen</Label>
                      <Select value={payMode} onValueChange={setPayMode}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOYENS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">Référence (optionnel)</Label>
                    <Input className="h-8 text-xs" placeholder="N° reçu / transaction" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" onClick={handlePayInline} disabled={payLoading}>
                    {payLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wallet className="h-3 w-3 mr-1" />}
                    Enregistrer l'encaissement
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-amber-900">
                    Aucune tranche n'est encore générée. Saisissez le montant du 1er paiement : l'échéancier sera créé automatiquement.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Montant (FCFA)</Label>
                      <Input className="h-8 text-xs" type="number" value={payMontant} onChange={(e) => setPayMontant(e.target.value)} placeholder="Ex. 50000" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Moyen</Label>
                      <Select value={payMode} onValueChange={setPayMode}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOYENS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">Référence (optionnel)</Label>
                    <Input className="h-8 text-xs" placeholder="N° reçu / transaction" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" onClick={handlePayInline} disabled={payLoading || !cClasse}>
                    {payLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wallet className="h-3 w-3 mr-1" />}
                    Effectuer le 1er paiement
                  </Button>
                  {!cClasse && (
                    <p className="text-[10px] text-muted-foreground">Affectez d'abord une classe (étape 3) pour générer l'échéancier.</p>
                  )}
                </div>
              )}
            </div>

            {/* Étape 3 : Classe */}
            <div className={`rounded-lg border p-3 ${cClasse ? "bg-green-50/60 border-green-200" : "bg-amber-50/60 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cClasse ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                  {cClasse ? <Check className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                </div>
                <p className={`font-medium text-sm ${cClasse ? "text-green-800" : "text-amber-900"}`}>
                  Affectation à une classe
                </p>
                {cClasse && <Badge variant="outline" className="text-[10px] bg-green-100 border-green-300 text-green-800 ml-auto">Validé</Badge>}
              </div>
              {cClasse ? (
                <p className="text-xs text-muted-foreground">Classe : {eleve.classe_nom ?? "—"}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={classeId} onValueChange={setClasseId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir une classe…" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs" onClick={handleSaveClasse} disabled={savingClasse || !classeId}>
                    {savingClasse ? <Loader2 className="h-3 w-3 animate-spin" /> : "Affecter"}
                  </Button>
                </div>
              )}
            </div>

            {!allDone && (
              <div className="rounded-md bg-muted/50 border p-2.5 text-xs text-muted-foreground flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Une fois les 3 étapes vertes, cliquez sur « Valider l'inscription » pour finaliser.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={handleFinalize} disabled={!allDone || finalizing || loading} className="gap-1.5">
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider l'inscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
