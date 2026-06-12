import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Trash2, FileCheck } from "lucide-react";
import { useCertificatsAbsence, type CertificatAbsence } from "@/hooks/useVieScolaire";
import { useEleves } from "@/hooks/useEleves";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { generateCertificatAbsencePDF } from "@/lib/generateVieScolairePDF";
import { toast } from "sonner";

export default function VieScolaireCertificats() {
  const { items, loading, create, remove } = useCertificatsAbsence();
  const { eleves } = useEleves();
  const { enseignants } = useEnseignants();
  const { ecoleId } = useEcoleId();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    sujet_type: "eleve" as "eleve" | "enseignant" | "personnel",
    eleve_id: "", enseignant_id: "",
    date_debut: today, date_fin: today,
    motif: "", justifie: true, type_justificatif: "",
    observations: "",
  });
  const reset = () => setForm({
    sujet_type: "eleve", eleve_id: "", enseignant_id: "",
    date_debut: today, date_fin: today, motif: "", justifie: true,
    type_justificatif: "", observations: "",
  });

  const getSujetName = (c: CertificatAbsence) => {
    if (c.eleve_id) { const e = eleves.find(x => x.id === c.eleve_id); return e ? `${e.prenom} ${e.nom}` : "—"; }
    const en = enseignants.find(x => x.id === c.enseignant_id);
    return en ? `${en.prenom} ${en.nom}` : "—";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return items;
    return items.filter(c => c.numero.toLowerCase().includes(s) || getSujetName(c).toLowerCase().includes(s) || c.motif.toLowerCase().includes(s));
  }, [items, search, eleves, enseignants]);

  const handleCreate = async () => {
    if (!form.motif.trim()) return toast.error("Motif requis");
    if (form.sujet_type === "eleve" && !form.eleve_id) return toast.error("Sélectionnez un élève");
    if (form.sujet_type !== "eleve" && !form.enseignant_id) return toast.error("Sélectionnez une personne");
    if (form.date_fin < form.date_debut) return toast.error("Date fin avant date début");
    setSaving(true);
    const cert = await create({
      sujet_type: form.sujet_type,
      eleve_id: form.sujet_type === "eleve" ? form.eleve_id : null,
      enseignant_id: form.sujet_type !== "eleve" ? form.enseignant_id : null,
      date_debut: form.date_debut, date_fin: form.date_fin,
      motif: form.motif, justifie: form.justifie,
      type_justificatif: form.type_justificatif || null,
      observations: form.observations || null,
    });
    setSaving(false);
    if (cert) { setOpen(false); reset(); await handleDownload(cert); }
  };

  const handleDownload = async (c: CertificatAbsence) => {
    if (!ecoleId) return;
    const { data: ecole } = await supabase.from("ecoles").select("*").eq("id", ecoleId).single();
    const eleve = c.eleve_id ? eleves.find(e => e.id === c.eleve_id) : null;
    const ens = c.enseignant_id ? enseignants.find(e => e.id === c.enseignant_id) : null;
    const sujet = eleve
      ? { nom: eleve.nom, prenom: eleve.prenom, matricule: eleve.matricule, classe: (eleve as any).classes?.nom ?? null, type: "eleve" as const }
      : ens
        ? { nom: ens.nom, prenom: ens.prenom, matricule: ens.matricule ?? null, classe: null, type: c.sujet_type as "enseignant" | "personnel" }
        : { nom: "—", prenom: "", type: c.sujet_type };
    const doc = await generateCertificatAbsencePDF({
      ecole: {
        nom: ecole?.nom ?? "Établissement", sigle: ecole?.sigle ?? null,
        adresse: ecole?.adresse ?? null, telephone: ecole?.telephone ?? null,
        logoUrl: ecole?.logo_url ?? null, devise: ecole?.devise ?? null,
        ville: ecole?.ville ?? null, directeur: ecole?.directeur ?? null,
      },
      sujet, numero: c.numero,
      date_debut: c.date_debut, date_fin: c.date_fin,
      motif: c.motif, justifie: c.justifie,
      type_justificatif: c.type_justificatif, observations: c.observations,
    });
    doc.save(`${c.numero}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-primary" />Certificats d'absence</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Délivrance officielle pour élèves, enseignants et personnel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouveau certificat</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Délivrer un certificat d'absence</DialogTitle></DialogHeader>
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
                      placeholder="Sélectionner"
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date début</Label><Input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Date fin</Label><Input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} /></div>
              </div>

              <div className="space-y-1.5">
                <Label>Motif <span className="text-destructive">*</span></Label>
                <Textarea value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} placeholder="Ex : Maladie, deuil familial…" rows={2} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Absence justifiée</Label>
                  <p className="text-xs text-muted-foreground">Pièce justificative validée</p>
                </div>
                <Switch checked={form.justifie} onCheckedChange={v => setForm({ ...form, justifie: v })} />
              </div>

              <div className="space-y-1.5">
                <Label>Type de justificatif</Label>
                <Input value={form.type_justificatif} onChange={e => setForm({ ...form, type_justificatif: e.target.value })} placeholder="Certificat médical, attestation parentale…" />
              </div>

              <div className="space-y-1.5">
                <Label>Observations</Label>
                <Textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Délivrance…" : "Délivrer & télécharger"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="mb-4 max-w-md" />
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun certificat.</TableCell></TableRow>}
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                  <TableCell>{getSujetName(c)}</TableCell>
                  <TableCell className="text-xs">{c.date_debut} → {c.date_fin}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={c.motif}>{c.motif}</TableCell>
                  <TableCell><Badge variant={c.justifie ? "default" : "destructive"}>{c.justifie ? "Justifiée" : "Non justifiée"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(c)}><Download className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
