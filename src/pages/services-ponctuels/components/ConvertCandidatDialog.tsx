import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidatNom: string;
  onConfirm: (classeId: string | null) => Promise<void>;
}

export function ConvertCandidatDialog({ open, onOpenChange, candidatNom, onConfirm }: Props) {
  const { anneeId } = useAnneeId();
  const { classes, loading } = useClasses(anneeId ?? undefined);
  const [classeId, setClasseId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await onConfirm(classeId || null);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir « {candidatNom} » en élève</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Un matricule sera généré automatiquement. Si aucune classe n'est choisie, l'élève sera créé en statut « pré-inscrit ».
          </p>
          <div>
            <Label>Classe d'affectation (optionnel)</Label>
            <Select value={classeId} onValueChange={setClasseId}>
              <SelectTrigger><SelectValue placeholder={loading ? "Chargement…" : "Aucune (pré-inscription)"} /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Conversion…" : "Convertir"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
