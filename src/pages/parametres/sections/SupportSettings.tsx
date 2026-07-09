import { LifeBuoy, BookOpen, MessageCircle, Bug, Lightbulb, FileCode, Download } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstallPWAButton } from "@/components/pwa/InstallPWAButton";


const helpItems = [
  { icon: BookOpen, title: "Centre d'aide", desc: "Articles et tutoriels pour bien démarrer" },
  { icon: MessageCircle, title: "Contacter le support", desc: "Notre équipe répond en moins de 24h" },
  { icon: Bug, title: "Signaler un bug", desc: "Aidez-nous à améliorer la plateforme" },
  { icon: Lightbulb, title: "Suggérer une amélioration", desc: "Vos idées sont les bienvenues" },
  { icon: FileCode, title: "Documentation API", desc: "Pour les développeurs et intégrateurs" },
];

export default function SupportSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Support & aide"
        description="Nous sommes là pour vous aider à tirer le meilleur de votre plateforme."
        icon={<LifeBuoy className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {helpItems.map((h) => (
            <Card key={h.title} className="p-4 flex items-start gap-3 hover:border-accent/40 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-primary flex items-center justify-center shrink-0">
                <h.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-primary">{h.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{h.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Informations système"
        description="Détails techniques sur votre version."
        icon={<LifeBuoy className="h-5 w-5" />}
        hideSave
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Version</div>
            <div className="font-semibold">1.0.0 <Badge variant="secondary" className="ml-1">stable</Badge></div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Dernière mise à jour</div>
            <div className="font-semibold">24 avril 2026</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Plan d'abonnement</div>
            <div className="font-semibold">Pro <Badge className="ml-1">Actif</Badge></div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Support</div>
            <div className="font-semibold">support@gestion-scolaire.app</div>
          </div>
        </div>
        <Button variant="outline" className="mt-4">Voir le changelog complet</Button>
      </SettingsSection>
    </div>
  );
}
