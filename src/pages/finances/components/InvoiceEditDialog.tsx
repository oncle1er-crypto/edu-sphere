import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/settings/SettingsSection";
import { Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function InvoiceEditDialog({ facture, open, onOpenChange, onSaved }: Props) {
  const [libelle, setLibelle] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (facture) {
      setLibelle(facture.libelle ?? "");
      setDateEcheance(facture.date_echeance ?? "");
    }
  }, [facture?.id]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Pencil className="h-5 w-5" /> Modifier la facture
          </DialogTitle>
          <DialogDescription>{facture.numero}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FieldRow label="Libellé">
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </FieldRow>
          <FieldRow label="Échéance">
            <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
          </FieldRow>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
