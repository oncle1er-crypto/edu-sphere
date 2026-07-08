import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContratEnseignant, ContratInsert, ContratType } from "@/hooks/useContratsEnseignants";

interface Enseignant { id: string; nom: string; prenom: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enseignants: Enseignant[];
  initial?: ContratEnseignant | null;
  onSubmit: (values: ContratInsert) => Promise<any>;
}

const emptyValues = (): ContratInsert => ({
  enseignant_id: "",
  parent_contrat_id: null,
  type: "CDD",
  statut: "actif",
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: null,
  periode_essai_fin: null,
  preavis_jours: 30,
  quotite: 100,
  salaire_base: 0,
  primes: [],
  motif_rupture: null,
  date_rupture: null,
  signe_le: null,
  notes: null,
});

export function ContractFormDialog({ open, onOpenChange, enseignants, initial, onSubmit }: Props) {
  const [values, setValues] = useState<ContratInsert>(emptyValues());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial ? { ...(initial as any) } : emptyValues());
    }
  }, [open, initial]);

  const setField = <K extends keyof ContratInsert>(k: K, v: ContratInsert[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!values.enseignant_id) return;
    setSaving(true);
    const r = await onSubmit(values);
    setSaving(false);
    if (r) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le contrat" : "Nouveau contrat"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Enseignant</Label>
            <Select value={values.enseignant_id} onValueChange={(v) => setField("enseignant_id", v)} disabled={!!initial}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {enseignants.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Type</Label>
            <Select value={values.type} onValueChange={(v) => setField("type", v as ContratType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="CDD">CDD</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Statut</Label>
            <Select value={values.statut} onValueChange={(v) => setField("statut", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date de début</Label>
            <Input type="date" value={values.date_debut} onChange={(e) => setField("date_debut", e.target.value)} />
          </div>

          <div>
            <Label>Date de fin {values.type === "CDI" && <span className="text-xs text-muted-foreground">(optionnelle)</span>}</Label>
            <Input type="date" value={values.date_fin ?? ""} onChange={(e) => setField("date_fin", e.target.value || null)} />
          </div>

          <div>
            <Label>Fin de période d'essai</Label>
            <Input type="date" value={values.periode_essai_fin ?? ""} onChange={(e) => setField("periode_essai_fin", e.target.value || null)} />
          </div>

          <div>
            <Label>Préavis (jours)</Label>
            <Input type="number" min={0} value={values.preavis_jours ?? 0} onChange={(e) => setField("preavis_jours", Number(e.target.value))} />
          </div>

          <div>
            <Label>Quotité (%)</Label>
            <Input type="number" min={1} max={100} value={values.quotite} onChange={(e) => setField("quotite", Number(e.target.value))} />
          </div>

          <div>
            <Label>Salaire de base (FCFA)</Label>
            <Input type="number" min={0} value={values.salaire_base} onChange={(e) => setField("salaire_base", Number(e.target.value))} />
          </div>

          <div>
            <Label>Signé le</Label>
            <Input type="date" value={values.signe_le ?? ""} onChange={(e) => setField("signe_le", e.target.value || null)} />
          </div>

          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={values.notes ?? ""} onChange={(e) => setField("notes", e.target.value || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !values.enseignant_id}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
