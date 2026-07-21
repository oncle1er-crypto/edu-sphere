import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Salle } from "@/hooks/useSalles";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  salle?: Salle | null;
  onSubmit: (data: Partial<Salle>) => Promise<any>;
}

const TYPES = ["Salle de classe", "Laboratoire", "Salle informatique", "Bibliothèque", "Amphithéâtre", "Salle de sport", "Autre"];
const STATUTS = ["disponible", "occupee", "maintenance", "indisponible"];

export function SallesDialog({ open, onOpenChange, salle, onSubmit }: Props) {
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("Salle de classe");
  const [capacite, setCapacite] = useState(30);
  const [batiment, setBatiment] = useState("");
  const [etage, setEtage] = useState("");
  const [equipements, setEquipements] = useState("");
  const [statut, setStatut] = useState("disponible");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(salle?.code ?? "");
      setNom(salle?.nom ?? "");
      setType(salle?.type ?? "Salle de classe");
      setCapacite(salle?.capacite ?? 30);
      setBatiment(salle?.batiment ?? "");
      setEtage(salle?.etage ?? "");
      setEquipements((salle?.equipements ?? []).join(", "));
      setStatut(salle?.statut ?? "disponible");
      setNotes(salle?.notes ?? "");
    }
  }, [open, salle]);

  const handleSave = async () => {
    if (!code.trim()) return;
    setSaving(true);
    const res = await onSubmit({
      code: code.trim(),
      nom: nom.trim() || null,
      type,
      capacite: Number(capacite) || 0,
      batiment: batiment.trim() || null,
      etage: etage.trim() || null,
      equipements: equipements.split(",").map((e) => e.trim()).filter(Boolean),
      statut,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (res) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{salle ? "Modifier la salle" : "Nouvelle salle"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A101" />
          </div>
          <div>
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Salle Sainte-Marie" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Capacité</Label>
            <Input type="number" min={0} value={capacite} onChange={(e) => setCapacite(Number(e.target.value))} />
          </div>
          <div>
            <Label>Bâtiment</Label>
            <Input value={batiment} onChange={(e) => setBatiment(e.target.value)} placeholder="A" />
          </div>
          <div>
            <Label>Étage</Label>
            <Input value={etage} onChange={(e) => setEtage(e.target.value)} placeholder="RDC / 1er" />
          </div>
          <div className="col-span-2">
            <Label>Équipements (séparés par virgule)</Label>
            <Input value={equipements} onChange={(e) => setEquipements(e.target.value)} placeholder="Tableau, Vidéoprojecteur" />
          </div>
          <div className="col-span-2">
            <Label>Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !code.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
