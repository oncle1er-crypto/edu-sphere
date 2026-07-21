import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useVacancesData } from "../hooks/useVacances";
import { Plus, Trash2 } from "lucide-react";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesHonoraires() {
  const { classes, enseignants, honoraires, loading, save, remove } = useVacancesData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const openNew = () => {
    if (!enseignants[0]) return;
    setForm({ enseignant_id: enseignants[0].id, montant: 0, date_paiement: new Date().toISOString().slice(0, 10), mode: "especes", observation: "" });
    setOpen(true);
  };
  const submit = async () => {
    if (!form.enseignant_id || Number(form.montant) <= 0) return;
    await save("vacances_honoraires", {
      enseignant_id: form.enseignant_id, montant: Number(form.montant),
      date_paiement: form.date_paiement, mode: form.mode, observation: form.observation || null,
    });
    setOpen(false);
  };

  const recap = useMemo(() => enseignants.map((e) => {
    const paye = honoraires.filter((h) => h.enseignant_id === e.id).reduce((s, h) => s + Number(h.montant), 0);
    const reste = Number(e.honoraire_prevu) - paye;
    const statut = paye <= 0 ? "non_paye" : reste <= 0 ? "paye" : "partiel";
    return { ...e, paye, reste, statut };
  }), [enseignants, honoraires]);

  const nomEns = (id: string) => { const e = enseignants.find(x => x.id === id); return e ? `${e.nom} ${e.prenom}` : "—"; };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
        💰 <strong>Calcul automatique</strong> : les honoraires prévus de chaque maître = <strong>500 FCFA × nombre d'élèves inscrits</strong> dans sa classe. Le solde du montant de scolarité revient à l'école. Mise à jour en temps réel à chaque inscription.
      </div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">Honoraires</h2><p className="text-sm text-muted-foreground">Suivi et versement des honoraires aux maîtres.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew} disabled={enseignants.length === 0}><Plus className="h-4 w-4 mr-1" /> Verser un honoraire</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Versement d'honoraire</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Maître *</Label>
                <Select value={form.enseignant_id || ""} onValueChange={(v) => setForm({ ...form, enseignant_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{enseignants.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Montant *</Label><Input type="number" value={form.montant ?? 0} onChange={(e) => setForm({ ...form, montant: Number(e.target.value) })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date_paiement || ""} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Mode</Label>
                <Select value={form.mode || "especes"} onValueChange={(v) => setForm({ ...form, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile money</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Observation</Label><Textarea value={form.observation || ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">Situation par maître</h3>
          {loading ? <p className="text-sm">Chargement…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Maître</TableHead><TableHead>Classe/Matière</TableHead>
                <TableHead>Prévu</TableHead><TableHead>Payé</TableHead><TableHead>Reste</TableHead><TableHead>Statut</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {recap.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Aucun maître.</TableCell></TableRow>}
                {recap.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                    <TableCell>{[classes.find(c => c.id === e.classe_id)?.nom, e.matiere].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>{fmt(Number(e.honoraire_prevu))}</TableCell>
                    <TableCell className="text-emerald-600">{fmt(e.paye)}</TableCell>
                    <TableCell className={e.reste > 0 ? "text-destructive font-semibold" : ""}>{fmt(e.reste)}</TableCell>
                    <TableCell>
                      <Badge variant={e.statut === "paye" ? "default" : e.statut === "partiel" ? "secondary" : "destructive"}>
                        {e.statut === "paye" ? "Payé" : e.statut === "partiel" ? "Partiel" : "Non payé"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">Historique des versements</h3>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Maître</TableHead>
              <TableHead>Montant</TableHead><TableHead>Mode</TableHead><TableHead>Observation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {honoraires.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Aucun versement.</TableCell></TableRow>}
              {honoraires.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.date_paiement}</TableCell>
                  <TableCell>{nomEns(h.enseignant_id)}</TableCell>
                  <TableCell className="font-semibold">{fmt(Number(h.montant))}</TableCell>
                  <TableCell className="capitalize">{h.mode.replace("_", " ")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{h.observation ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ce versement ?")) remove("vacances_honoraires", h.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
