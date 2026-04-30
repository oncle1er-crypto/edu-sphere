import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, X, Clock } from "lucide-react";

const students = [
  { id: 1, name: "Awa Diallo", matricule: "EL-001" },
  { id: 2, name: "Moussa Camara", matricule: "EL-002" },
  { id: 3, name: "Fatou Sow", matricule: "EL-003" },
  { id: 4, name: "Ibrahima Bah", matricule: "EL-004" },
  { id: 5, name: "Mariama Cissé", matricule: "EL-005" },
  { id: 6, name: "Ousmane Ndiaye", matricule: "EL-006" },
  { id: 7, name: "Aïcha Touré", matricule: "EL-007" },
  { id: 8, name: "Sékou Keita", matricule: "EL-008" },
];

type Status = "present" | "absent" | "retard" | null;

export default function DailyCall() {
  const [statuses, setStatuses] = useState<Record<number, Status>>({});

  const setStatus = (id: number, s: Status) =>
    setStatuses((prev) => ({ ...prev, [id]: prev[id] === s ? null : s }));

  const counts = {
    present: Object.values(statuses).filter((s) => s === "present").length,
    absent: Object.values(statuses).filter((s) => s === "absent").length,
    retard: Object.values(statuses).filter((s) => s === "retard").length,
  };

  return (
    <SettingsSection
      icon={<ClipboardCheck className="h-5 w-5" />}
      title="Appel du jour"
      description="Marquer la présence des élèves pour la séance en cours."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select defaultValue="6a">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6a">Classe : 6ème A</SelectItem>
            <SelectItem value="5b">Classe : 5ème B</SelectItem>
            <SelectItem value="3a">Classe : 3ème A</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="math">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="math">Matière : Mathématiques</SelectItem>
            <SelectItem value="fr">Matière : Français</SelectItem>
            <SelectItem value="hg">Matière : Hist-Géo</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="m1">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="m1">Séance : 08h00 - 09h00</SelectItem>
            <SelectItem value="m2">Séance : 09h00 - 10h00</SelectItem>
            <SelectItem value="m3">Séance : 10h15 - 11h15</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Présents : {counts.present}</Badge>
        <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15">Absents : {counts.absent}</Badge>
        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">Retards : {counts.retard}</Badge>
      </div>

      <div className="border rounded-lg divide-y">
        {students.map((s) => {
          const st = statuses[s.id];
          return (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.matricule}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={st === "present" ? "default" : "outline"} onClick={() => setStatus(s.id, "present")}>
                  <Check className="h-4 w-4" /> Présent
                </Button>
                <Button size="sm" variant={st === "absent" ? "default" : "outline"} onClick={() => setStatus(s.id, "absent")}>
                  <X className="h-4 w-4" /> Absent
                </Button>
                <Button size="sm" variant={st === "retard" ? "default" : "outline"} onClick={() => setStatus(s.id, "retard")}>
                  <Clock className="h-4 w-4" /> Retard
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}
