import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useVacancesData } from "../hooks/useVacances";
import { Plus, Trash2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateVacancesRecuA5 } from "@/lib/generateVacancesRecuA5";
import { toast } from "sonner";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function VacancesPaiements() {
  const { classes, eleves, paiements, loading, save, remove } = useVacancesData();
  const [open, setOpen] = useState(false);
  const [fClasse, setFClasse] = useState<string>("all");
  const [fStatut, setFStatut] = useState<string>("all");
  const [form, setForm] = useState<any>({});

  const openNew = () => {
    const first = eleves[0];
    if (!first) return;
    const cl = classes.find(c => c.id === first.classe_id);
    setForm({
      eleve_id: first.id, classe_id: first.classe_id,
      montant_attendu: Number(cl?.montant ?? 0), montant_paye: Number(cl?.montant ?? 0),
      mode: "especes", date_paiement: new Date().toISOString().slice(0, 10), observation: "",
    });
    setOpen(true);
  };
  const onEleveChange = (id: string) => {
    const e = eleves.find(x => x.id === id);
    const cl = classes.find(c => c.id === e?.classe_id);
    setForm((f: any) => ({ ...f, eleve_id: id, classe_id: e?.classe_id ?? "", montant_attendu: Number(cl?.montant ?? 0), montant_paye: Number(cl?.montant ?? 0) }));
  };
  const submit = async () => {
    if (!form.eleve_id || !form.classe_id) return;
    const paye = Number(form.montant_paye);
    const attendu = Number(form.montant_attendu);
    const statut = paye <= 0 ? "non_paye" : paye >= attendu ? "paye" : "partiel";
    await save("vacances_paiements", {
      eleve_id: form.eleve_id, classe_id: form.classe_id,
      montant_attendu: attendu, montant_paye: paye,
      date_paiement: form.date_paiement, mode: form.mode, statut,
      observation: form.observation || null,
    });
    setOpen(false);
  };

  const filtered = useMemo(() => paiements.filter((p) => {
    if (fClasse !== "all" && p.classe_id !== fClasse) return false;
    if (fStatut !== "all" && p.statut !== fStatut) return false;
    return true;
  }), [paiements, fClasse, fStatut]);

  const totaux = useMemo(() => {
    const byCl: Record<string, number> = {};
    let total = 0;
    filtered.forEach((p) => { byCl[p.classe_id] = (byCl[p.classe_id] ?? 0) + Number(p.montant_paye); total += Number(p.montant_paye); });
    return { byCl, total };
  }, [filtered]);

  const eleveNom = (id: string) => { const e = eleves.find(x => x.id === id); return e ? `${e.nom} ${e.prenom}` : "—"; };
  const classeNom = (id: string) => classes.find(c => c.id === id)?.nom ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Paiements</h2>
          <p className="text-sm text-muted-foreground">Enregistrement des paiements uniques des élèves.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew} disabled={eleves.length === 0}><Plus className="h-4 w-4 mr-1" /> Nouveau paiement</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Élève *</Label>
                <Select value={form.eleve_id || ""} onValueChange={onEleveChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{eleves.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom} — {classeNom(e.classe_id)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Montant attendu</Label><Input type="number" value={form.montant_attendu ?? 0} onChange={(e) => setForm({ ...form, montant_attendu: Number(e.target.value) })} /></div>
              <div><Label>Montant payé *</Label><Input type="number" value={form.montant_paye ?? 0} onChange={(e) => setForm({ ...form, montant_paye: Number(e.target.value) })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date_paiement || ""} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} /></div>
              <div>
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

      <div className="flex flex-col md:flex-row gap-2">
        <Select value={fClasse} onValueChange={setFClasse}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes classes</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fStatut} onValueChange={setFStatut}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
            <SelectItem value="partiel">Partiel</SelectItem>
            <SelectItem value="non_paye">Non payé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <p className="p-4 text-sm">Chargement…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Élève</TableHead><TableHead>Classe</TableHead>
                <TableHead>Attendu</TableHead><TableHead>Payé</TableHead><TableHead>Mode</TableHead>
                <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Aucun paiement.</TableCell></TableRow>}
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date_paiement}</TableCell>
                    <TableCell className="font-medium">{eleveNom(p.eleve_id)}</TableCell>
                    <TableCell>{classeNom(p.classe_id)}</TableCell>
                    <TableCell>{fmt(Number(p.montant_attendu))}</TableCell>
                    <TableCell className="font-semibold">{fmt(Number(p.montant_paye))}</TableCell>
                    <TableCell className="capitalize">{p.mode.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={p.statut === "paye" ? "default" : p.statut === "partiel" ? "secondary" : "destructive"}>
                        {p.statut === "paye" ? "Payé" : p.statut === "partiel" ? "Partiel" : "Non payé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ce paiement ?")) remove("vacances_paiements", p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter>
                  {Object.entries(totaux.byCl).map(([cid, sum]) => (
                    <TableRow key={cid}><TableCell colSpan={4} className="text-right text-xs text-muted-foreground">Total {classeNom(cid)}</TableCell><TableCell colSpan={4} className="font-semibold">{fmt(sum)}</TableCell></TableRow>
                  ))}
                  <TableRow><TableCell colSpan={4} className="text-right font-bold">TOTAL GÉNÉRAL</TableCell><TableCell colSpan={4} className="font-bold text-primary">{fmt(totaux.total)}</TableCell></TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
