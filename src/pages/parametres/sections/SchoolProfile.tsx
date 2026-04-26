import { Building2, Upload } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SchoolProfile() {
  return (
    <SettingsSection
      title="Profil de l'école"
      description="Informations officielles de votre établissement, affichées sur les documents."
      icon={<Building2 className="h-5 w-5" />}
    >
      <FieldRow label="Logo de l'école" hint="PNG ou JPG, 512x512px recommandé">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
          </div>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" /> Téléverser
          </Button>
        </div>
      </FieldRow>

      <FieldRow label="Nom officiel">
        <Input defaultValue="École Notre Avenir" />
      </FieldRow>

      <FieldRow label="Sigle / abréviation">
        <Input defaultValue="ENA" maxLength={10} />
      </FieldRow>

      <FieldRow label="Devise / slogan">
        <Input defaultValue="Une école, un avenir, une réussite" />
      </FieldRow>

      <FieldRow label="Type d'établissement">
        <Select defaultValue="mixte">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="maternelle">Maternelle</SelectItem>
            <SelectItem value="primaire">Primaire</SelectItem>
            <SelectItem value="college">Collège</SelectItem>
            <SelectItem value="lycee">Lycée</SelectItem>
            <SelectItem value="universite">Université</SelectItem>
            <SelectItem value="mixte">Mixte (Maternelle → Lycée)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="N° d'agrément">
        <Input defaultValue="MEN/2018/00457" />
      </FieldRow>

      <FieldRow label="Année de création">
        <Input type="number" defaultValue={2010} className="w-32" />
      </FieldRow>

      <FieldRow label="Adresse complète">
        <Textarea rows={3} defaultValue="123 Avenue de l'Éducation, BP 1234, Yaoundé, Cameroun" />
      </FieldRow>

      <FieldRow label="Téléphone">
        <Input defaultValue="+237 6 99 00 00 00" />
      </FieldRow>

      <FieldRow label="Email">
        <Input type="email" defaultValue="contact@notre-avenir.cm" />
      </FieldRow>

      <FieldRow label="Site web">
        <Input type="url" defaultValue="https://notre-avenir.cm" />
      </FieldRow>

      <FieldRow label="Directeur / Proviseur">
        <Input defaultValue="M. Ello Charles Frédéric" />
      </FieldRow>
    </SettingsSection>
  );
}
