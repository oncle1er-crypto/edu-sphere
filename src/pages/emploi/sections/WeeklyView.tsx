import { useEffect, useState, useMemo, useRef } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CalendarDays, Plus, Trash2, Loader2, Printer } from "lucide-react";
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
import { useTimetableSettings, slotsFromSettings, joursFromSettings, breaksFromSettings } from "@/hooks/useTimetableSettings";
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
  const { ecoleId } = useEcoleId();
  const { creneaux, loading, fetchCreneaux, addCreneau, updateCreneau, deleteCreneau, anneeId } = useEmploiDuTemps();
  const { classes, loading: classesLoading } = useClasses(anneeId ?? undefined);
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

  // Lignes à afficher : créneaux entrecoupés d'une ligne "pause" (récréation,
  // déjeuner) chaque fois que deux créneaux consécutifs ne se touchent pas —
  // c'est-à-dire chaque fois qu'une pause a raccourci le créneau précédent.
  const ROWS = useMemo(() => {
    const breaks = breaksFromSettings(settings);
    const out: Array<
      { type: "slot"; slot: { debut: string; fin: string }; slotIdx: number }
      | { type: "break"; label: string; debut: string; fin: string }
    > = [];
    SLOTS.forEach((slot, idx) => {
      if (idx > 0 && SLOTS[idx - 1].fin !== slot.debut) {
        const prevFin = SLOTS[idx - 1].fin;
        const b = breaks.find((x) => x.debut === prevFin && x.fin === slot.debut);
        out.push({ type: "break", label: b?.label ?? "Pause", debut: prevFin, fin: slot.debut });
      }
      out.push({ type: "slot", slot, slotIdx: idx });
    });
    return out;
  }, [SLOTS, settings]);

  // Dialog state
  const [open, setOpen] = useState(false);
  // Id du créneau en cours d'édition (null = création d'un nouveau créneau).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formJour, setFormJour] = useState(1);
  const [formSlot, setFormSlot] = useState(0);
  const [formMatiere, setFormMatiere] = useState("");
  const [formEnseignant, setFormEnseignant] = useState("");
  const [formSalleId, setFormSalleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

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
    setEditingId(null);
    setFormJour(jour);
    setFormSlot(slotIdx);
    setFormMatiere(matieres[0]?.id ?? "");
    setFormEnseignant("");
    setFormSalleId("");
    setOpen(true);
  };

  // Ouverture depuis le bouton « + Ajouter un créneau » en haut de page :
  // contrairement à openAdd (clic sur une case précise), le jour et
  // l'horaire ne sont pas encore connus et deviennent sélectionnables dans
  // le formulaire (cf. rendu conditionnel plus bas, editingId === null).
  const openAddGlobal = () => {
    if (!classeId) { toast.error("Sélectionnez d'abord une classe"); return; }
    setEditingId(null);
    setFormJour(DAYS[0]?.num ?? 1);
    setFormSlot(0);
    setFormMatiere(matieres[0]?.id ?? "");
    setFormEnseignant("");
    setFormSalleId("");
    setOpen(true);
  };

  // Capture fidèle du tableau tel qu'affiché à l'écran (mêmes couleurs,
  // mêmes lignes de pause) plutôt qu'une reconstruction texte — même
  // technique que generateClassCardsPDF.ts (html2canvas + jsPDF).
  const handlePrint = async () => {
    if (!classeId || !tableRef.current) return;
    setPrinting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(tableRef.current, {
        scale: 4,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        letterRendering: true,
      });
      const classeNom = classes.find((c) => c.id === classeId)?.nom ?? "Classe";
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const titleH = 8;
      pdf.setFontSize(14).setFont("helvetica", "bold");
      pdf.text(`Emploi du temps — ${classeNom}`, margin, margin);
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2 - titleH;
      const ratio = Math.min(availW / canvas.width, availH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      pdf.addImage(
        canvas.toDataURL("image/png"), "PNG",
        margin, margin + titleH, imgW, imgH
      );
      pdf.save(`EDT_${classeNom.replace(/[\\/?*[\]:]/g, "_")}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setPrinting(false);
    }
  };

  // Ouvre le même dialog pré-rempli pour lier/modifier enseignant, salle ou
  // matière d'un créneau déjà créé — jour et horaire restent fixes (ce n'est
  // pas un déplacement de créneau, seulement une liaison différée).
  const openEdit = (cell: Creneau, jour: number, slotIdx: number) => {
    setEditingId(cell.id);
    setFormJour(jour);
    setFormSlot(slotIdx);
    setFormMatiere(cell.matiere_id);
    setFormEnseignant(cell.enseignant_id ?? "");
    setFormSalleId(cell.salle_id ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formMatiere) { toast.error("Sélectionnez une matière"); return; }
    setSaving(true);
    const slot = SLOTS[formSlot];
    const salleCode = formSalleId ? sallesActives.find((s) => s.id === formSalleId)?.code ?? null : null;
    const result = editingId
      ? await updateCreneau(editingId, classeId, {
          matiere_id: formMatiere,
          enseignant_id: formEnseignant || null,
          salle_id: formSalleId || null,
          salle: salleCode,
        })
      : await addCreneau({
          classe_id: classeId,
          matiere_id: formMatiere,
          enseignant_id: formEnseignant || null,
          jour: formJour,
          heure_debut: slot.debut,
          heure_fin: slot.fin,
          salle_id: formSalleId || null,
          salle: salleCode,
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
      description="Emploi du temps interactif — cliquez sur une case vide pour ajouter un créneau, ou sur un créneau existant pour lier/modifier son enseignant, sa salle ou sa matière. Horaires et jours ouvrés viennent de la configuration."
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
        <Button size="sm" onClick={openAddGlobal} disabled={!classeId || matieres.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un créneau
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} disabled={!classeId || printing}>
          {printing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
          Imprimer
        </Button>
        {(loading || isLoading) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {SLOTS.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/30">
          Aucun créneau généré depuis la configuration. Vérifiez heure début/fin, durée et pause déjeuner dans l'onglet <strong>Configuration</strong>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="border bg-muted text-xs p-2 w-24">Horaire</th>
                {DAYS.map((d) => (
                  <th key={d.num} className="border bg-muted text-xs p-2">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => {
                if (row.type === "break") {
                  return (
                    <tr key={`b-${ri}`} className="bg-muted/70">
                      <td
                        colSpan={DAYS.length + 1}
                        className="border text-[11px] font-semibold text-muted-foreground text-center py-1 uppercase tracking-wide"
                      >
                        {row.label} — {slotLabel(row.debut, row.fin)}
                      </td>
                    </tr>
                  );
                }
                const { slot, slotIdx: si } = row;
                return (
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
                          onClick={() => (cell ? openEdit(cell, d.num, si) : openAdd(d.num, si))}
                        >
                          {cell ? (
                            <div className={`rounded-md border p-1.5 text-xs h-full ${colorMap[cell.matiere_id] ?? COLORS[0]}`}>
                              <div className="font-bold truncate">{cell.matiere_nom}</div>
                              <div className="text-[10px] opacity-80 truncate">
                                {cell.enseignant_nom || <span className="italic opacity-60">Enseignant à lier</span>}
                              </div>
                              {(cell.salle_code || cell.salle) ? (
                                <div className="text-[10px] opacity-70">{cell.salle_code || cell.salle}</div>
                              ) : (
                                <div className="text-[10px] italic opacity-60">Salle à lier</div>
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
                );
              })}
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
            {editingId === null && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jour *</Label>
                  <Select value={String(formJour)} onValueChange={(v) => setFormJour(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.num} value={String(d.num)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horaire *</Label>
                  <Select value={String(formSlot)} onValueChange={(v) => setFormSlot(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SLOTS.map((s, i) => (
                        <SelectItem key={i} value={String(i)}>{slotLabel(s.debut, s.fin)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
