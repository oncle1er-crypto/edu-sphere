import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { type EleveScolarite } from "../scolarite-data";
import { toast } from "sonner";

interface Props {
  eleve: EleveScolarite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Statut =
  | "en-cours"
  | "promesse"
  | "echeancier"
  | "litige"
  | "transmis-direction"
  | "regle";

const OPTIONS: { value: Statut; label: string; cls: string }[] = [
  { value: "en-cours", label: "Relance en cours", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  { value: "promesse", label: "Promesse de paiement", cls: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  { value: "echeancier", label: "Échéancier négocié", cls: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  { value: "litige", label: "Litige / contestation", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "transmis-direction", label: "Transmis à la Direction", cls: "bg-primary/15 text-primary border-primary/30" },
  { value: "regle", label: "Réglé", cls: "bg-accent/15 text-accent border-accent/30" },
];

export function StatusDialog({ eleve, open, onOpenChange }: Props) {
  const [statut, setStatut] = useState<Statut>("en-cours");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) { setStatut("en-cours"); setNote(""); }
  }, [open]);

  if (!eleve) return null;

  const opt = OPTIONS.find((o) => o.value === statut)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Tag className="h-5 w-5" />Mettre à jour le statut
          </DialogTitle>
          <DialogDescription>
            {eleve.prenom} {eleve.nom} — {eleve.classe}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nouveau statut de recouvrement</Label>
            <Select value={statut} onValueChange={(v) => setStatut(v as Statut)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className={opt.cls}>{opt.label}</Badge>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note (optionnelle)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : promesse de paiement le 15/05, échéancier en 2 versements…"
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => {
            toast.success(`Statut mis à jour : ${opt.label}`, { description: `${eleve.prenom} ${eleve.nom}` });
            onOpenChange(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
