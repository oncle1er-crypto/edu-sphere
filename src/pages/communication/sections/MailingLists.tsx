import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const lists = [
  { nom: "Tous les parents", count: 412, type: "Auto", desc: "Mise à jour automatique." },
  { nom: "Parents collège", count: 218, type: "Auto", desc: "Tous les parents avec enfant en collège." },
  { nom: "Enseignants permanents", count: 64, type: "Auto", desc: "CDI uniquement." },
  { nom: "Conseil de parents", count: 18, type: "Manuelle", desc: "Membres élus du bureau." },
  { nom: "VIP / Sponsors", count: 12, type: "Manuelle", desc: "Communication ciblée." },
];

export default function MailingLists() {
  return (
    <SettingsSection
      title="Listes de diffusion"
      description="Groupes de destinataires réutilisables."
      icon={<Users className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle liste</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((l, i) => (
          <Card key={i} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{l.nom}</h3>
                <Badge variant={l.type === "Auto" ? "default" : "secondary"}>{l.type}</Badge>
              </div>
              <p className="text-2xl font-extrabold text-primary">{l.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
