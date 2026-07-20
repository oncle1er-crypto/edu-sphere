import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SpCandidat, SpCandidatStatut } from "../hooks/useSpCandidats";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<SpCandidat>;
  onSubmit: (p: Partial<SpCandidat>) => Promise<void>;
}

const STATUTS: SpCandidatStatut[] = ["en_attente", "programme", "absent", "present", "admis", "refuse"];

export function CandidatFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [form, setForm] = useState<Partial<SpCandidat>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial, open]);

  const update = (k: keyof SpCandidat, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Modifier le candidat" : "Nouveau candidat"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom *</Label><Input value={form.nom ?? ""} onChange={(e) => update("nom", e.target.value)} /></div>
          <div><Label>Prénoms *</Label><Input value={form.prenom ?? ""} onChange={(e) => update("prenom", e.target.value)} /></div>
          <div>
            <Label>Sexe</Label>
            <Select value={form.sexe ?? ""} onValueChange={(v) => update("sexe", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date de naissance</Label><Input type="date" value={form.date_naissance ?? ""} onChange={(e) => update("date_naissance", e.target.value)} /></div>
          <div><Label>Classe demandée</Label><Input value={form.classe_demandee ?? ""} onChange={(e) => update("classe_demandee", e.target.value)} /></div>
          <div><Label>École d'origine</Label><Input value={form.ecole_origine ?? ""} onChange={(e) => update("ecole_origine", e.target.value)} /></div>
          <div><Label>Parent</Label><Input value={form.parent ?? ""} onChange={(e) => update("parent", e.target.value)} /></div>
          <div><Label>Téléphone</Label><Input value={form.telephone ?? ""} onChange={(e) => update("telephone", e.target.value)} /></div>
          <div><Label>Date du test</Label><Input type="datetime-local" value={form.date_test ? form.date_test.slice(0, 16) : ""} onChange={(e) => update("date_test", e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
          <div>
            <Label>Statut</Label>
            <Select value={form.statut ?? "en_attente"} onValueChange={(v) => update("statut", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.observations ?? ""} onChange={(e) => update("observations", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!form.nom || !form.prenom}
            onClick={async () => { await onSubmit(form); onOpenChange(false); }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
