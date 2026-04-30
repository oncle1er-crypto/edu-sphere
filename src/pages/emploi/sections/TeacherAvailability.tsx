import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const slots = ["Matin", "Après-midi"];

export default function TeacherAvailability() {
  return (
    <SettingsSection
      title="Disponibilités enseignants"
      description="Cochez les créneaux où l'enseignant est disponible."
      icon={<Users className="h-5 w-5" />}
    >
      <div className="max-w-sm">
        <Select defaultValue="diop">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="diop">M. Diop — Mathématiques</SelectItem>
            <SelectItem value="sow">Mme Sow — Français</SelectItem>
            <SelectItem value="ba">M. Ba — Anglais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border bg-muted p-2 text-xs">Créneau</th>
              {days.map((d) => (
                <th key={d} className="border bg-muted p-2 text-xs">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s}>
                <td className="border p-2 text-xs font-semibold bg-muted/50">{s}</td>
                {days.map((d) => (
                  <td key={d + s} className="border p-2 text-center">
                    <Checkbox defaultChecked={!(d === "Mercredi" && s === "Après-midi") && !(d === "Samedi")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
        Charge actuelle : <strong className="text-foreground">18h / 20h</strong> max contractuel.
      </div>
    </SettingsSection>
  );
}
