import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange } from "lucide-react";

const events = [
  { date: "28 avr", title: "Composition Maths", classe: "Tle C", duree: "3h", salle: "B12" },
  { date: "29 avr", title: "DS Français", classe: "3ème A", duree: "2h", salle: "A04" },
  { date: "02 mai", title: "Composition Physique", classe: "1ère D", duree: "3h", salle: "B12" },
  { date: "03 mai", title: "Interro Histoire", classe: "6ème B", duree: "1h", salle: "C07" },
  { date: "06 mai", title: "TP Sciences", classe: "5ème", duree: "2h", salle: "Lab 2" },
  { date: "10 mai", title: "Composition Anglais", classe: "Tle A", duree: "3h", salle: "B14" },
];

export default function ExamsCalendar() {
  return (
    <SettingsSection icon={<CalendarRange className='h-5 w-5' />} title="Calendrier des évaluations" description="Planning des compositions, devoirs et examens du trimestre.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map((e, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center font-bold">
                <span className="text-xs">{e.date.split(" ")[1]}</span>
                <span className="text-lg leading-none">{e.date.split(" ")[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{e.title}</p>
                  <Badge variant="secondary" className="text-[10px]">{e.classe}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Durée {e.duree} · Salle {e.salle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
