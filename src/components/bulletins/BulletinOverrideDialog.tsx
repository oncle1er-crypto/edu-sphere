import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ecoleId: string;
  anneeId: string;
  periodeId: string;
  classeId: string;
  eleveId: string;
  eleveLabel: string;
  initial: {
    moyenne: number;
    rang: number;
    mention: string;
    appreciation_generale: string;
    decision_conseil: string;
    decision_detail: string;
  };
  onSaved?: (auditId: string) => void;
}

const DECISIONS = [
  "Admis(e) en classe supérieure",
  "Admis(e) avec félicitations",
  "Doit redoubler",
  "Renvoi disciplinaire",
  "À examiner par le conseil",
];

export function BulletinOverrideDialog(props: Props) {
  const { open, onOpenChange, ecoleId, anneeId, periodeId, classeId, eleveId, eleveLabel, initial, onSaved } = props;
  const [appreciation, setAppreciation] = useState("");
  const [decision, setDecision] = useState("");
  const [detail, setDetail] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAppreciation(initial.appreciation_generale ?? "");
      setDecision(initial.decision_conseil ?? "");
      setDetail(initial.decision_detail ?? "");
      setMotif("");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (motif.trim().length < 5) { toast.error("Motif obligatoire (5 caractères minimum)."); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("upsert_bulletin_audit", {
      _ecole_id: ecoleId, _annee_id: anneeId, _periode_id: periodeId,
      _classe_id: classeId, _eleve_id: eleveId,
      _moyenne: initial.moyenne, _rang: initial.rang, _mention: initial.mention,
      _appreciation_generale: appreciation,
      _decision_conseil: decision,
      _decision_detail: detail,
      _override_motif: motif,
    });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Override enregistré dans l'audit.");
    onSaved?.(data as unknown as string);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Override conseil de classe — {eleveLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Appréciation générale</Label>
            <Textarea rows={3} value={appreciation} onChange={(e) => setAppreciation(e.target.value)}
              placeholder="Appréciation du conseil de classe..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Décision du conseil</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger><SelectValue placeholder="Choisir une décision" /></SelectTrigger>
                <SelectContent>
                  {DECISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Détail / classe d'orientation</Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex : Passe en 5e A" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Motif de l'override <span className="text-destructive">*</span></Label>
            <Textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)}
              placeholder="Justification — sera enregistrée dans l'audit." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
