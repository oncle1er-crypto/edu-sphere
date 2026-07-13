import { useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { HelpBanner } from "@/components/help";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Upload, Loader2, Wallet, Clock } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { useAnneeId } from "@/hooks/useAnneeId";
import { toast } from "sonner";
import { ImportDialog, ImportColumn, DedupMode, ImportResult } from "@/components/ImportDialog";
import { supabase } from "@/integrations/supabase/client";
import InscriptionWorkflowDialog from "@/pages/eleves/components/InscriptionWorkflowDialog";


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

const LIEN_OPTIONS = ["père", "mère", "tuteur", "tutrice", "oncle", "tante", "grand-père", "grand-mère", "autre"];

export default function StudentsRegistration() {
  const { activeAnnee } = useAcademicPeriod();
  const { addEleve, ecoleId } = useEleves(activeAnnee.id);
  const { classes } = useClasses(activeAnnee.id);
  const { cycles } = useCycles();
  const { anneeId } = useAnneeId();

  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [createdEleve, setCreatedEleve] = useState<any | null>(null);
  const [showPayPrompt, setShowPayPrompt] = useState(false);
  const [showPayWorkflow, setShowPayWorkflow] = useState(false);

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
    matricule_national: "",
    numero_inscription_en_ligne: "",
    est_nouveau: false,
  });

  const [parent, setParent] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    telephone2: "",
    email: "",
    profession: "",
    lien: "père",
  });

  const set = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));
  const setP = (key: string, value: string) => setParent((p) => ({ ...p, [key]: value }));

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
    const eleve = await addEleve({
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
      statut: "pre_inscrit",
      matricule_national: form.matricule_national || null,
      numero_inscription_en_ligne: form.numero_inscription_en_ligne || null,
      est_nouveau: form.est_nouveau,
    } as any);

    // Créer le parent/tuteur si renseigné
    if (eleve && parent.nom && parent.telephone && ecoleId) {
      const { data: parentData, error: parentErr } = await supabase
        .from("parents")
        .insert({
          ecole_id: ecoleId,
          nom: parent.nom,
          prenom: parent.prenom,
          telephone: parent.telephone,
          telephone2: parent.telephone2 || null,
          email: parent.email || null,
          profession: parent.profession || null,
        })
        .select("id")
        .single();

      if (!parentErr && parentData) {
        await supabase.from("eleve_parents").insert({
          eleve_id: eleve.id,
          parent_id: parentData.id,
          lien: parent.lien,
          est_contact_principal: true,
        });
      }
    }

    setForm({ nom: "", prenom: "", sexe: "", date_naissance: "", lieu_naissance: "", nationalite: "Ivoirienne", adresse: "", classe_id: "", cycle_id: "", matricule_national: "", numero_inscription_en_ligne: "", est_nouveau: false });
    setParent({ nom: "", prenom: "", telephone: "", telephone2: "", email: "", profession: "", lien: "père" });
    setSaving(false);
  };

  const handleImport = async (rows: Record<string, string>[], dedupMode: DedupMode): Promise<ImportResult> => {
    if (!ecoleId) return { success: 0, errors: 0, skipped: 0, updated: 0 };
    let success = 0, errors = 0, skipped = 0, updated = 0;

    const { data: existing } = await supabase
      .from("eleves").select("id, nom, prenom, classe_id").eq("ecole_id", ecoleId);
    const existingMap = new Map(
      (existing ?? []).map((e) => [`${e.nom.toLowerCase()}|${e.prenom.toLowerCase()}|${e.classe_id ?? ""}`, e])
    );

    for (const row of rows) {
      if (!row.nom || !row.prenom) { errors++; continue; }
      const classeMatch = row.classe ? classes.find((c) => c.nom.toLowerCase() === row.classe.toLowerCase()) : null;
      const dedupKey = `${row.nom.toLowerCase()}|${row.prenom.toLowerCase()}|${classeMatch?.id ?? ""}`;
      const dup = existingMap.get(dedupKey);

      if (dup) {
        if (dedupMode === "skip") { skipped++; continue; }
        const { error } = await supabase.from("eleves").update({
          sexe: (row.sexe === "F" || row.sexe === "M" ? row.sexe : undefined) as any,
          date_naissance: row.date_naissance || undefined,
          lieu_naissance: row.lieu_naissance || undefined,
          nationalite: row.nationalite || undefined,
          adresse: row.adresse || undefined,
        }).eq("id", dup.id);
        if (!error) updated++; else errors++;
        continue;
      }

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
        statut: "pre_inscrit",
      });
      if (res) success++; else errors++;
    }
    return { success, errors, skipped, updated };
  };

  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Nouvelle inscription"
      description="Enregistrez un nouvel élève ou importez une liste depuis un fichier CSV."
      onSave={handleSubmit}
    >
      <HelpBanner storageKey="eleves-registration" title="Inscrire un nouvel élève">
        Remplissez les informations de l'élève et de ses parents. L'élève passe en statut <strong>« Pré-inscrit »</strong> ; il deviendra <strong>« Inscrit »</strong> automatiquement quand les <strong>documents obligatoires</strong> seront déposés et qu'un <strong>premier paiement</strong> sera reçu.
      </HelpBanner>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </div>

      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="parent">Parent / Tuteur</TabsTrigger>
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
          <FieldRow label="N° matricule national">
            <Input placeholder="Ex: 2024-CI-0001234" value={form.matricule_national} onChange={(e) => set("matricule_national", e.target.value)} />
          </FieldRow>
          <FieldRow label="N° d'inscription en ligne">
            <Input placeholder="Numéro fourni par la plateforme MENA" value={form.numero_inscription_en_ligne} onChange={(e) => set("numero_inscription_en_ligne", e.target.value)} />
          </FieldRow>
        </TabsContent>

        <TabsContent value="parent" className="space-y-4 mt-4">
          <FieldRow label="Lien de parenté">
            <Select value={parent.lien} onValueChange={(v) => setP("lien", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIEN_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Nom du parent">
            <Input placeholder="Diallo" value={parent.nom} onChange={(e) => setP("nom", e.target.value)} />
          </FieldRow>
          <FieldRow label="Prénom(s)">
            <Input placeholder="Moussa" value={parent.prenom} onChange={(e) => setP("prenom", e.target.value)} />
          </FieldRow>
          <FieldRow label="Téléphone *">
            <Input placeholder="+225 07 XX XX XX XX" value={parent.telephone} onChange={(e) => setP("telephone", e.target.value)} />
          </FieldRow>
          <FieldRow label="Téléphone 2">
            <Input placeholder="+225 05 XX XX XX XX" value={parent.telephone2} onChange={(e) => setP("telephone2", e.target.value)} />
          </FieldRow>
          <FieldRow label="Email">
            <Input type="email" placeholder="parent@email.com" value={parent.email} onChange={(e) => setP("email", e.target.value)} />
          </FieldRow>
          <FieldRow label="Profession">
            <Input placeholder="Commerçant" value={parent.profession} onChange={(e) => setP("profession", e.target.value)} />
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
          {(() => {
            const cl = classes.find((c) => c.id === form.classe_id);
            const isGS = !!cl && /GS|GRANDE\s*SEC/i.test(cl.nom);
            if (!isGS) return null;
            return (
              <FieldRow label="Nouvel élève (1ère inscription)" hint="Détermine le tarif appliqué pour la Grande Section.">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.est_nouveau}
                    onChange={(e) => set("est_nouveau", e.target.checked)}
                  />
                  <span className="text-sm">Oui, premier passage en GS</span>
                </label>
              </FieldRow>
            );
          })()}
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
        dedupDescription="nom + prénom + classe"
      />
    </SettingsSection>
  );
}
