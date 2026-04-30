import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Smartphone, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function SmsCampaigns() {
  const [text, setText] = useState("Bonjour {{prenom_parent}}, votre enfant {{prenom_eleve}} est absent aujourd'hui. Merci de justifier.");
  const remaining = 160 - text.length;
  return (
    <SettingsSection
      title="Campagnes SMS"
      description="Envoi de SMS groupés (160 caractères max par message)."
      icon={<Smartphone className="h-5 w-5" />}
      hideSave
    >
      <FieldRow label="Destinataires">
        <Select defaultValue="parents">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parents">Tous les parents</SelectItem>
            <SelectItem value="absents">Parents d'élèves absents</SelectItem>
            <SelectItem value="impayes">Parents avec impayés</SelectItem>
            <SelectItem value="custom">Liste personnalisée</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Message" hint={`${remaining} caractères restants — coût estimé : ${Math.ceil(text.length/160)} SMS × 25 FCFA`}>
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </FieldRow>
      <div className="flex gap-3 border-t pt-4">
        <Button className="gap-2"><Send className="h-4 w-4" /> Envoyer maintenant</Button>
        <Button variant="outline">Programmer</Button>
      </div>
      <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
        Crédit SMS restant : <strong className="text-foreground">12 480</strong> · Renouvellement automatique activé.
      </div>
    </SettingsSection>
  );
}
