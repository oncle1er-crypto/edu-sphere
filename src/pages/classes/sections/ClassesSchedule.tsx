import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarRange, Download } from "lucide-react";

const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const heures = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

const cours: Record<string, { matiere: string; prof: string; salle: string; color: string } | null> = {
  "Lundi-08:00": { matiere: "Maths", prof: "Sidibé", salle: "C12", color: "bg-blue-500/15 border-blue-500/30 text-blue-700" },
  "Lundi-09:00": { matiere: "Français", prof: "Touré", salle: "C12", color: "bg-rose-500/15 border-rose-500/30 text-rose-700" },
  "Lundi-10:00": { matiere: "Histoire", prof: "Kouyaté", salle: "C14", color: "bg-amber-500/15 border-amber-500/30 text-amber-700" },
  "Lundi-14:00": { matiere: "Anglais", prof: "Sanogo", salle: "C12", color: "bg-violet-500/15 border-violet-500/30 text-violet-700" },
  "Mardi-08:00": { matiere: "SVT", prof: "Cissé", salle: "LAB-SVT", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700" },
  "Mardi-09:00": { matiere: "Maths", prof: "Sidibé", salle: "C12", color: "bg-blue-500/15 border-blue-500/30 text-blue-700" },
  "Mardi-15:00": { matiere: "EPS", prof: "Camara", salle: "GYM", color: "bg-orange-500/15 border-orange-500/30 text-orange-700" },
  "Mercredi-08:00": { matiere: "Français", prof: "Touré", salle: "C12", color: "bg-rose-500/15 border-rose-500/30 text-rose-700" },
  "Mercredi-09:00": { matiere: "Physique", prof: "Diarra", salle: "LAB-PHY", color: "bg-cyan-500/15 border-cyan-500/30 text-cyan-700" },
  "Jeudi-10:00": { matiere: "Maths", prof: "Sidibé", salle: "C12", color: "bg-blue-500/15 border-blue-500/30 text-blue-700" },
  "Jeudi-14:00": { matiere: "Histoire", prof: "Kouyaté", salle: "C14", color: "bg-amber-500/15 border-amber-500/30 text-amber-700" },
  "Vendredi-09:00": { matiere: "Anglais", prof: "Sanogo", salle: "C12", color: "bg-violet-500/15 border-violet-500/30 text-violet-700" },
  "Vendredi-10:00": { matiere: "SVT", prof: "Cissé", salle: "LAB-SVT", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700" },
  "Vendredi-15:00": { matiere: "Arts", prof: "Bah", salle: "C12", color: "bg-pink-500/15 border-pink-500/30 text-pink-700" },
};

export default function ClassesSchedule() {
  return (
    <SettingsSection
      icon={<CalendarRange className="h-5 w-5" />}
      title="Emploi du temps de classe"
      description="Planning hebdomadaire pour une classe sélectionnée."
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Select defaultValue="3a">
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3a">3ème A</SelectItem>
              <SelectItem value="6a">6ème A</SelectItem>
              <SelectItem value="tle">Terminale S1</SelectItem>
              <SelectItem value="cm2">CM2</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">Semaine du 27/04/2026</Badge>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export PDF</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-semibold">Heure</th>
              {jours.map((j) => <th key={j} className="text-left p-2 font-semibold min-w-[120px]">{j}</th>)}
            </tr>
          </thead>
          <tbody>
            {heures.map((h) => (
              <tr key={h} className="border-t">
                <td className="p-2 text-xs text-muted-foreground font-mono">{h}</td>
                {jours.map((j) => {
                  const c = cours[`${j}-${h}`];
                  return (
                    <td key={j} className="p-1.5 align-top">
                      {c ? (
                        <div className={`rounded-md border px-2 py-1.5 ${c.color}`}>
                          <p className="text-xs font-bold">{c.matiere}</p>
                          <p className="text-[11px] opacity-80">{c.prof}</p>
                          <p className="text-[10px] opacity-70">{c.salle}</p>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsSection>
  );
}
