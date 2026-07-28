import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const MODES = ["especes","wave","orange_money","mtn_money","moov_money","virement","cheque","remise","bourse","prise_en_charge"] as const;

export interface EditableInvoice {
  id: string;
  numero: string;
  libelle: string;
  date_echeance: string;
}

interface Props {
  facture: EditableInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface PaiementRow {
  id: string;
  montant: number;
  mode: string;
  date_paiement: string;
  annule_le: string | null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

export function InvoiceEditDialog({ facture, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [libelle, setLibelle] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [saving, setSaving] = useState(false);
  const [canEditMode, setCanEditMode] = useState(false);
  const [paiements, setPaiements] = useState<PaiementRow[]>([]);
  const [pendingModes, setPendingModes] = useState<Record<string, string>>({});
  const [savingModeId, setSavingModeId] = useState<string | null>(null);

  useEffect(() => {
    if (facture) {
      setLibelle(facture.libelle ?? "");
      setDateEcheance(facture.date_echeance ?? "");
      setPendingModes({});
    }
  }, [facture?.id]);

  useEffect(() => {
    if (!user) { setCanEditMode(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin","directeur","comptable"] as any);
      setCanEditMode((data ?? []).length > 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!open || !facture) return;
    (async () => {
      const { data } = await supabase
        .from("paiements")
        .select("id, montant, mode, date_paiement, annule_le")
        .eq("facture_id", facture.id)
        .order("date_paiement", { ascending: false });
      setPaiements(((data ?? []) as any[]) as PaiementRow[]);
    })();
  }, [open, facture?.id]);

  if (!facture) return null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("factures")
      .update({ libelle, date_echeance: dateEcheance })
      .eq("id", facture.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Facture mise à jour");
    onOpenChange(false);
    onSaved?.();
  };

  const saveMode = async (id: string) => {
    const newMode = pendingModes[id];
    if (!newMode) return;
    setSavingModeId(id);
    const { error } = await supabase.from("paiements").update({ mode: newMode as any }).eq("id", id);
    setSavingModeId(null);
    if (error) return toast.error(error.message);
    toast.success("Mode de paiement modifié");
    setPaiements((prev) => prev.map((p) => (p.id === id ? { ...p, mode: newMode } : p)));
    setPendingModes((prev) => { const { [id]: _, ...rest } = prev; return rest; });
    onSaved?.();
  };

  const activePaiements = paiements.filter((p) => !p.annule_le);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Pencil className="h-5 w-5" /> Modifier la facture
          </DialogTitle>
          <DialogDescription>{facture.numero}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Échéance</Label>
            <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
          </div>

          {canEditMode && activePaiements.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-primary">Mode de paiement des encaissements</Label>
              <p className="text-xs text-muted-foreground">Corrigez le mode si un paiement a été enregistré avec le mauvais type (ex : espèces au lieu de Wave).</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activePaiements.map((p) => {
                  const currentValue = pendingModes[p.id] ?? p.mode;
                  const dirty = pendingModes[p.id] && pendingModes[p.id] !== p.mode;
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <span className="w-24 text-xs text-muted-foreground shrink-0">{p.date_paiement}</span>
                      <span className="w-28 text-right font-medium shrink-0">{fcfa(Number(p.montant))}</span>
                      <Select value={currentValue} onValueChange={(v) => setPendingModes((prev) => ({ ...prev, [p.id]: v }))}>
                        <SelectTrigger className="h-8 flex-1 text-xs uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m} className="text-xs uppercase">{m}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant={dirty ? "default" : "ghost"}
                        className="h-8 w-8 shrink-0"
                        disabled={!dirty || savingModeId === p.id}
                        onClick={() => saveMode(p.id)}
                        title="Enregistrer le mode"
                      >
                        {savingModeId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
