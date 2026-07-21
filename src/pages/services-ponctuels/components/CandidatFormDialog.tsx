import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SpCandidat, SpCandidatStatut } from "../hooks/useSpCandidats";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useSpTestSessions } from "../hooks/useSpTestSessions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<SpCandidat> & { session_id?: string | null; classe_demandee_id?: string | null };
  onSubmit: (p: any) => Promise<void>;
}

const STATUT_LABEL: Record<SpCandidatStatut, string> = {
  en_attente: "En attente (pas de session)",
  programme: "Programmé (session fixée)",
  present: "Présent au test",
  absent: "Absent",
  admis: "Admis",
  refuse: "Refusé",
};
const STATUTS = Object.keys(STATUT_LABEL) as SpCandidatStatut[];

export function CandidatFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { anneeId } = useAnneeId();
  const { classes } = useClasses(anneeId ?? undefined);
  const { sessions } = useSpTestSessions();
  const activeSessions = sessions.filter((s) => s.actif);

  const [form, setForm] = useState<any>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial, open]);
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // Rétro-remplit classe_demandee_id depuis texte si présent
  useEffect(() => {
    if (form.classe_demandee_id || !form.classe_demandee || classes.length === 0) return;
    const match = classes.find((c) => c.nom.toLowerCase() === String(form.classe_demandee).toLowerCase());
    if (match) update("classe_demandee_id", match.id);
  }, [classes.length, form.classe_demandee]); // eslint-disable-line

  const handleClasse = (id: string) => {
    const c = classes.find((x) => x.id === id);
    update("classe_demandee_id", id);
    update("classe_demandee", c?.nom ?? null);
  };
  const handleSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    update("session_id", id);
    update("date_test", s ? s.date_test : null);
    if (s && (!form.statut || form.statut === "en_attente")) update("statut", "programme");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Modifier le candidat" : "Nouveau candidat"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom *</Label><Input value={form.nom ?? ""} onChange={(e) => update("nom", e.target.value)} /></div>
          <div><Label>Prénoms *</Label><Input value={form.prenom ?? ""} onChange={(e) => update("prenom", e.target.value)} /></div>
          <div>
            <Label>Sexe</Label>
            <Select value={form.sexe ?? ""} onValueChange={(v) => update("sexe", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date de naissance</Label><Input type="date" value={form.date_naissance ?? ""} onChange={(e) => update("date_naissance", e.target.value)} /></div>

          <div>
            <Label>Classe demandée</Label>
            <Select value={form.classe_demandee_id ?? ""} onValueChange={handleClasse}>
              <SelectTrigger><SelectValue placeholder={classes.length ? "Sélectionner une classe" : "Aucune classe configurée"} /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>École d'origine</Label><Input value={form.ecole_origine ?? ""} onChange={(e) => update("ecole_origine", e.target.value)} /></div>
          <div><Label>Parent</Label><Input value={form.parent ?? ""} onChange={(e) => update("parent", e.target.value)} /></div>
          <div><Label>Téléphone</Label><Input value={form.telephone ?? ""} onChange={(e) => update("telephone", e.target.value)} /></div>

          <div className="col-span-2">
            <Label>Session de test</Label>
            <Select value={form.session_id ?? ""} onValueChange={handleSession}>
              <SelectTrigger>
                <SelectValue placeholder={activeSessions.length ? "Choisir une session planifiée" : "Aucune session — à créer dans Paramètres"} />
              </SelectTrigger>
              <SelectContent>
                {activeSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.date_test).toLocaleString("fr-FR")}{s.libelle ? ` — ${s.libelle}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Les sessions se créent dans <b>Paramètres → Sessions de tests</b>.
            </p>
          </div>

          <div>
            <Label>Statut</Label>
            <Select value={form.statut ?? "en_attente"} onValueChange={(v) => update("statut", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUTS.map((s) => <SelectItem key={s} value={s}>{STATUT_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Observations</Label><Textarea rows={2} value={form.observations ?? ""} onChange={(e) => update("observations", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!form.nom || !form.prenom}
            onClick={async () => { await onSubmit(form); onOpenChange(false); }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
