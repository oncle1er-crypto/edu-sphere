import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, Mail, Smartphone, Bell, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";

const kpis = [
  { label: "Emails envoyés (mois)", value: "12 480", icon: Mail, color: "text-primary" },
  { label: "SMS envoyés (mois)", value: "8 320", icon: Smartphone, color: "text-primary" },
  { label: "Notifications push", value: "5 240", icon: Bell, color: "text-primary" },
  { label: "Messages échangés", value: "1 870", icon: MessageSquare, color: "text-primary" },
];

export default function CommunicationDashboard() {
  return (
    <SettingsSection
      title="Tableau de bord — Communication"
      description="Vue d'ensemble des échanges et campagnes."
      icon={<LayoutDashboard className="h-5 w-5" />}
      hideSave
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} index={i} />
        ))}
      </div>


      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Taux d'ouverture</h3>
            <div className="space-y-2">
              {[["Emails parents", 68], ["Emails enseignants", 92], ["SMS parents", 98], ["Push mobile", 74]].map(([c, v]) => (
                <div key={c as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{c}</span><span className="font-semibold">{v}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Coûts du mois</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between"><span>SMS (8 320 × 25 FCFA)</span><span className="font-semibold">208 000 FCFA</span></li>
              <li className="flex justify-between"><span>Emails (forfait)</span><span className="font-semibold">15 000 FCFA</span></li>
              <li className="flex justify-between"><span>Push (gratuit)</span><span className="font-semibold">0 FCFA</span></li>
              <li className="flex justify-between border-t pt-2"><span className="font-semibold">Total</span><span className="font-bold text-primary">223 000 FCFA</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SettingsSection>
  );
}
