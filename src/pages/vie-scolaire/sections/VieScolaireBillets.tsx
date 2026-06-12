import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { useBilletsSortie, type BilletSortie } from "@/hooks/useVieScolaire";
import { useEleves } from "@/hooks/useEleves";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { generateBilletSortiePDF } from "@/lib/generateVieScolairePDF";
import { toast } from "sonner";

export default function VieScolaireBillets() {
  const { items, loading, create, markReturned, cancel } = useBilletsSortie();
  const { eleves } = useEleves();
  const { enseignants } = useEnseignants();
  const { ecoleId } = useEcoleId();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [returnDialog, setReturnDialog] = useState<BilletSortie | null>(null);
  const [returnTime, setReturnTime] = useState("");

  const [form, setForm] = useState({
    sujet_type: "eleve" as "eleve" | "enseignant" | "personnel",
    eleve_id: "",
    enseignant_id: "",
    motif: "",
    date_sortie: new Date().toISOString().slice(0, 10),
    heure_sortie: new Date().toTimeString().slice(0, 5),
    heure_retour_prevue: "",
    accompagnateur: "",
    destination: "",
    observations: "",
  });

  const resetForm = () => setForm({
    sujet_type: "eleve", eleve_id: "", enseignant_id: "",
    motif: "", date_sortie: new Date().toISOString().slice(0, 10),
    heure_sortie: new Date().toTimeString().slice(0, 5),
    heure_retour_prevue: "", accompagnateur: "", destination: "", observations: "",
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return items;
    return items.filter(b => {
      const sujet = b.eleve_id
        ? eleves.find(e => e.id === b.eleve_id)
        : enseignants.find(e => e.id === b.enseignant_id);
      const name = sujet ? `${sujet.prenom} ${sujet.nom}` : "";
      return b.numero.toLowerCase().includes(s) || name.toLowerCase().includes(s) || b.motif.toLowerCase().includes(s);
    });
  }, [items, search, eleves, enseignants]);

  const getSujetName = (b: BilletSortie) => {
    if (b.eleve_id) {
      const e = eleves.find(x => x.id === b.eleve_id);
      return e ? `${e.prenom} ${e.nom}` : "—";
    }
    const en = enseignants.find(x => x.id === b.enseignant_id);
    return en ? `${en.prenom} ${en.nom}` : "—";
  };

  const handleCreate = async () => {
    if (!form.motif.trim()) return toast.error("Motif requis");
    if (form.sujet_type === "eleve" && !form.eleve_id) return toast.error("Sélectionnez un élève");
    if (form.sujet_type !== "eleve" && !form.enseignant_id) return toast.error("Sélectionnez une personne");
    setSaving(true);
    const billet = await create({
      sujet_type: form.sujet_type,
      eleve_id: form.sujet_type === "eleve" ? form.eleve_id : null,
      enseignant_id: form.sujet_type !== "eleve" ? form.enseignant_id : null,
      motif: form.motif,
      date_sortie: form.date_sortie,
      heure_sortie: form.heure_sortie,
      heure_retour_prevue: form.heure_retour_prevue || null,
      accompagnateur: form.accompagnateur || null,
      destination: form.destination || null,
      observations: form.observations || null,
    });
    setSaving(false);
    if (billet) {
      setOpen(false);
      resetForm();
      // Téléchargement immédiat
      await handleDownload(billet);
    }
  };

  const handleDownload = async (b: BilletSortie) => {
    if (!ecoleId) return;
    const { data: ecole } = await supabase.from("ecoles").select("*").eq("id", ecoleId).single();
    const eleve = b.eleve_id ? eleves.find(e => e.id === b.eleve_id) : null;
    const ens = b.enseignant_id ? enseignants.find(e => e.id === b.enseignant_id) : null;
    const sujet = eleve
      ? { nom: eleve.nom, prenom: eleve.prenom, matricule: eleve.matricule, classe: (eleve as any).classes?.nom ?? null, type: "eleve" as const }
      : ens
        ? { nom: ens.nom, prenom: ens.prenom, matricule: ens.matricule ?? null, classe: null, type: b.sujet_type as "enseignant" | "personnel" }
        : { nom: "—", prenom: "", type: b.sujet_type };
    const doc = await generateBilletSortiePDF({
      ecole: {
        nom: ecole?.nom ?? "Établissement", sigle: ecole?.sigle ?? null,
        adresse: ecole?.adresse ?? null, telephone: ecole?.telephone ?? null,
        logoUrl: ecole?.logo_url ?? null, devise: ecole?.devise ?? null,
        ville: ecole?.ville ?? null, directeur: ecole?.directeur ?? null,
      },
      sujet,
      numero: b.numero, motif: b.motif,
      date_sortie: b.date_sortie, heure_sortie: b.heure_sortie,
      heure_retour_prevue: b.heure_retour_prevue, accompagnateur: b.accompagnateur,
      destination: b.destination, observations: b.observations,
    });
    doc.save(`${b.numero}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-primary" />Billets de sortie</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Délivrer et tracer toutes les sorties exceptionnelles.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau billet</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouveau billet de sortie</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type de bénéficiaire</Label>
                    <Select value={form.sujet_type} onValueChange={(v: any) => setForm({ ...form, sujet_type: v, eleve_id: "", enseignant_id: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eleve">Élève</SelectItem>
                        <SelectItem value="enseignant">Enseignant</SelectItem>
                        <SelectItem value="personnel">Personnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{form.sujet_type === "eleve" ? "Élève" : "Personne"}</Label>
                    {form.sujet_type === "eleve" ? (
                      <SearchableSelect
                        value={form.eleve_id}
                        onValueChange={(v) => setForm({ ...form, eleve_id: v })}
                        placeholder="Sélectionner un élève"
                        searchPlaceholder="Rechercher un élève..."
                        options={eleves.map(e => ({ value: e.id, label: `${e.prenom} ${e.nom} — ${e.matricule}`, keywords: `${e.classe_nom ?? ""}` }))}
                      />
                    ) : (
                      <SearchableSelect
                        value={form.enseignant_id}
                        onValueChange={(v) => setForm({ ...form, enseignant_id: v })}
                        placeholder="Sélectionner"
                        searchPlaceholder="Rechercher..."
                        options={enseignants.map(e => ({ value: e.id, label: `${e.prenom} ${e.nom}` }))}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={form.date_sortie} onChange={e => setForm({ ...form, date_sortie: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Heure sortie</Label>
                    <Input type="time" value={form.heure_sortie} onChange={e => setForm({ ...form, heure_sortie: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Retour prévu</Label>
                    <Input type="time" value={form.heure_retour_prevue} onChange={e => setForm({ ...form, heure_retour_prevue: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Motif <span className="text-destructive">*</span></Label>
                  <Textarea value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} placeholder="Ex : Rendez-vous médical, urgence familiale…" rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Destination</Label>
                    <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Ex : Domicile, CHU Treichville" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Accompagnateur</Label>
                    <Input value={form.accompagnateur} onChange={e => setForm({ ...form, accompagnateur: e.target.value })} placeholder="Parent, tuteur…" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Observations</Label>
                  <Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Émission…" : "Émettre & télécharger"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Input placeholder="Rechercher (numéro, nom, motif)…" value={search} onChange={e => setSearch(e.target.value)} className="mb-4 max-w-md" />
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Date / Heure</TableHead>
                  <TableHead>Retour</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun billet.</TableCell></TableRow>}
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.numero}</TableCell>
                    <TableCell>{getSujetName(b)}</TableCell>
                    <TableCell className="text-xs">{b.date_sortie} • {b.heure_sortie.slice(0,5)}</TableCell>
                    <TableCell className="text-xs">
                      {b.heure_retour_effective ? <span className="text-emerald-600">✓ {b.heure_retour_effective.slice(0,5)}</span> : b.heure_retour_prevue?.slice(0,5) || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={b.motif}>{b.motif}</TableCell>
                    <TableCell>
                      <Badge variant={b.statut === "retourne" ? "default" : b.statut === "annule" ? "destructive" : "secondary"}>
                        {b.statut === "emis" ? "Émis" : b.statut === "retourne" ? "Retourné" : "Annulé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(b)}><Download className="h-4 w-4" /></Button>
                        {b.statut === "emis" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setReturnDialog(b); setReturnTime(new Date().toTimeString().slice(0,5)); }}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!returnDialog} onOpenChange={o => !o && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer le retour</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Billet {returnDialog?.numero}</p>
            <div className="space-y-1.5">
              <Label>Heure de retour effective</Label>
              <Input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={async () => {
              if (returnDialog) await markReturned(returnDialog.id, returnTime);
              setReturnDialog(null);
            }}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
