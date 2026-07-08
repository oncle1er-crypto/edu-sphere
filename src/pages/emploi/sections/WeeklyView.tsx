import { useEffect, useState, useMemo } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CalendarDays, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEmploiDuTemps, Creneau } from "@/hooks/useEmploiDuTemps";
import { useClasses } from "@/hooks/useClasses";
import { useSalles } from "@/hooks/useSalles";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useTimetableSettings, slotsFromSettings, joursFromSettings } from "@/hooks/useTimetableSettings";
import { toast } from "sonner";

const DAY_LABELS: Record<number, string> = {
  1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const COLORS = [
  "bg-primary/15 border-primary/40 text-primary",
  "bg-accent/15 border-accent/40 text-accent-foreground",
  "bg-secondary/40 border-border text-secondary-foreground",
  "bg-emerald-500/15 border-emerald-400/40 text-emerald-700",
  "bg-sky-500/15 border-sky-400/40 text-sky-700",
  "bg-violet-500/15 border-violet-400/40 text-violet-700",
  "bg-orange-500/15 border-orange-400/40 text-orange-700",
  "bg-pink-500/15 border-pink-400/40 text-pink-700",
];

function slotLabel(d: string, f: string) {
  return `${d.slice(0, 5)}-${f.slice(0, 5)}`;
}

export default function WeeklyView() {
  const { classes, loading: classesLoading } = useClasses();
  const { ecoleId } = useEcoleId();
  const { creneaux, loading, fetchCreneaux, addCreneau, deleteCreneau } = useEmploiDuTemps();
  const { settings, loading: settingsLoading } = useTimetableSettings();
  const { salles } = useSalles();

  const [classeId, setClasseId] = useState("");
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [enseignants, setEnseignants] = useState<{ id: string; nom: string; prenom: string }[]>([]);

  // Slots & jours dérivés de la config
  const SLOTS = useMemo(() => slotsFromSettings(settings), [settings]);
  const DAYS = useMemo(
    () => joursFromSettings(settings).map((num) => ({ num, label: DAY_LABELS[num] })),
    [settings]
  );

  // Dialog state
  const [open, setOpen] = useState(false);
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

  const sallesActives = useMemo(
    () => salles.filter((s) => s.statut === "active"),
    [salles]
  );

  const openAdd = (jour: number, slotIdx: number) => {
    setFormJour(jour);
    setFormSlot(slotIdx);
    setFormMatiere(matieres[0]?.id ?? "");
    setFormEnseignant("");
    setFormSalleId("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formMatiere) { toast.error("Sélectionnez une matière"); return; }
    setSaving(true);
    const slot = SLOTS[formSlot];
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
    if (result) {
      setOpen(false);
      fetchCreneaux(classeId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce créneau ?")) return;
    await deleteCreneau(id);
  };

  const isLoading = settingsLoading || classesLoading;

  return (
    <SettingsSection
      title="Vue hebdomadaire"
      description="Emploi du temps interactif — cliquez sur une case vide pour ajouter un créneau. Horaires et jours ouvrés viennent de la configuration."
      icon={<CalendarDays className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={classeId} onValueChange={setClasseId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Classe" /></SelectTrigger>
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
          Aucun créneau généré depuis la configuration. Vérifiez heure début/fin, durée et pause déjeuner dans l'onglet <strong>Configuration</strong>.
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
                    const key = `${d.num}-${slot.debut}`;
                    const cell = grid[key];
                    return (
                      <td
                        key={key}
                        className="border p-1 align-top h-16 group relative cursor-pointer"
                        onClick={() => !cell && openAdd(d.num, si)}
                      >
                        {cell ? (
                          <div className={`rounded-md border p-1.5 text-xs h-full ${colorMap[cell.matiere_id] ?? COLORS[0]}`}>
                            <div className="font-bold truncate">{cell.matiere_nom}</div>
                            <div className="text-[10px] opacity-80 truncate">{cell.enseignant_nom}</div>
                            {(cell.salle_code || cell.salle) && (
                              <div className="text-[10px] opacity-70">{cell.salle_code || cell.salle}</div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(cell.id); }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
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
              Ajouter un créneau — {DAY_LABELS[formJour]}{" "}
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
              <Select value={formEnseignant} onValueChange={setFormEnseignant}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salle</Label>
              <Select
                value={formSalleId || "none"}
                onValueChange={(v) => setFormSalleId(v === "none" ? "" : v)}
              >
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
