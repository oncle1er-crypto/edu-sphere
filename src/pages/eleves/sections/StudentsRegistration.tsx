import { useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Upload, Loader2 } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";

export default function StudentsRegistration() {
  const { addEleve, ecoleId } = useEleves();
  const { classes } = useClasses();
  const { cycles } = useCycles();
  const { anneeId } = useAnneeId();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    sexe: "" as "" | "F" | "M",
    date_naissance: "",
    lieu_naissance: "",
    nationalite: "Ivoirienne",
    adresse: "",
    classe_id: "",
    cycle_id: "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const filteredClasses = form.cycle_id
    ? classes.filter((c) => c.cycle_id === form.cycle_id)
    : classes;

  const generateMatricule = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ELV-${year}${rand}`;
  };

  const handleSubmit = async () => {
    if (!form.nom || !form.prenom) {
      toast.error("Nom et prénom sont obligatoires");
      return;
    }
    setSaving(true);
    await addEleve({
      matricule: generateMatricule(),
      nom: form.nom,
      prenom: form.prenom,
      sexe: (form.sexe || null) as "F" | "M" | null,
      date_naissance: form.date_naissance || null,
      lieu_naissance: form.lieu_naissance || null,
      nationalite: form.nationalite || null,
      adresse: form.adresse || null,
      classe_id: form.classe_id || null,
      annee_id: anneeId,
      ecole_id: ecoleId!,
      statut: "inscrit",
    });
    setForm({ nom: "", prenom: "", sexe: "", date_naissance: "", lieu_naissance: "", nationalite: "Ivoirienne", adresse: "", classe_id: "", cycle_id: "" });
    setSaving(false);
  };

  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Nouvelle inscription"
      description="Enregistrez un nouvel élève avec ses informations personnelles et scolaires."
      onSave={handleSubmit}
      saveLabel={saving ? "Enregistrement..." : "Inscrire l'élève"}
    >
      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="scolarite">Scolarité</TabsTrigger>
        </TabsList>

        <TabsContent value="identite" className="space-y-4 mt-4">
          <FieldRow label="Nom *">
            <Input placeholder="Diallo" value={form.nom} onChange={(e) => set("nom", e.target.value)} />
          </FieldRow>
          <FieldRow label="Prénom(s) *">
            <Input placeholder="Aminata" value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
          </FieldRow>
          <FieldRow label="Sexe">
            <Select value={form.sexe} onValueChange={(v) => set("sexe", v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Féminin</SelectItem>
                <SelectItem value="M">Masculin</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Date de naissance">
            <Input type="date" value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} />
          </FieldRow>
          <FieldRow label="Lieu de naissance">
            <Input placeholder="Abidjan" value={form.lieu_naissance} onChange={(e) => set("lieu_naissance", e.target.value)} />
          </FieldRow>
          <FieldRow label="Nationalité">
            <Input placeholder="Ivoirienne" value={form.nationalite} onChange={(e) => set("nationalite", e.target.value)} />
          </FieldRow>
          <FieldRow label="Adresse">
            <Textarea rows={2} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
          </FieldRow>
        </TabsContent>

        <TabsContent value="scolarite" className="space-y-4 mt-4">
          <FieldRow label="Cycle">
            <Select value={form.cycle_id} onValueChange={(v) => { set("cycle_id", v); set("classe_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Classe d'affectation">
            <Select value={form.classe_id} onValueChange={(v) => set("classe_id", v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
}
