import { User, Camera } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserProfile() {
  return (
    <SettingsSection
      title="Mon profil"
      description="Vos informations personnelles."
      icon={<User className="h-5 w-5" />}
    >
      <FieldRow label="Photo de profil">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">CE</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            <Camera className="h-4 w-4" />Changer
          </Button>
        </div>
      </FieldRow>
      <FieldRow label="Nom"><Input defaultValue="Ello" /></FieldRow>
      <FieldRow label="Prénom"><Input defaultValue="Charles Frédéric" /></FieldRow>
      <FieldRow label="Email"><Input type="email" defaultValue="charles@laprovidence.ci" /></FieldRow>
      <FieldRow label="Téléphone"><Input defaultValue="+225 07 07 11 22 33" /></FieldRow>
      <FieldRow label="Fonction"><Input defaultValue="Directeur" /></FieldRow>
      <FieldRow label="Langue préférée">
        <Select defaultValue="fr">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </SettingsSection>
  );
}
