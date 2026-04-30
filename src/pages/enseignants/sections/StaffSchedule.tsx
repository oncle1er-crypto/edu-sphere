import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck } from "lucide-react";

const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const heures = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

const cours: Record<string, { matiere: string; classe: string; salle: string } | null> = {
  "Lundi-08:00": { matiere: "Maths", classe: "3ème A", salle: "S12" },
  "Lundi-10:00": { matiere: "Maths", classe: "Tle S1", salle: "S08" },
  "Mardi-09:00": { matiere: "Maths", classe: "3ème B", salle: "S12" },
  "Mardi-14:00": { matiere: "Maths", classe: "3ème A", salle: "S12" },
  "Mercredi-08:00": { matiere: "Maths", classe: "Tle S1", salle: "S08" },
  "Jeudi-10:00": { matiere: "Maths", classe: "3ème B", salle: "S12" },
  "Vendredi-09:00": { matiere: "Maths", classe: "Tle S1", salle: "S08" },
  "Vendredi-15:00": { matiere: "Maths", classe: "3ème A", salle: "S12" },
};

export default function StaffSchedule() {
  return (
    <SettingsSection
      icon={<CalendarCheck className="h-5 w-5" />}
      title="Emploi du temps enseignant"
      description="Visualisez les cours d'un professeur sur la semaine."
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <Select defaultValue="ENS-001">
          <SelectTrigger className="md:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ENS-001">Sidibé Amadou — Mathématiques</SelectItem>
            <SelectItem value="ENS-002">Touré Fatoumata — Français</SelectItem>
            <SelectItem value="ENS-003">Diarra Mamadou — Physique-Chimie</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">Semaine du 27/04/2026</Badge>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-semibold">Heure</th>
              {jours.map((j) => (
                <th key={j} className="text-left p-2 font-semibold min-w-[110px]">{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heures.map((h) => (
              <tr key={h} className="border-t">
                <td className="p-2 text-xs text-muted-foreground font-mono">{h}</td>
                {jours.map((j) => {
                  const c = cours[`${j}-${h}`];
                  return (
                    <td key={j} className="p-1.5">
                      {c ? (
                        <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5">
                          <p className="text-xs font-bold text-primary">{c.matiere}</p>
                          <p className="text-[11px]">{c.classe}</p>
                          <p className="text-[10px] text-muted-foreground">Salle {c.salle}</p>
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
