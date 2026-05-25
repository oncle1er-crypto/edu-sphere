import { useState, useEffect } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Check, X, Clock, Loader2, Save } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { usePresences } from "@/hooks/usePresences";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Status = "present" | "absent" | "retard";

export default function StudentsAttendance() {
  const { classes, loading: loadingC } = useClasses();
  const { eleves, loading: loadingE } = useEleves();
  const { presences, fetchPresences, savePresences, ecoleId } = usePresences();
  const { user } = useAuth();
  const [classeId, setClasseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);

  const classEleves = eleves.filter((e) => e.classe_id === classeId);

  useEffect(() => {
    if (classeId && date) {
      fetchPresences(classeId, date);
    }
  }, [classeId, date, fetchPresences]);

  useEffect(() => {
    const map: Record<string, Status> = {};
    presences.forEach((p) => {
      map[p.eleve_id] = p.statut as Status;
    });
    setStatuses(map);
  }, [presences]);

  const toggle = (eleveId: string, s: Status) => {
    setStatuses((prev) => ({ ...prev, [eleveId]: prev[eleveId] === s ? "present" : s }));
  };

  const counts = {
    present: Object.values(statuses).filter((s) => s === "present").length,
    absent: Object.values(statuses).filter((s) => s === "absent").length,
    retard: Object.values(statuses).filter((s) => s === "retard").length,
  };

  const handleSave = async () => {
    if (!classeId || !ecoleId) return;
    setSaving(true);
    const items = classEleves.map((e) => ({
      ecole_id: ecoleId,
      eleve_id: e.id,
      classe_id: classeId,
      date_presence: date,
      statut: (statuses[e.id] ?? "present") as any,
      enregistre_par: user?.id ?? null,
    }));
    await savePresences(items);
    setSaving(false);
  };

  if (loadingC || loadingE) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<CalendarCheck className="h-5 w-5" />}
        title="Appel du jour"
        description="Faites l'appel pour une classe."
        hideSave
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Classe</label>
            <Select value={classeId} onValueChange={setClasseId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {classeId && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Présents", value: counts.present, color: "text-emerald-600", icon: Check },
                { label: "Absents", value: counts.absent, color: "text-destructive", icon: X },
                { label: "Retards", value: counts.retard, color: "text-amber-600", icon: Clock },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                    <div>
                      <p className="text-2xl font-extrabold font-display">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classEleves.map((e) => {
                    const st = statuses[e.id] ?? "present";
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.matricule}</TableCell>
                        <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                        <TableCell>
                          {st === "present" ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Présent</Badge>
                            : st === "absent" ? <Badge variant="destructive">Absent</Badge>
                            : <Badge className="bg-amber-500 hover:bg-amber-500">Retard</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant={st === "present" ? "default" : "outline"} className="h-7 px-2" onClick={() => toggle(e.id, "present")}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant={st === "absent" ? "default" : "outline"} className="h-7 px-2" onClick={() => toggle(e.id, "absent")}><X className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant={st === "retard" ? "default" : "outline"} className="h-7 px-2" onClick={() => toggle(e.id, "retard")}><Clock className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {classEleves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                        Aucun élève dans cette classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {classEleves.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer l'appel
                </Button>
              </div>
            )}
          </>
        )}
      </SettingsSection>
    </div>
  );
}
