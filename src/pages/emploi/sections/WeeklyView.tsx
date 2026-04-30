import { SettingsSection } from "@/components/settings/SettingsSection";
import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const slots = ["08h-09h", "09h-10h", "10h-11h", "11h-12h", "14h-15h", "15h-16h", "16h-17h"];

const grid: Record<string, { subject: string; teacher: string; room: string; color: string } | null> = {
  "Lundi-08h-09h": { subject: "Maths", teacher: "M. Diop", room: "S12", color: "bg-primary/15 border-primary/40" },
  "Lundi-09h-10h": { subject: "Français", teacher: "Mme Sow", room: "S08", color: "bg-accent/15 border-accent/40" },
  "Lundi-10h-11h": { subject: "Anglais", teacher: "M. Ba", room: "S05", color: "bg-secondary/40 border-border" },
  "Mardi-08h-09h": { subject: "SVT", teacher: "Mme Ndiaye", room: "Lab1", color: "bg-primary/15 border-primary/40" },
  "Mardi-10h-11h": { subject: "Histoire", teacher: "M. Fall", room: "S11", color: "bg-accent/15 border-accent/40" },
  "Jeudi-09h-10h": { subject: "Maths", teacher: "M. Diop", room: "S12", color: "bg-primary/15 border-primary/40" },
  "Jeudi-14h-15h": { subject: "EPS", teacher: "M. Sarr", room: "Gym", color: "bg-secondary/40 border-border" },
  "Vendredi-11h-12h": { subject: "Physique", teacher: "M. Ka", room: "Lab2", color: "bg-accent/15 border-accent/40" },
};

export default function WeeklyView() {
  return (
    <SettingsSection
      title="Vue hebdomadaire"
      description="Planning visuel d'une classe ou d'un enseignant."
      icon={<CalendarDays className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap gap-3">
        <Select defaultValue="6A">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6A">Classe — 6ème A</SelectItem>
            <SelectItem value="6B">Classe — 6ème B</SelectItem>
            <SelectItem value="diop">Prof — M. Diop</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="s14">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="s14">Semaine 14</SelectItem>
            <SelectItem value="s15">Semaine 15</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="border bg-muted text-xs p-2 w-24">Horaire</th>
              {days.map((d) => (
                <th key={d} className="border bg-muted text-xs p-2">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <td className="border bg-muted/50 text-xs font-semibold p-2 text-center">{slot}</td>
                {days.map((d) => {
                  const cell = grid[`${d}-${slot}`];
                  return (
                    <td key={d + slot} className="border p-1 align-top h-16">
                      {cell && (
                        <div className={`rounded-md border p-2 text-xs ${cell.color}`}>
                          <div className="font-bold">{cell.subject}</div>
                          <div className="text-muted-foreground">{cell.teacher}</div>
                          <div className="text-muted-foreground">{cell.room}</div>
                        </div>
                      )}
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
