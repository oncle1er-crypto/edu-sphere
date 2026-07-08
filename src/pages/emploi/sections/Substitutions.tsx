import { useEffect, useState, useCallback } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Repeat, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useTimetableSettings } from "@/hooks/useTimetableSettings";
import { renderTemplate, normalizeSmsText } from "@/lib/smsText";
import { toast } from "sonner";


type Statut = "a_pourvoir" | "en_attente" | "confirme" | "annule";

interface Remplacement {
  id: string;
  date: string;
  absent_enseignant_id: string;
  remplacant_enseignant_id: string | null;
  classe_id: string | null;
  matiere_id: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  motif: string | null;
  statut: Statut;
  notes: string | null;
  absent?: { nom: string; prenom: string } | null;
  remplacant?: { nom: string; prenom: string } | null;
  classes?: { nom: string } | null;
  matieres?: { nom: string } | null;
}

const STATUT_LABEL: Record<Statut, string> = {
  a_pourvoir: "À pourvoir",
  en_attente: "En attente",
  confirme: "Confirmé",
  annule: "Annulé",
};

const STATUT_VARIANT: Record<Statut, "default" | "secondary" | "destructive" | "outline"> = {
  confirme: "default",
  en_attente: "secondary",
  a_pourvoir: "destructive",
  annule: "outline",
};

export default function Substitutions() {
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();
  const { enseignants } = useEnseignants();
  const { settings } = useTimetableSettings();

  const [rows, setRows] = useState<Remplacement[]>([]);
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([]);
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    absent_enseignant_id: "",
    remplacant_enseignant_id: "",
    classe_id: "",
    matiere_id: "",
    heure_debut: "",
    heure_fin: "",
    motif: "",
    statut: "a_pourvoir" as Statut,
    notes: "",
  });

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("remplacements" as any)
      .select(`*,
        absent:absent_enseignant_id (nom, prenom),
        remplacant:remplacant_enseignant_id (nom, prenom),
        classes(nom), matieres(nom)`)
      .eq("ecole_id", ecoleId)
      .order("date", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erreur chargement remplacements");
    } else {
      setRows((data as any) ?? []);
    }
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleId) return;
    fetch();
    supabase.from("classes").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setClasses((data as any) ?? []));
    supabase.from("matieres").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setMatieres((data as any) ?? []));
  }, [ecoleId, fetch]);

  const resetForm = () => setForm({
    date: today, absent_enseignant_id: "", remplacant_enseignant_id: "",
    classe_id: "", matiere_id: "", heure_debut: "", heure_fin: "",
    motif: "", statut: "a_pourvoir", notes: "",
  });

  const save = async () => {
    if (!ecoleId) return;
    if (!form.absent_enseignant_id || !form.date) {
      toast.error("Date et enseignant absent obligatoires");
      return;
    }
    setSaving(true);
    const payload: any = {
      ecole_id: ecoleId,
      annee_id: anneeId,
      date: form.date,
      absent_enseignant_id: form.absent_enseignant_id,
      remplacant_enseignant_id: form.remplacant_enseignant_id || null,
      classe_id: form.classe_id || null,
      matiere_id: form.matiere_id || null,
      heure_debut: form.heure_debut || null,
      heure_fin: form.heure_fin || null,
      motif: form.motif || null,
      statut: form.statut,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("remplacements" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Remplacement enregistré");
    setOpen(false);
    resetForm();
    fetch();
  };

  const notifyRemplacement = async (r: Remplacement, statut: Statut) => {
    if (!settings.notif_remplacements || !r.classe_id) return;
    if (!settings.canal_sms && !settings.canal_email) return;
    const action = statut === "confirme" ? "confirmé" : statut === "annule" ? "annulé" : "modifié";
    const heure = r.heure_debut && r.heure_fin
      ? `${r.heure_debut.slice(0,5)}-${r.heure_fin.slice(0,5)}`
      : "toute la journée";
    const message = normalizeSmsText(renderTemplate(settings.modele_message, {
      matiere: r.matieres?.nom ?? "cours",
      date: new Date(r.date).toLocaleDateString("fr-FR"),
      heure,
      classe: r.classes?.nom ?? "",
      action: `${action} (remplacement)`,
    }));
    if (settings.canal_sms) {
      try {
        await supabase.functions.invoke("send-sms", {
          body: { classe_id: r.classe_id, message },
        });
      } catch (e) { console.error("SMS notif:", e); }
    }
  };

  const updateStatut = async (id: string, statut: Statut) => {
    const { error } = await supabase.from("remplacements" as any).update({ statut }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    const r = rows.find((x) => x.id === id);
    if (r && (statut === "confirme" || statut === "annule")) {
      notifyRemplacement({ ...r, statut }, statut).catch(() => {});
    }
    fetch();
  };



  const remove = async (id: string) => {
    if (!confirm("Supprimer ce remplacement ?")) return;
    const { error } = await supabase.from("remplacements" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Remplacement supprimé");
    fetch();
  };

  return (
    <SettingsSection
      title="Remplacements"
      description="Suivi des absences des enseignants et affectation des remplaçants."
      icon={<Repeat className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouveau remplacement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nouveau remplacement</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as Statut })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUT_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Enseignant absent *</Label>
                <Select value={form.absent_enseignant_id} onValueChange={(v) => setForm({ ...form, absent_enseignant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remplaçant</Label>
                <Select
                  value={form.remplacant_enseignant_id || "none"}
                  onValueChange={(v) => setForm({ ...form, remplacant_enseignant_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {enseignants
                      .filter((e) => e.id !== form.absent_enseignant_id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Classe</Label>
                <Select
                  value={form.classe_id || "none"}
                  onValueChange={(v) => setForm({ ...form, classe_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matière</Label>
                <Select
                  value={form.matiere_id || "none"}
                  onValueChange={(v) => setForm({ ...form, matiere_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Heure début</Label>
                <Input type="time" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} />
              </div>
              <div>
                <Label>Heure fin</Label>
                <Input type="time" value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Motif</Label>
                <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Maladie, formation, …" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>Remplaçant</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead>Horaire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucun remplacement enregistré.</TableCell></TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.date).toLocaleDateString("fr-FR")}</TableCell>
              <TableCell className="font-medium">
                {r.absent ? `${r.absent.prenom} ${r.absent.nom}` : "—"}
              </TableCell>
              <TableCell>
                {r.remplacant ? `${r.remplacant.prenom} ${r.remplacant.nom}` : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>{r.classes?.nom ?? "—"}</TableCell>
              <TableCell>{r.matieres?.nom ?? "—"}</TableCell>
              <TableCell className="text-xs">
                {r.heure_debut && r.heure_fin
                  ? `${r.heure_debut.slice(0, 5)}–${r.heure_fin.slice(0, 5)}`
                  : "—"}
              </TableCell>
              <TableCell>
                <Select value={r.statut} onValueChange={(v) => updateStatut(r.id, v as Statut)}>
                  <SelectTrigger className="h-7 w-[130px] p-1">
                    <Badge variant={STATUT_VARIANT[r.statut]}>{STATUT_LABEL[r.statut]}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUT_LABEL) as Statut[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUT_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
