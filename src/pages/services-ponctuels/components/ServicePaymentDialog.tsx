import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSpServices } from "../hooks/useSpServices";
import { useSpPaiements, type SpPaiement } from "../hooks/useSpPaiements";
import type { SpModePaiement } from "../hooks/useSpVentes";
import { toast } from "sonner";

const MODES: SpModePaiement[] = ["especes", "wave", "orange_money", "mtn_money", "moov_money", "virement", "cheque"];
const MODE_LABEL: Record<SpModePaiement, string> = {
  especes: "Espèces", wave: "Wave", orange_money: "Orange Money",
  mtn_money: "MTN Money", moov_money: "Moov Money", virement: "Virement", cheque: "Chèque",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: {
    service_id?: string;
    beneficiaire_type?: "eleve" | "candidat" | "libre";
    eleve_id?: string | null;
    candidat_id?: string | null;
    beneficiaire_libre?: string;
  };
  onSuccess?: (p: SpPaiement) => void;
}

export function ServicePaymentDialog({ open, onOpenChange, preset, onSuccess }: Props) {
  const { services } = useSpServices();
  const { save } = useSpPaiements();
  const [serviceId, setServiceId] = useState<string>("");
  const [type, setType] = useState<"eleve" | "candidat" | "libre">("libre");
  const [libre, setLibre] = useState("");
  const [qte, setQte] = useState(1);
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [montantPaye, setMontantPaye] = useState(0);
  const [remise, setRemise] = useState(0);
  const [mode, setMode] = useState<SpModePaiement>("especes");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const montantDu = Math.max(0, qte) * Math.max(0, prixUnitaire);

  useEffect(() => {
    if (!open) return;
    setServiceId(preset?.service_id ?? "");
    setType(preset?.beneficiaire_type ?? "libre");
    setLibre(preset?.beneficiaire_libre ?? "");
    setQte(1);
    setRemise(0);
    setObs("");
  }, [open, preset]);

  useEffect(() => {
    if (service) {
      setPrixUnitaire(Number(service.prix));
      setMontantPaye(Number(service.prix));
      setQte(1);
    }
  }, [serviceId]); // eslint-disable-line

  // Le montant payé suit le total tant que l'utilisateur n'a pas saisi de partiel
  useEffect(() => {
    setMontantPaye(montantDu);
  }, [montantDu]);

  const reste = Math.max(0, montantDu - montantPaye - remise);

  const submit = async () => {
    if (!serviceId) return toast.error("Sélectionnez un service");
    if (!service?.accepte_partiel && montantPaye + remise < montantDu) {
      return toast.error("Ce service n'accepte pas les paiements partiels");
    }
    if (type === "libre" && !libre.trim()) return toast.error("Nom du bénéficiaire requis");
    setSaving(true);
    const p = await save({
      service_id: serviceId,
      beneficiaire_type: type,
      eleve_id: preset?.eleve_id ?? null,
      candidat_id: preset?.candidat_id ?? null,
      beneficiaire_libre: type === "libre" ? libre : null,
      montant_du: montantDu,
      montant_paye: montantPaye,
      remise,
      mode_paiement: mode,
      observations: obs || null,
    });
    setSaving(false);
    if (p) { onSuccess?.(p); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Encaisser un paiement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Choisir un service" /></SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.actif).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!preset?.eleve_id && !preset?.candidat_id && (
            <div>
              <Label>Bénéficiaire (nom libre)</Label>
              <Input value={libre} onChange={(e) => setLibre(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantité</Label><Input type="number" min={1} value={qte} onChange={(e) => setQte(Math.max(1, +e.target.value || 1))} /></div>
            <div><Label>Prix unitaire</Label><Input type="number" min={0} value={prixUnitaire} onChange={(e) => setPrixUnitaire(+e.target.value)} /></div>
          </div>
          <p className="text-sm">Montant dû : <strong>{montantDu.toLocaleString("fr-FR")} FCFA</strong> <span className="text-xs text-muted-foreground">({qte} × {prixUnitaire.toLocaleString("fr-FR")})</span></p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Payé</Label><Input type="number" value={montantPaye} onChange={(e) => setMontantPaye(+e.target.value)} /></div>
            <div><Label>Remise</Label><Input type="number" value={remise} onChange={(e) => setRemise(+e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Reste : {reste.toLocaleString("fr-FR")} FCFA</p>

          <div>
            <Label>Mode de paiement</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as SpModePaiement)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{MODE_LABEL[m]}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label>Observations</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Encaisser"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
