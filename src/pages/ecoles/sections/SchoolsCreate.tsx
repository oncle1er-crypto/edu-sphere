import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEcoles, type Ecole } from "@/context/EcoleContext";
import { toast } from "sonner";

type FormState = Omit<Ecole, "ecole_id" | "date_creation" | "status" | "effectif_eleves" | "effectif_enseignants" | "nb_classes" | "revenu_mensuel">;

const empty: FormState = {
  nom: "", code: "", ville: "", pays: "Sénégal", adresse: "",
  telephone: "", email: "", directeur: "", type: "Primaire",
};

export default function SchoolsCreate() {
  const { createEcole, setCurrentEcoleId } = useEcoles();
  const [form, setForm] = useState<FormState>(empty);
  const navigate = useNavigate();

  const update = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.code || !form.ville) {
      toast.error("Renseigne au minimum le nom, le code et la ville.");
      return;
    }
    const ecole = await createEcole(form);
    if (!ecole) return;
    setCurrentEcoleId(ecole.ecole_id);
    toast.success(`École créée — tenant ${ecole.ecole_id}`);
    setForm(empty);
    navigate("/ecoles/liste");
  };

  return (
    <SettingsSection
      title="Créer une école"
      description="Une nouvelle école génère un identifiant ecole_id unique pour l'isolation des données."
      icon={<PlusCircle className="h-5 w-5" />}
      hideSave
    >
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Nom de l'école *</Label>
          <Input value={form.nom} onChange={(e) => update("nom", e.target.value)} placeholder="Ex. Complexe scolaire La Providence de Don Orione" />
        </div>
        <div>
          <Label>Code unique *</Label>
          <Input value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="GSL-001" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["Maternelle", "Primaire", "Collège", "Lycée", "Groupe scolaire"] as const).map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Directeur / Directrice</Label>
          <Input value={form.directeur} onChange={(e) => update("directeur", e.target.value)} />
        </div>
        <div>
          <Label>Ville *</Label>
          <Input value={form.ville} onChange={(e) => update("ville", e.target.value)} />
        </div>
        <div>
          <Label>Pays</Label>
          <Input value={form.pays} onChange={(e) => update("pays", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Adresse</Label>
          <Input value={form.adresse} onChange={(e) => update("adresse", e.target.value)} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={form.telephone} onChange={(e) => update("telephone", e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setForm(empty)}>Réinitialiser</Button>
          <Button type="submit">Créer l'école</Button>
        </div>
      </form>
    </SettingsSection>
  );
}
