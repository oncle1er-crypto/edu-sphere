import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export interface AbonnementResiliable {
  id: string;
  eleve_nom: string;
}

interface Props {
  abonnement: AbonnementResiliable | null;
  service: "cantine" | "transport";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}

/**
 * Arrêt d'un abonnement en cours d'année.
 * Les sommes déjà échues restent dues ; seules les échéances futures non payées
 * sont annulées (résiliation) ou simplement gelées (suspension).
 */
export function ResilierAbonnementDialog({ abonnement, service, open, onOpenChange, onDone }: Props) {
  const [statut, setStatut] = useState<"resilie" | "suspendu">("resilie");
  const [dateEffet, setDateEffet] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!abonnement) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("resilier_abonnement_service", {
      _abonnement_id: abonnement.id,
      _service_type: service,
      _date_effet: dateEffet,
      _motif: motif.trim() || null,
      _statut: statut,
    });
    setSaving(false);
    if (error) { toast.error(messageErreurBase(error)); return; }
    const annulees = Number(data?.factures_annulees ?? 0);
    toast.success(
      statut === "resilie"
        ? `Abonnement résilié${annulees > 0 ? ` — ${annulees} facture(s) à venir annulée(s)` : ""}`
        : "Abonnement suspendu",
    );
    onOpenChange(false);
    setMotif("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Arrêter l'abonnement {service === "cantine" ? "cantine" : "transport"}
          </DialogTitle>
          <DialogDescription>
            {abonnement?.eleve_nom} — les montants déjà échus restent dus. Les factures non échues et non payées
            seront annulées en cas de résiliation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FieldRow label="Type d'arrêt">
            <Select value={statut} onValueChange={(v) => setStatut(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resilie">Résiliation définitive (arrêt du service)</SelectItem>
                <SelectItem value="suspendu">Suspension temporaire (reprise possible)</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Date d'effet">
            <Input type="date" value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} />
          </FieldRow>
          <FieldRow label="Motif">
            <Textarea rows={2} placeholder="Déménagement, changement d'organisation familiale…" value={motif} onChange={(e) => setMotif(e.target.value)} />
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResilierAbonnementDialog;
