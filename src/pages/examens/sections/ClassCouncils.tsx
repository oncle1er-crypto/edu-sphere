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
import { Users, Calendar, Plus, Trash2, Play, CheckCircle2 } from "lucide-react";
import { useConseilsClasse } from "@/hooks/useConseilsCompositions";
import { useClasses } from "@/hooks/useClasses";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useAnneeId } from "@/hooks/useAnneeId";

const STATUT_TONE: Record<string, string> = {
  planifie: "bg-primary/15 text-primary",
  en_cours: "bg-orange-500/15 text-orange-600",
  tenu: "bg-accent/15 text-primary",
  cloture: "bg-muted text-muted-foreground",
};
const STATUT_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  tenu: "Tenu",
  cloture: "Clôturé",
};

export default function ClassCouncils() {
  const { items, loading, create, update, remove } = useConseilsClasse();
  const { anneeId } = useAnneeId();
  const { classes } = useClasses(anneeId ?? undefined);
  const { enseignants } = useEnseignants();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    classe_id: "",
    date_conseil: "",
    heure_debut: "",
    president_id: "",
    ordre_du_jour: "",
  });

  const submit = async () => {
    if (!form.classe_id || !form.date_conseil) return;
    const ok = await create({
      classe_id: form.classe_id,
      date_conseil: form.date_conseil,
      heure_debut: form.heure_debut || null,
      president_id: form.president_id || null,
      ordre_du_jour: form.ordre_du_jour || null,
    });
    if (ok) {
      setOpen(false);
      setForm({ classe_id: "", date_conseil: "", heure_debut: "", president_id: "", ordre_du_jour: "" });
    }
  };

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title="Conseils de classe"
      description="Planifiez et suivez les conseils de classe trimestriels."
      hideSave
    >
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Nouveau conseil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Planifier un conseil de classe</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Classe *</Label>
                <Select value={form.classe_id} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.date_conseil} onChange={(e) => setForm({ ...form, date_conseil: e.target.value })} />
                </div>
                <div>
                  <Label>Heure</Label>
                  <Input type="time" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Président</Label>
                <Select value={form.president_id} onValueChange={(v) => setForm({ ...form, president_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir un enseignant" /></SelectTrigger>
                  <SelectContent>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordre du jour</Label>
                <Textarea rows={3} value={form.ordre_du_jour} onChange={(e) => setForm({ ...form, ordre_du_jour: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={!form.classe_id || !form.date_conseil}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <><Skeleton className="h-40" /><Skeleton className="h-40" /></>
        ) : items.length === 0 ? (
          <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
            Aucun conseil planifié. Cliquez sur « Nouveau conseil ».
          </p>
        ) : (
          items.map((c) => (
            <Card key={c.id} className="border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold font-display text-primary">Classe {c.classe_nom}</h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.date_conseil).toLocaleDateString("fr-FR")}
                      {c.heure_debut ? ` — ${c.heure_debut.slice(0, 5)}` : ""}
                    </p>
                  </div>
                  <Badge className={STATUT_TONE[c.statut] ?? ""} variant="secondary">
                    {STATUT_LABEL[c.statut] ?? c.statut}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Président</p>
                    <p className="font-medium">{c.president_nom || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ordre du jour</p>
                    <p className="text-xs line-clamp-2">{c.ordre_du_jour || "—"}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.statut === "planifie" && (
                    <Button size="sm" variant="outline" onClick={() => update(c.id, { statut: "en_cours" })}>
                      <Play className="h-3.5 w-3.5" />Démarrer
                    </Button>
                  )}
                  {(c.statut === "planifie" || c.statut === "en_cours") && (
                    <Button size="sm" variant="outline" onClick={() => update(c.id, { statut: "tenu" })}>
                      <CheckCircle2 className="h-3.5 w-3.5" />Marquer tenu
                    </Button>
                  )}
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    tone="danger"
                    confirmTitle="Supprimer ce conseil ?"
                    confirmDescription="Cette action est irréversible."
                    confirmLabel="Supprimer"
                    onConfirm={async () => { await remove(c.id); }}
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
