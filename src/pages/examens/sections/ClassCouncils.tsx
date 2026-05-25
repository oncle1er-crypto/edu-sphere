import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Plus } from "lucide-react";

const councils = [
  { classe: "Tle C", date: "26 avril, 14h00", president: "M. Ondoa", participants: 9, statut: "Planifié" },
  { classe: "1ère D", date: "27 avril, 15h00", president: "Mme Mvogo", participants: 8, statut: "Planifié" },
  { classe: "3ème A", date: "23 avril, 10h00", president: "M. Tchinda", participants: 11, statut: "Tenu" },
  { classe: "6ème B", date: "22 avril, 09h00", president: "Mme Bekolo", participants: 7, statut: "Tenu" },
];

const tone: Record<string, string> = {
  "Planifié": "bg-primary/15 text-primary",
  "Tenu": "bg-accent/15 text-primary",
};

export default function ClassCouncils() {
  return (
    <SettingsSection
      icon={<Users className='h-5 w-5' />}
      title="Conseils de classe"
      description="Organisation des conseils trimestriels et décisions du jury."
      >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {councils.map((c, i) => (
          <Card key={i} className="border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold font-display text-primary">Classe {c.classe}</h4>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {c.date}
                  </p>
                </div>
                <Badge className={tone[c.statut]} variant="secondary">{c.statut}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Président</p>
                  <p className="font-medium">{c.president}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Participants</p>
                  <p className="font-medium">{c.participants} enseignants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
