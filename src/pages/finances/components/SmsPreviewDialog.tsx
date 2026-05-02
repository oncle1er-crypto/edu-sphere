import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, Settings2 } from "lucide-react";
import { type EleveScolarite } from "../scolarite-data";
import { useRelances } from "@/hooks/useRelances";
import {
  useSmsTemplates, pickTrancheCible, renderTemplate, updateTemplate,
  TEMPLATE_VARIABLES, type TrancheKey,
} from "../sms-templates-store";
import { toast } from "sonner";

interface Props {
  eleve: EleveScolarite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTemplate?: TrancheKey;
}

export function SmsPreviewDialog({ eleve, open, onOpenChange, defaultTemplate }: Props) {
  const templates = useSmsTemplates();
  const { addRelance } = useRelances();
  const [templateKey, setTemplateKey] = useState<TrancheKey>("GENERIC");
  const [editedMessage, setEditedMessage] = useState("");
  const [editTemplate, setEditTemplate] = useState(false);

  useEffect(() => {
    if (!open || !eleve) return;
    const cible = defaultTemplate ?? pickTrancheCible(eleve).key;
    setTemplateKey(cible);
    const t = eleve.tranches.find((x) => `T${x.num}` === cible);
    setEditedMessage(renderTemplate(templates[cible].message, eleve, t));
    setEditTemplate(false);
  }, [open, eleve, defaultTemplate]); // eslint-disable-line

  const targetTranche = useMemo(() => {
    if (!eleve) return undefined;
    return eleve.tranches.find((x) => `T${x.num}` === templateKey);
  }, [eleve, templateKey]);

  const onChangeTemplate = (k: TrancheKey) => {
    setTemplateKey(k);
    if (eleve) {
      const t = eleve.tranches.find((x) => `T${x.num}` === k);
      setEditedMessage(renderTemplate(templates[k].message, eleve, t));
    }
  };

  if (!eleve) return null;

  const handleSend = async () => {
    await addRelance({
      eleveId: eleve.id,
      canal: "SMS",
      message: editedMessage,
      destinataire: eleve.telephone,
    });
    toast.success(`SMS envoyé à ${eleve.parent}`, { description: eleve.telephone });
    onOpenChange(false);
  };

  const handleSaveTemplate = () => {
    updateTemplate(templateKey, editedMessage);
    toast.success(`Modèle ${templates[templateKey].label} mis à jour`);
    setEditTemplate(false);
    const t = eleve.tranches.find((x) => `T${x.num}` === templateKey);
    setEditedMessage(renderTemplate(editedMessage, eleve, t));
  };

  const charCount = editedMessage.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <MessageSquare className="h-5 w-5" />Aperçu du SMS de relance
          </DialogTitle>
          <DialogDescription>
            Destinataire : <span className="font-semibold">{eleve.parent}</span> — {eleve.telephone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Modèle utilisé</Label>
            <Select value={templateKey} onValueChange={(v) => onChangeTemplate(v as TrancheKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(templates) as TrancheKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{templates[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Aperçu</p>
                  <Textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="min-h-[110px] text-sm bg-background"
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>{charCount} car. · {smsCount} SMS</span>
                    {targetTranche && <Badge variant="outline" className="text-[10px]">Tranche T{targetTranche.num} · {targetTranche.echeance}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!editTemplate ? (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditTemplate(true)}>
              <Settings2 className="h-3.5 w-3.5" />Modifier le modèle « {templates[templateKey].label} »
            </Button>
          ) : (
            <Card className="border bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  💡 Le texte ci-dessus contient déjà les valeurs réelles. Cliquez sur « Sauvegarder le modèle »
                  pour remplacer le modèle (utilisez les variables ci-dessous pour le rendre réutilisable).
                </p>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setEditedMessage((m) => m + " " + v.key)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-background border hover:bg-primary hover:text-primary-foreground transition"
                      title={v.desc}
                    >{v.key}</button>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={handleSaveTemplate}>
                  Sauvegarder comme nouveau modèle
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" />Envoyer le SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
