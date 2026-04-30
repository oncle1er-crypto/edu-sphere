import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LibrarySearch() {
  return (
    <SettingsSection
      title="Recherche avancée"
      description="Cherchez dans le catalogue par plusieurs critères."
      icon={<Search className="h-5 w-5" />}
      hideSave
    >
      <FieldRow label="Titre"><Input placeholder="Mots-clés du titre..." /></FieldRow>
      <FieldRow label="Auteur"><Input placeholder="Nom de l'auteur..." /></FieldRow>
      <FieldRow label="ISBN"><Input placeholder="ex. 978-2-07-040850-4" /></FieldRow>
      <FieldRow label="Catégorie">
        <Select defaultValue="all">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="roman">Roman</SelectItem>
            <SelectItem value="manuel">Manuel scolaire</SelectItem>
            <SelectItem value="sciences">Sciences</SelectItem>
            <SelectItem value="jeunesse">Jeunesse</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Disponibilité">
        <Select defaultValue="dispo">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="dispo">Disponibles uniquement</SelectItem>
            <SelectItem value="emprunte">Empruntés uniquement</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="flex gap-3 border-t pt-4">
        <Button>Lancer la recherche</Button>
        <Button variant="outline">Réinitialiser</Button>
      </div>
    </SettingsSection>
  );
}
