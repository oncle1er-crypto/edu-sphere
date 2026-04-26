import { Plug, CreditCard, MessageSquare, Calendar, Video, Send, Webhook } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const integrations = [
  { icon: CreditCard, name: "Stripe", desc: "Paiements en ligne par carte bancaire", connected: false, category: "Paiements" },
  { icon: CreditCard, name: "CinetPay", desc: "Paiements Mobile Money Afrique", connected: true, category: "Paiements" },
  { icon: MessageSquare, name: "Twilio", desc: "Envoi de SMS internationaux", connected: false, category: "Communication" },
  { icon: MessageSquare, name: "Africa's Talking", desc: "SMS Afrique à bas coût", connected: true, category: "Communication" },
  { icon: Send, name: "WhatsApp Business", desc: "Messagerie WhatsApp officielle", connected: false, category: "Communication" },
  { icon: Calendar, name: "Google Calendar", desc: "Synchroniser les emplois du temps", connected: false, category: "Productivité" },
  { icon: Video, name: "Zoom", desc: "Cours en ligne intégrés", connected: false, category: "Productivité" },
  { icon: Webhook, name: "Webhooks", desc: "Notifications HTTP personnalisées", connected: false, category: "Développeur" },
];

const categories = Array.from(new Set(integrations.map((i) => i.category)));

export default function IntegrationsSettings() {
  return (
    <SettingsSection
      title="Intégrations & API"
      description="Connectez vos services préférés à la plateforme."
      icon={<Plug className="h-5 w-5" />}
      hideSave
    >
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {integrations.filter((i) => i.category === cat).map((i) => (
              <Card key={i.name} className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <i.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-primary">{i.name}</h3>
                    {i.connected && <Badge className="bg-success text-success-foreground text-[10px]">Connecté</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{i.desc}</p>
                  <Button size="sm" variant={i.connected ? "outline" : "default"} className="mt-2">
                    {i.connected ? "Configurer" : "Connecter"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </SettingsSection>
  );
}
