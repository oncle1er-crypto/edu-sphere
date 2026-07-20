import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSpVentes, type SpModePaiement, type SpVenteStatut, type SpVenteTenue } from "../hooks/useSpVentes";

const MODES: SpModePaiement[] = ["especes", "wave", "orange_money", "mtn_money", "moov_money", "virement", "cheque"];
const STATUTS: SpVenteStatut[] = ["paye", "remis", "attente", "annule"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (v: SpVenteTenue) => void;
}

export function VenteTenueDialog({ open, onOpenChange, onSuccess }: Props) {
  const { save } = useSpVentes();
  const [acheteur, setAcheteur] = useState("");
  const [qte, setQte] = useState(1);
  const [prix, setPrix] = useState(0);
  const [mode, setMode] = useState<SpModePaiement>("especes");
  const [statut, setStatut] = useState<SpVenteStatut>("paye");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setAcheteur(""); setQte(1); setPrix(0); setMode("especes"); setStatut("paye"); setObs(""); }
  }, [open]);

  const submit = async () => {
    setSaving(true);
    const v = await save({
      acheteur_type: "libre",
      acheteur_libre: acheteur,
      quantite: qte,
      prix_unitaire: prix,
      montant_total: qte * prix,
      mode_paiement: mode,
      statut,
      observations: obs || null,
    });
    setSaving(false);
    if (v) { onSuccess?.(v); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Vente de tenue</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Acheteur</Label><Input value={acheteur} onChange={(e) => setAcheteur(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantité</Label><Input type="number" min={1} value={qte} onChange={(e) => setQte(+e.target.value)} /></div>
            <div><Label>Prix unitaire</Label><Input type="number" value={prix} onChange={(e) => setPrix(+e.target.value)} /></div>
          </div>
          <p className="text-sm">Total : <strong>{(qte * prix).toLocaleString("fr-FR")} FCFA</strong></p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as SpModePaiement)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as SpVenteStatut)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observations</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving || !acheteur || qte < 1}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
