import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FileBarChart, Plus, Calendar, Trash2, Play, Lock } from "lucide-react";
import { useSessionsCompositions } from "@/hooks/useConseilsCompositions";

const STATUT_TONE: Record<string, string> = {
  planifiee: "bg-primary/15 text-primary",
  en_cours: "bg-orange-500/15 text-orange-600",
  cloturee: "bg-accent/15 text-primary",
};
const STATUT_LABEL: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  cloturee: "Clôturée",
};

const TYPES = [
  { value: "composition", label: "Composition" },
  { value: "examen_blanc", label: "Examen blanc" },
  { value: "controle", label: "Contrôle" },
];

export default function Compositions() {
  const { items, loading, create, update, remove } = useSessionsCompositions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    libelle: "",
    type_session: "composition",
    date_debut: "",
    date_fin: "",
    consignes: "",
  });

  const submit = async () => {
    if (!form.libelle || !form.date_debut || !form.date_fin) return;
    const ok = await create({
      libelle: form.libelle,
      type_session: form.type_session,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      consignes: form.consignes || null,
    });
    if (ok) {
      setOpen(false);
      setForm({ libelle: "", type_session: "composition", date_debut: "", date_fin: "", consignes: "" });
    }
  };

  return (
    <SettingsSection
      icon={<FileBarChart className="h-5 w-5" />}
      title="Compositions & examens"
      description="Sessions de compositions trimestrielles et examens blancs."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Nouvelle session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une session de composition</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Libellé *</Label>
                <Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Composition T2 — 2026/2027" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type_session} onValueChange={(v) => setForm({ ...form, type_session: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Début *</Label>
                  <Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
                </div>
                <div>
                  <Label>Fin *</Label>
                  <Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Consignes</Label>
                <Textarea rows={3} value={form.consignes} onChange={(e) => setForm({ ...form, consignes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={!form.libelle || !form.date_debut || !form.date_fin}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <><Skeleton className="h-40" /><Skeleton className="h-40" /></>
        ) : items.length === 0 ? (
          <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
            Aucune session. Cliquez sur « Nouvelle session ».
          </p>
        ) : (
          items.map((s) => (
            <Card key={s.id} className="border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold font-display text-primary">{s.libelle}</h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.date_debut).toLocaleDateString("fr-FR")} → {new Date(s.date_fin).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge className={STATUT_TONE[s.statut] ?? ""} variant="secondary">
                    {STATUT_LABEL[s.statut] ?? s.statut}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Badge variant="outline">{TYPES.find((t) => t.value === s.type_session)?.label ?? s.type_session}</Badge>
                </div>
                {s.consignes && (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-3">{s.consignes}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.statut === "planifiee" && (
                    <Button size="sm" variant="outline" onClick={() => update(s.id, { statut: "en_cours" })}>
                      <Play className="h-3.5 w-3.5" />Démarrer
                    </Button>
                  )}
                  {s.statut !== "cloturee" && (
                    <Button size="sm" variant="outline" onClick={() => update(s.id, { statut: "cloturee" })}>
                      <Lock className="h-3.5 w-3.5" />Clôturer
                    </Button>
                  )}
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    tone="danger"
                    confirmTitle="Supprimer cette session ?"
                    confirmDescription="Cette action est irréversible."
                    confirmLabel="Supprimer"
                    onConfirm={async () => { await remove(s.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </ConfirmButton>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </SettingsSection>
  );
}
