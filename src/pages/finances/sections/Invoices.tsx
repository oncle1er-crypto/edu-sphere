import { useState } from "react";
import { FileText, Plus, Search, Download, Eye, Trash2, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_FACTURE } from "@/components/help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useFactures } from "@/hooks/useFactures";
import { useEleves } from "@/hooks/useEleves";

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  payee: "Payée",
  partielle: "Partielle",
  en_retard: "En retard",
  annulee: "Annulée",
};

const STATUT_CLASS: Record<string, string> = {
  payee: "bg-accent/15 text-primary border-accent/30",
  partielle: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  en_retard: "bg-destructive/15 text-destructive border-destructive/30",
  brouillon: "bg-muted text-muted-foreground border-border",
  emise: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  annulee: "bg-muted text-muted-foreground border-border line-through",
};

export default function Invoices() {
  const { factures, loading, addFacture, updateStatut, deleteFacture } = useFactures();
  const { eleves } = useEleves();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", libelle: "Frais de scolarité", montant: "", date_echeance: "", notes: "" });

  const filtered = factures.filter((f) => {
    const matchQ = !q || f.numero.toLowerCase().includes(q.toLowerCase()) ||
      `${f.eleve_nom} ${f.eleve_prenom}`.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === "all" || f.statut === statusFilter;
    return matchQ && matchStatus;
  });

  const handleSubmit = async () => {
    if (!form.eleve_id || !form.montant || !form.date_echeance) return;
    await addFacture({
      eleve_id: form.eleve_id,
      libelle: form.libelle,
      montant: Number(form.montant),
      date_echeance: form.date_echeance,
      notes: form.notes || undefined,
    });
    setForm({ eleve_id: "", libelle: "Frais de scolarité", montant: "", date_echeance: "", notes: "" });
    setOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      title="Factures & frais de scolarité"
      description="Émettez, suivez et exportez les factures de vos élèves."
      icon={<FileText className="h-5 w-5" />}
      hideSave
    >
      <HelpBanner storageKey="finances-invoices" title="Gérer les factures">
        Créez une facture, suivez son statut, téléchargez le PDF ou supprimez un brouillon. Les factures <strong>partielles</strong> indiquent qu'un acompte a été versé.
      </HelpBanner>
      <StatusLegend title="Statuts des factures" items={STATUTS_FACTURE} />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une facture ou un élève..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="emise">Émise</SelectItem>
              <SelectItem value="payee">Payée</SelectItem>
              <SelectItem value="partielle">Partielle</SelectItem>
              <SelectItem value="en_retard">En retard</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nouvelle facture</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une facture</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Élève</Label>
                  <SearchableSelect
                    value={form.eleve_id}
                    onValueChange={(v) => setForm({ ...form, eleve_id: v })}
                    placeholder="Sélectionner un élève"
                    searchPlaceholder="Rechercher un élève..."
                    options={eleves.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}`, keywords: `${e.matricule ?? ""} ${e.classe_nom ?? ""}` }))}
                  />
                </div>
                <div>
                  <Label>Libellé</Label>
                  <Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Montant (FCFA)</Label>
                    <Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
                  </div>
                  <div>
                    <Label>Date d'échéance</Label>
                    <Input type="date" value={form.date_echeance} onChange={(e) => setForm({ ...form, date_echeance: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={!form.eleve_id || !form.montant || !form.date_echeance}>
                  Créer la facture
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>N° facture</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune facture trouvée</TableCell></TableRow>
            )}
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                <TableCell className="font-medium">{f.eleve_nom} {f.eleve_prenom}</TableCell>
                <TableCell className="text-muted-foreground">{f.classe_nom ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{f.montant.toLocaleString()} FCFA</TableCell>
                <TableCell className="text-right">{f.montant_paye.toLocaleString()} FCFA</TableCell>
                <TableCell className="text-muted-foreground">{new Date(f.date_echeance).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  <Select value={f.statut} onValueChange={(v) => updateStatut(f.id, v)}>
                    <SelectTrigger className="h-7 w-28 text-xs p-1">
                      <Badge variant="outline" className={STATUT_CLASS[f.statut] ?? ""}>{STATUT_LABEL[f.statut] ?? f.statut}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUT_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <ConfirmButton
                    onConfirm={() => deleteFacture(f.id)}
                    confirmTitle="Supprimer cette facture ?"
                    confirmDescription="Cette action est irréversible."
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
