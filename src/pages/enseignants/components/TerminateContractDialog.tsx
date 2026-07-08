import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (motif: string, date: string) => Promise<any>;
}

export function TerminateContractDialog({ open, onOpenChange, onConfirm }: Props) {
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (motif.trim().length < 5) return;
    setSaving(true);
    const ok = await onConfirm(motif, date);
    setSaving(false);
    if (ok) {
      setMotif("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résilier le contrat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date de rupture</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Motif (obligatoire, min. 5 caractères)</Label>
            <Textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif de la rupture…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="destructive" onClick={handle} disabled={saving || motif.trim().length < 5}>
            Confirmer la rupture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
