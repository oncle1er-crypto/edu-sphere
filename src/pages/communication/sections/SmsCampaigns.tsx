import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { HelpBanner } from "@/components/help";
import { Smartphone, Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useSmsConfig } from "@/hooks/useSmsConfig";
import { toast } from "sonner";

export default function SmsCampaigns() {
  const { config, sendSms } = useSmsConfig();
  const [text, setText] = useState("Bonjour {{prenom_parent}}, votre enfant {{prenom_eleve}} est absent aujourd'hui. Merci de justifier.");
  const [sending, setSending] = useState(false);
  const remaining = 160 - text.length;

  const isReady = config?.is_active && !!config?.has_api_token;

  const handleSend = async () => {
    // For now, placeholder: in real usage, destinataires come from the selected group
    toast.info("Sélection des destinataires en cours de développement. Utilisez les relances de scolarité pour l'envoi ciblé.");
  };

  return (
    <SettingsSection
      title="Campagnes SMS"
      description={
        isReady
          ? "Envoi de SMS groupés via YellikaSMS (160 caractères max par message)."
          : "⚠️ Configurez d'abord YellikaSMS dans Paramètres → SMS pour activer l'envoi."
      }
      icon={<Smartphone className="h-5 w-5" />}
      hideSave
    >
      <HelpBanner storageKey="sms-campaigns" title="Envoyer une campagne SMS">
        1. Choisissez les <strong>destinataires</strong> (classe, liste, tous les parents). 2. Rédigez le message (160 caractères = 1 SMS). 3. Envoyez immédiatement ou planifiez l'envoi. Le coût est déduit de votre crédit YellikaSMS.
      </HelpBanner>
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
      <FieldRow label="Message" hint={`${remaining} caractères restants — coût estimé : ${Math.ceil(text.length / 160)} SMS × ${config?.cout_unitaire ?? 25} FCFA`}>
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </FieldRow>
      <div className="flex gap-3 border-t pt-4">
        <Button className="gap-2" onClick={handleSend} disabled={!isReady || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer maintenant
        </Button>
        <Button variant="outline" disabled={!isReady}>Programmer</Button>
      </div>
      <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
        Fournisseur : <strong className="text-foreground">YellikaSMS</strong> ·
        Statut : {isReady ? (
          <strong className="text-emerald-600">Connecté ✓</strong>
        ) : (
          <strong className="text-destructive">Non configuré</strong>
        )}
      </div>
    </SettingsSection>
  );
}
