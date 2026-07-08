import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useVacancesData, VacEleve } from "../hooks/useVacances";
import { useDraftForm } from "@/hooks/useDraftForm";
import { Plus, Pencil, Trash2, Search, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import VacancesEnrollmentWorkflow from "../components/VacancesEnrollmentWorkflow";

const emptyForm = {
  nom: "", prenom: "", sexe: "M", date_naissance: "", contact_parent: "",
  classe_id: "", etablissement_origine: "", observation: "",
  date_inscription: "",
};

export default function VacancesInscriptions() {
  const { classes, eleves, loading, save, remove } = useVacancesData();
  const [open, setOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [edit, setEdit] = useState<VacEleve | null>(null);
  const [q, setQ] = useState("");
  const [fClasse, setFClasse] = useState<string>("all");
  const [fStatut, setFStatut] = useState<string>("all");
  // Brouillon persistant (sessionStorage) : uniquement pour la création.
  const [form, setForm, clearDraft, resetForm] = useDraftForm<any>(
    "vacances-inscription-new",
    emptyForm,
    { enabled: !edit }
  );

  // Réouvre le dialog automatiquement si un brouillon non vide existe au montage.
  useEffect(() => {
    if (!edit && (form?.nom || form?.prenom)) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEdit(null);
    // Ne pas écraser un brouillon existant : ne pré-remplit que si vide.
    if (!form?.nom && !form?.prenom) {
      resetForm({
        ...emptyForm,
        classe_id: classes[0]?.id ?? "",
        date_inscription: new Date().toISOString().slice(0, 10),
      });
    }
    setOpen(true);
  };
  const openEdit = (e: VacEleve) => { setEdit(e); setForm({ ...e }); setOpen(true); };
  const submit = async () => {
    if (!form.nom?.trim() || !form.prenom?.trim()) {
      toast.error("Nom et prénoms sont obligatoires");
      return;
    }
    if (!form.classe_id) {
      toast.error("Sélectionnez une classe");
      return;
    }
    const result = await save("vacances_eleves", {
      nom: form.nom.trim(), prenom: form.prenom.trim(),
      sexe: form.sexe || null,
      date_naissance: form.date_naissance || null,
      contact_parent: form.contact_parent || null,
      classe_id: form.classe_id,
      etablissement_origine: form.etablissement_origine || null,
      observation: form.observation || null,
      date_inscription: form.date_inscription || new Date().toISOString().slice(0, 10),
    }, edit?.id);
    if (result) {
      setOpen(false);
      if (!edit) clearDraft();
      setEdit(null);
    }
  };

  const filtered = useMemo(() => eleves.filter((e) => {
    if (fClasse !== "all" && e.classe_id !== fClasse) return false;
    if (fStatut !== "all" && e.statut_paiement !== fStatut) return false;
    if (q && !`${e.nom} ${e.prenom}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [eleves, q, fClasse, fStatut]);

  const classeNom = (id: string) => classes.find((c) => c.id === id)?.nom ?? "—";

  return (
    <div className="space-y-4">
      {classes.length === 0 && !loading && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Aucune classe disponible</p>
            <p>Créez d'abord au moins une classe dans l'onglet <strong>Classes</strong> avant de pouvoir inscrire un élève.</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Inscriptions</h2>
          <p className="text-sm text-muted-foreground">Élèves inscrits aux cours de vacances (indépendants de la liste principale).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew} disabled={classes.length === 0}><Plus className="h-4 w-4 mr-1" /> Nouvelle inscription</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{edit ? "Modifier" : "Nouvelle inscription"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Prénoms *</Label><Input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div>
                <Label>Sexe</Label>
                <Select value={form.sexe || "M"} onValueChange={(v) => setForm({ ...form, sexe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Date de naissance</Label><Input type="date" value={form.date_naissance || ""} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} /></div>
              <div className="col-span-2"><Label>Contact parent</Label><Input value={form.contact_parent || ""} onChange={(e) => setForm({ ...form, contact_parent: e.target.value })} placeholder="+225…" /></div>
              <div className="col-span-2">
                <Label>Classe demandée *</Label>
                <Select value={form.classe_id || ""} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{classes.filter(c => c.actif).map((c) => <SelectItem key={c.id} value={c.id}>{c.nom} — {Number(c.montant).toLocaleString("fr-FR")} FCFA</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Établissement d'origine</Label><Input value={form.etablissement_origine || ""} onChange={(e) => setForm({ ...form, etablissement_origine: e.target.value })} /></div>
              <div><Label>Date d'inscription</Label><Input type="date" value={form.date_inscription || ""} onChange={(e) => setForm({ ...form, date_inscription: e.target.value })} /></div>
              <div className="col-span-2"><Label>Observation</Label><Textarea value={form.observation || ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}>{edit ? "Enregistrer" : "Inscrire"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
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
                <TableHead>Nom</TableHead><TableHead>Prénoms</TableHead><TableHead>Sexe</TableHead>
                <TableHead>Classe</TableHead><TableHead>Contact</TableHead><TableHead>Inscrit le</TableHead>
                <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Aucun élève.</TableCell></TableRow>}
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nom}</TableCell>
                    <TableCell>{e.prenom}</TableCell>
                    <TableCell>{e.sexe ?? "—"}</TableCell>
                    <TableCell>{classeNom(e.classe_id)}</TableCell>
                    <TableCell>{e.contact_parent ?? "—"}</TableCell>
                    <TableCell>{e.date_inscription}</TableCell>
                    <TableCell>
                      <Badge variant={e.statut_paiement === "paye" ? "default" : e.statut_paiement === "partiel" ? "secondary" : "destructive"}>
                        {e.statut_paiement === "paye" ? "Payé" : e.statut_paiement === "partiel" ? "Partiel" : "Non payé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Supprimer ${e.nom} ${e.prenom} ?`)) remove("vacances_eleves", e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
