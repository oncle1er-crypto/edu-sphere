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
import { ImportDialog, ImportColumn } from "@/components/ImportDialog";

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "nom", label: "Nom", required: true },
  { key: "prenom", label: "Prénom", required: true },
  { key: "sexe", label: "Sexe" },
  { key: "date_naissance", label: "Date de naissance" },
  { key: "lieu_naissance", label: "Lieu de naissance" },
  { key: "nationalite", label: "Nationalité" },
  { key: "adresse", label: "Adresse" },
  { key: "classe", label: "Classe" },
];

const EXAMPLE_ROWS = [
  { nom: "Diallo", prenom: "Aminata", sexe: "F", date_naissance: "2015-03-12", lieu_naissance: "Abidjan", nationalite: "Ivoirienne", adresse: "Cocody", classe: "6ème A" },
  { nom: "Koné", prenom: "Ibrahim", sexe: "M", date_naissance: "2014-07-25", lieu_naissance: "Bouaké", nationalite: "Ivoirienne", adresse: "Yopougon", classe: "5ème B" },
  { nom: "Touré", prenom: "Fatou", sexe: "F", date_naissance: "2016-01-08", lieu_naissance: "Man", nationalite: "Ivoirienne", adresse: "Plateau", classe: "6ème A" },
];

export default function StudentsRegistration() {
  const { addEleve, ecoleId } = useEleves();
  const { classes } = useClasses();
  const { cycles } = useCycles();
  const { anneeId } = useAnneeId();

  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
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

  const handleImport = async (rows: Record<string, string>[]) => {
    if (!ecoleId) return { success: 0, errors: 0 };
    let success = 0, errors = 0;
    for (const row of rows) {
      if (!row.nom || !row.prenom) { errors++; continue; }
      const classeMatch = row.classe ? classes.find((c) => c.nom.toLowerCase() === row.classe.toLowerCase()) : null;
      const res = await addEleve({
        matricule: generateMatricule(),
        nom: row.nom,
        prenom: row.prenom,
        sexe: (row.sexe === "F" || row.sexe === "M" ? row.sexe : null) as "F" | "M" | null,
        date_naissance: row.date_naissance || null,
        lieu_naissance: row.lieu_naissance || null,
        nationalite: row.nationalite || "Ivoirienne",
        adresse: row.adresse || null,
        classe_id: classeMatch?.id ?? null,
        annee_id: anneeId,
        ecole_id: ecoleId!,
        statut: "inscrit",
      });
      if (res) success++; else errors++;
    }
    return { success, errors };
  };

  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Nouvelle inscription"
      description="Enregistrez un nouvel élève ou importez une liste depuis un fichier CSV."
      onSave={handleSubmit}
    >
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </div>

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

      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import d'élèves"
        columns={IMPORT_COLUMNS}
        exampleRows={EXAMPLE_ROWS}
        exampleFileName="modele_eleves.csv"
        onImport={handleImport}
      />
    </SettingsSection>
  );
}