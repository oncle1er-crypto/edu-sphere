import { useEffect, useMemo, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarRange, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEmploiDuTemps, Creneau } from "@/hooks/useEmploiDuTemps";
import { useSalles } from "@/hooks/useSalles";
import { useTimetableSettings, slotsFromSettings, joursFromSettings } from "@/hooks/useTimetableSettings";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const DAY_LABELS: Record<number, string> = {
  1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const COLORS = [
  "bg-primary/15 border-primary/40 text-primary",
  "bg-accent/15 border-accent/40 text-accent-foreground",
  "bg-emerald-500/15 border-emerald-400/40 text-emerald-700",
  "bg-sky-500/15 border-sky-400/40 text-sky-700",
  "bg-violet-500/15 border-violet-400/40 text-violet-700",
  "bg-orange-500/15 border-orange-400/40 text-orange-700",
  "bg-pink-500/15 border-pink-400/40 text-pink-700",
  "bg-rose-500/15 border-rose-400/40 text-rose-700",
];

const slotLabel = (d: string, f: string) => `${d.slice(0, 5)}-${f.slice(0, 5)}`;

export default function ClassesSchedule() {
  const { activeAnnee } = useAcademicPeriod();
  const { ecoleId } = useEcoleId();
  const { classes, loading: classesLoading } = useClasses(activeAnnee.id);
  const { creneaux, loading, fetchCreneaux, addCreneau, updateCreneau, deleteCreneau } = useEmploiDuTemps();
  const { settings, loading: settingsLoading } = useTimetableSettings();
  const { salles } = useSalles();

  const [classeId, setClasseId] = useState("");
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [enseignants, setEnseignants] = useState<{ id: string; nom: string; prenom: string }[]>([]);

  const SLOTS = useMemo(() => slotsFromSettings(settings), [settings]);
  const DAYS = useMemo(
    () => joursFromSettings(settings).map((num) => ({ num, label: DAY_LABELS[num] })),
    [settings]
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formJour, setFormJour] = useState(1);
  const [formSlot, setFormSlot] = useState(0);
  const [formMatiere, setFormMatiere] = useState("");
  const [formEnseignant, setFormEnseignant] = useState("");
  const [formSalleId, setFormSalleId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (classes.length > 0 && !classeId) setClasseId(classes[0].id);
  }, [classes, classeId]);

  useEffect(() => {
    if (classeId) fetchCreneaux(classeId);
  }, [classeId, fetchCreneaux]);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("matieres").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setMatieres(data ?? []));
    supabase.from("enseignants").select("id, nom, prenom").eq("ecole_id", ecoleId).eq("statut", "actif").order("nom")
      .then(({ data }) => setEnseignants(data ?? []));
  }, [ecoleId]);

  const sallesActives = useMemo(() => salles.filter((s) => s.statut === "active"), [salles]);

  const colorMap = useMemo(() => {
    const ids = [...new Set(creneaux.map((c) => c.matiere_id))];
    const map: Record<string, string> = {};
    ids.forEach((id, i) => { map[id] = COLORS[i % COLORS.length]; });
    return map;
  }, [creneaux]);

  const grid = useMemo(() => {
    const m: Record<string, Creneau> = {};
    creneaux.forEach((c) => {
      const key = `${c.jour}-${c.heure_debut.slice(0, 5)}`;
      m[key] = c;
    });
    return m;
  }, [creneaux]);

  const openAdd = (jour: number, slotIdx: number) => {
    setEditingId(null);
    setFormJour(jour);
    setFormSlot(slotIdx);
    setFormMatiere(matieres[0]?.id ?? "");
    setFormEnseignant("");
    setFormSalleId("");
    setOpen(true);
  };

  const openEdit = (c: Creneau) => {
    const idx = SLOTS.findIndex((s) => s.debut.slice(0, 5) === c.heure_debut.slice(0, 5));
    setEditingId(c.id);
    setFormJour(c.jour);
    setFormSlot(idx >= 0 ? idx : 0);
    setFormMatiere(c.matiere_id);
    setFormEnseignant(c.enseignant_id ?? "");
    setFormSalleId(c.salle_id ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formMatiere) { toast.error("Sélectionnez une matière"); return; }
    const slot = SLOTS[formSlot];
    if (!slot) { toast.error("Créneau horaire invalide"); return; }
    setSaving(true);
    if (editingId) {
      const ok = await updateCreneau(editingId, classeId, {
        matiere_id: formMatiere,
        enseignant_id: formEnseignant || null,
        jour: formJour,
        heure_debut: slot.debut,
        heure_fin: slot.fin,
        salle_id: formSalleId || null,
        salle: formSalleId ? sallesActives.find((s) => s.id === formSalleId)?.code ?? null : null,
      } as any);
      setSaving(false);
      if (ok) { setOpen(false); fetchCreneaux(classeId); }
    } else {
      const result = await addCreneau({
        classe_id: classeId,
        matiere_id: formMatiere,
        enseignant_id: formEnseignant || null,
        jour: formJour,
        heure_debut: slot.debut,
        heure_fin: slot.fin,
        salle_id: formSalleId || null,
        salle: formSalleId ? sallesActives.find((s) => s.id === formSalleId)?.code ?? null : null,
      });
      setSaving(false);
      if (result) { setOpen(false); fetchCreneaux(classeId); }
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm("Supprimer ce créneau ?")) return;
    const ok = await deleteCreneau(editingId);
    if (ok) { setOpen(false); fetchCreneaux(classeId); }
  };

  const isLoading = settingsLoading || classesLoading;

  return (
    <SettingsSection
      icon={<CalendarRange className="h-5 w-5" />}
      title="Emploi du temps de classe"
      description="Cliquez sur une case vide pour ajouter un créneau, ou sur un créneau existant pour le modifier."
      hideSave
    >
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={classeId} onValueChange={setClasseId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(loading || isLoading) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {SLOTS.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/30">
          Aucun créneau généré depuis la configuration. Vérifiez les horaires dans <strong>Emploi du temps &gt; Configuration</strong>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="border bg-muted text-xs p-2 w-24">Horaire</th>
                {DAYS.map((d) => (
                  <th key={d.num} className="border bg-muted text-xs p-2">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, si) => (
                <tr key={si}>
                  <td className="border bg-muted/50 text-xs font-semibold p-2 text-center whitespace-nowrap">
                    {slotLabel(slot.debut, slot.fin)}
                  </td>
                  {DAYS.map((d) => {
                    const key = `${d.num}-${slot.debut.slice(0, 5)}`;
                    const cell = grid[key];
                    return (
                      <td
                        key={key}
                        className="border p-1 align-top h-16 group relative cursor-pointer"
                        onClick={() => cell ? openEdit(cell) : openAdd(d.num, si)}
                      >
                        {cell ? (
                          <div className={`rounded-md border p-1.5 text-xs h-full ${colorMap[cell.matiere_id] ?? COLORS[0]}`}>
                            <div className="font-bold truncate">{cell.matiere_nom}</div>
                            <div className="text-[10px] opacity-80 truncate">{cell.enseignant_nom}</div>
                            {(cell.salle_code || cell.salle) && (
                              <div className="text-[10px] opacity-70 truncate">{cell.salle_code || cell.salle}</div>
                            )}
                            <Pencil className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-70 transition-opacity" />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity">
                            <Plus className="h-4 w-4" />
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
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le créneau" : "Ajouter un créneau"} — {DAY_LABELS[formJour]}{" "}
              {SLOTS[formSlot] && slotLabel(SLOTS[formSlot].debut, SLOTS[formSlot].fin)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Matière *</Label>
              <Select value={formMatiere} onValueChange={setFormMatiere}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enseignant</Label>
              <Select value={formEnseignant || "none"} onValueChange={(v) => setFormEnseignant(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salle</Label>
              <Select value={formSalleId || "none"} onValueChange={(v) => setFormSalleId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {sallesActives.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code}{s.nom ? ` — ${s.nom}` : ""} ({s.capacite} pl.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingId && (
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
