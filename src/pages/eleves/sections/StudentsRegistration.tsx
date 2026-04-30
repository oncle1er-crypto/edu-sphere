import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Upload } from "lucide-react";

export default function StudentsRegistration() {
  return (
    <SettingsSection
      icon={<UserPlus className="h-5 w-5" />}
      title="Nouvelle inscription"
      description="Enregistrez un nouvel élève avec ses informations personnelles, familiales et scolaires."
    >
      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="famille">Famille / Tuteur</TabsTrigger>
          <TabsTrigger value="scolarite">Scolarité</TabsTrigger>
          <TabsTrigger value="medical">Médical</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="identite" className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
              Photo
            </div>
            <Button variant="outline" size="sm"><Upload className="h-4 w-4" />Téléverser</Button>
          </div>

          <FieldRow label="Nom"><Input placeholder="Diallo" /></FieldRow>
          <FieldRow label="Prénom(s)"><Input placeholder="Aminata" /></FieldRow>
          <FieldRow label="Sexe">
            <Select><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Féminin</SelectItem>
                <SelectItem value="M">Masculin</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Date de naissance"><Input type="date" /></FieldRow>
          <FieldRow label="Lieu de naissance"><Input placeholder="Bamako" /></FieldRow>
          <FieldRow label="Nationalité"><Input placeholder="Malienne" /></FieldRow>
          <FieldRow label="Adresse" hint="Domicile actuel"><Textarea rows={2} /></FieldRow>
        </TabsContent>

        <TabsContent value="famille" className="space-y-4 mt-4">
          <FieldRow label="Nom du père"><Input /></FieldRow>
          <FieldRow label="Profession du père"><Input /></FieldRow>
          <FieldRow label="Téléphone père"><Input type="tel" /></FieldRow>
          <FieldRow label="Nom de la mère"><Input /></FieldRow>
          <FieldRow label="Profession de la mère"><Input /></FieldRow>
          <FieldRow label="Téléphone mère"><Input type="tel" /></FieldRow>
          <FieldRow label="Tuteur légal" hint="Si différent des parents"><Input /></FieldRow>
          <FieldRow label="Email parent / tuteur"><Input type="email" /></FieldRow>
          <FieldRow label="Frère / sœur dans l'école" hint="Permet une remise éventuelle">
            <Switch />
          </FieldRow>
        </TabsContent>

        <TabsContent value="scolarite" className="space-y-4 mt-4">
          <FieldRow label="Année scolaire">
            <Select defaultValue="2025-2026"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-2026">2025 - 2026</SelectItem>
                <SelectItem value="2026-2027">2026 - 2027</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Cycle">
            <Select><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mat">Maternelle</SelectItem>
                <SelectItem value="prim">Primaire</SelectItem>
                <SelectItem value="col">Collège</SelectItem>
                <SelectItem value="lyc">Lycée</SelectItem>
                <SelectItem value="uni">Université</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Classe d'affectation">
            <Select><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6a">6ème A</SelectItem>
                <SelectItem value="6b">6ème B</SelectItem>
                <SelectItem value="cm2">CM2</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="École précédente"><Input /></FieldRow>
          <FieldRow label="Dernière classe suivie"><Input placeholder="CM2" /></FieldRow>
          <FieldRow label="Régime"><Select defaultValue="ext"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ext">Externe</SelectItem>
              <SelectItem value="dp">Demi-pensionnaire</SelectItem>
              <SelectItem value="int">Interne</SelectItem>
            </SelectContent>
          </Select></FieldRow>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4 mt-4">
          <FieldRow label="Groupe sanguin">
            <Select><SelectTrigger className="w-32"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Allergies connues"><Textarea rows={2} placeholder="Aucune" /></FieldRow>
          <FieldRow label="Maladies chroniques"><Textarea rows={2} /></FieldRow>
          <FieldRow label="Traitement en cours"><Textarea rows={2} /></FieldRow>
          <FieldRow label="Contact d'urgence"><Input placeholder="Nom + téléphone" /></FieldRow>
          <FieldRow label="Carnet de vaccination à jour"><Switch defaultChecked /></FieldRow>
        </TabsContent>

        <TabsContent value="documents" className="space-y-3 mt-4">
          {[
            "Acte de naissance",
            "Photo d'identité",
            "Bulletin de l'année précédente",
            "Certificat de transfert",
            "Carnet de vaccination",
            "Pièce d'identité du tuteur",
          ].map((doc) => (
            <div key={doc} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{doc}</p>
                <p className="text-[11px] text-muted-foreground">PDF, JPG ou PNG — max 5 Mo</p>
              </div>
              <Button variant="outline" size="sm"><Upload className="h-4 w-4" />Téléverser</Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
}
