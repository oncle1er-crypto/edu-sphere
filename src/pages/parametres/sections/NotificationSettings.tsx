import { Bell, Mail, MessageSquare, Smartphone, Send } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const channels = [
  { id: "email", icon: Mail, label: "Email", desc: "Via SMTP intégré", active: true, badge: "Recommandé" },
  { id: "sms", icon: Smartphone, label: "SMS", desc: "Via Twilio / Africa's Talking", active: true },
  { id: "push", icon: Bell, label: "Notifications push", desc: "Application mobile", active: false },
  { id: "whatsapp", icon: Send, label: "WhatsApp", desc: "Via WhatsApp Business API", active: false, badge: "Bientôt" },
  { id: "inapp", icon: MessageSquare, label: "Messagerie interne", desc: "Tableau de bord parents/élèves", active: true },
];

const events = [
  { label: "Inscription d'un nouvel élève", channels: ["Email"] },
  { label: "Paiement reçu", channels: ["Email", "SMS"] },
  { label: "Rappel de paiement (J-3)", channels: ["Email", "SMS"] },
  { label: "Absence de l'élève", channels: ["SMS"] },
  { label: "Bulletin disponible", channels: ["Email"] },
  { label: "Convocation parents", channels: ["Email", "SMS"] },
  { label: "Note publiée", channels: ["Email"] },
  { label: "Annonce générale", channels: ["Email", "Push"] },
];

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Canaux de communication"
        description="Activez les canaux par lesquels vous souhaitez communiquer avec parents et élèves."
        icon={<Bell className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((c) => (
            <Card key={c.id} className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-primary">{c.label}</h3>
                    {c.badge && <Badge variant="secondary" className="text-[10px]">{c.badge}</Badge>}
                  </div>
                  <Switch defaultChecked={c.active} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Configuration SMTP"
        description="Serveur d'envoi des emails."
        icon={<Mail className="h-5 w-5" />}
      >
        <FieldRow label="Adresse expéditeur"><Input defaultValue="no-reply@notre-avenir.cm" /></FieldRow>
        <FieldRow label="Nom expéditeur"><Input defaultValue="École Notre Avenir" /></FieldRow>
        <FieldRow label="Serveur SMTP"><Input defaultValue="smtp.gmail.com" /></FieldRow>
        <FieldRow label="Port"><Input type="number" defaultValue={587} className="w-32" /></FieldRow>
        <FieldRow label="Utilisateur SMTP"><Input defaultValue="contact@notre-avenir.cm" /></FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Événements & déclencheurs"
        description="Choisissez quels événements génèrent une notification automatique."
        icon={<Bell className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg divide-y">
          {events.map((e) => (
            <div key={e.label} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium text-sm">{e.label}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {e.channels.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Heures de silence"
        description="Aucune notification SMS/Push ne sera envoyée pendant ces plages."
        icon={<Bell className="h-5 w-5" />}
      >
        <FieldRow label="De"><Input type="time" defaultValue="21:00" className="w-40" /></FieldRow>
        <FieldRow label="À"><Input type="time" defaultValue="07:00" className="w-40" /></FieldRow>
      </SettingsSection>
    </div>
  );
}
