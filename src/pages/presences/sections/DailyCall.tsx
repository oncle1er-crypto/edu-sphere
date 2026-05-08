import { useState, useEffect } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Check, X, Clock, Loader2, Save } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { usePresences } from "@/hooks/usePresences";
import { useAuth } from "@/context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Status = "present" | "absent" | "retard";

export default function DailyCall() {
  const { classes, loading: loadingC } = useClasses();
  const { eleves, loading: loadingE } = useEleves();
  const { presences, fetchPresences, savePresences, ecoleId } = usePresences();
  const { user } = useAuth();
  const [classeId, setClasseId] = useState("");
  const [callDate, setCallDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const classEleves = eleves.filter((e) => e.classe_id === classeId);

  useEffect(() => {
    if (classeId && callDate) fetchPresences(classeId, callDate);
  }, [classeId, callDate, fetchPresences]);

  useEffect(() => {
    const map: Record<string, Status> = {};
    presences.forEach((p) => { map[p.eleve_id] = p.statut as Status; });
    setStatuses(map);
  }, [presences]);

  const setStatus = (id: string, s: Status) =>
    setStatuses((prev) => ({ ...prev, [id]: prev[id] === s ? "present" : s }));

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
      date_presence: callDate,
      statut: (statuses[e.id] ?? "present") as any,
      enregistre_par: user?.id ?? null,
    }));
    await savePresences(items);
    setSaving(false);
    setConfirmOpen(false);
  };

  if (loadingC || loadingE) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<ClipboardCheck className="h-5 w-5" />}
      title="Appel du jour"
      description="Marquer la présence des élèves pour la séance en cours."
      hideSave
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Classe</Label>
          <Select value={classeId} onValueChange={setClasseId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {classeId && (
        <>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Présents : {counts.present}</Badge>
            <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15">Absents : {counts.absent}</Badge>
            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">Retards : {counts.retard}</Badge>
          </div>

          <div className="border rounded-lg divide-y">
            {classEleves.map((s) => {
              const st = statuses[s.id] ?? "present";
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">{s.prenom} {s.nom}</p>
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
            {classEleves.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">Aucun élève dans cette classe.</div>
            )}
          </div>

          {classEleves.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => setConfirmOpen(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer l'appel
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'enregistrement de l'appel</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous êtes sur le point d'enregistrer l'appel pour la classe sélectionnée
                  à la date du <strong>{new Date(callDate).toLocaleDateString("fr-FR")}</strong>.
                </p>
                <div className="rounded-lg border p-3 bg-muted/40 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Effectif total</span><strong>{classEleves.length}</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>Présents</span><strong>{counts.present}</strong></div>
                  <div className="flex justify-between text-red-700"><span>Absents</span><strong>{counts.absent}</strong></div>
                  <div className="flex justify-between text-amber-700"><span>Retards</span><strong>{counts.retard}</strong></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Les élèves non marqués seront enregistrés comme « Présents ». Vous pourrez modifier l'appel ultérieurement.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
