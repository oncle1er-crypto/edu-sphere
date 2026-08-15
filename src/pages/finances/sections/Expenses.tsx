import { Wallet, Plus, Loader2, Search, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical, Pencil, Trash2, Check, X, RotateCcw, Download, Printer } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDepenses, type Depense, type DepenseEditable } from "@/hooks/useDepenses";
import { useFournisseurs } from "@/hooks/useFournisseurs";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useNiveau, niveauOfCycle, NIVEAU_LABELS } from "@/context/NiveauContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EXPENSE_CATEGORIES as CATEGORIES } from "@/lib/expenseCategories";
import { plageFinanciereAnnee } from "@/lib/academicRange";
import { generateDepensesExport, generateBonSortiePDF } from "@/lib/generateFinanceReports";

const COMMUN = "__commun__";
const TOUS = "__tous__";
const PAGE_SIZE = 25;

type SortKey = "libelle" | "categorie" | "niveau" | "fournisseur" | "montant" | "date" | "statut";
type SortDir = "asc" | "desc";

const todayIso = () => new Date().toISOString().slice(0, 10);

const STATUT_LABEL: Record<string, string> = { en_attente: "En attente", validee: "Validée", rejetee: "Rejetée" };
const STATUT_BADGE: Record<string, string> = {
  en_attente: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  validee: "bg-accent/15 text-primary border-accent/30",
  rejetee: "bg-destructive/10 text-destructive border-destructive/30",
};

type ConfirmAction = { type: "delete" | "valider" | "reouvrir"; depense: Depense };

export default function Expenses() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  // Inclut la fenêtre d'anticipation de rentrée (voir academicRange.ts) :
  // sans elle, les dépenses enregistrées entre la fin de l'année précédente
  // et le début officiel de l'année active (ex: préparatifs de rentrée en
  // juillet/août) disparaissaient de la liste alors qu'elles existent bien
  // en base — même incohérence déjà corrigée dans useBilanComptable.
  const range = periodLoading || !activeAnnee ? undefined : plageFinanciereAnnee(activeAnnee);
  const { depenses, loading, addDepense, updateDepense, deleteDepense, validerDepense, validerPlusieurs, rejeterDepense, reouvrirDepense } = useDepenses(range);
  const { fournisseurs } = useFournisseurs();
  const { cycles, niveau, isGlobal, cycleIds, label } = useNiveau();
  const ecoleInfo = useEcoleInfo();

  // ── Création ──
  const [open, setOpen] = useState(false);
  const emptyForm = {
    libelle: "",
    categorie: "",
    montant: "",
    fournisseur_id: "",
    cycle_id: COMMUN,
    date_depense: todayIso(),
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const cycleName = useCallback((id?: string | null) => cycles.find((c) => c.id === id)?.nom ?? null, [cycles]);

  // En vue niveau, on préselectionne le premier cycle du niveau courant
  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, cycle_id: isGlobal ? COMMUN : cycleIds[0] ?? COMMUN }));
  }, [open, isGlobal, cycleIds.join(",")]);

  // ── Filtres / recherche ──
  const [query, setQuery] = useState("");
  const [filterCategorie, setFilterCategorie] = useState(TOUS);
  const [filterStatut, setFilterStatut] = useState(TOUS);
  const [filterNiveau, setFilterNiveau] = useState(TOUS);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Tri / pagination ──
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Édition ──
  const [editing, setEditing] = useState<Depense | null>(null);
  const [editForm, setEditForm] = useState<{ libelle: string; categorie: string; montant: string; fournisseur_id: string; cycle_id: string; date_depense: string; notes: string }>({
    libelle: "", categorie: "", montant: "", fournisseur_id: "", cycle_id: COMMUN, date_depense: todayIso(), notes: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Rejet (motif requis) ──
  const [rejectTarget, setRejectTarget] = useState<Depense | null>(null);
  const [rejectMotif, setRejectMotif] = useState("");

  // ── Confirmation (suppression / validation / réouverture) ──
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [exporting, setExporting] = useState(false);
  const [printingBonId, setPrintingBonId] = useState<string | null>(null);

  // ── Sélection multiple (validation groupée) ──
  // Seules les dépenses "en_attente" sont sélectionnables : mêmes règles que
  // l'action Valider individuelle (une dépense déjà validée/rejetée ne se
  // "revalide" pas silencieusement).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkValiderConfirm, setBulkValiderConfirm] = useState(false);
  const [bulkValidating, setBulkValidating] = useState(false);

  // Budget tracking by category (uniquement les dépenses validées)
  const parCategorie = CATEGORIES.map((cat) => {
    const items = depenses.filter((d) => d.categorie === cat && d.statut === "validee");
    const spent = items.reduce((s, d) => s + d.montant, 0);
    return { name: cat, spent };
  }).filter((c) => c.spent > 0);

  const totalDepenses = depenses.filter((d) => d.statut === "validee").reduce((s, d) => s + d.montant, 0);

  // ── Filtrage ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return depenses.filter((d) => {
      if (filterCategorie !== TOUS && d.categorie !== filterCategorie) return false;
      if (filterStatut !== TOUS && d.statut !== filterStatut) return false;
      if (filterNiveau !== TOUS) {
        if (filterNiveau === COMMUN ? d.cycle_id != null : d.cycle_id !== filterNiveau) return false;
      }
      if (dateFrom && d.date_depense < dateFrom) return false;
      if (dateTo && d.date_depense > dateTo) return false;
      if (q) {
        const hay = `${d.libelle} ${d.reference ?? ""} ${d.fournisseur_nom ?? ""} ${d.categorie ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [depenses, query, filterCategorie, filterStatut, filterNiveau, dateFrom, dateTo]);

  // ── Tri ──
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "libelle":    av = a.libelle.toLowerCase(); bv = b.libelle.toLowerCase(); break;
        case "categorie":  av = a.categorie ?? ""; bv = b.categorie ?? ""; break;
        case "niveau":     av = cycleName(a.cycle_id) ?? ""; bv = cycleName(b.cycle_id) ?? ""; break;
        case "fournisseur":av = a.fournisseur_nom ?? ""; bv = b.fournisseur_nom ?? ""; break;
        case "montant":    av = a.montant; bv = b.montant; break;
        case "statut":     av = a.statut; bv = b.statut; break;
        case "date":
        default:           av = a.date_depense; bv = b.date_depense; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir, cycleName]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelected(new Set());
  }, [query, filterCategorie, filterStatut, filterNiveau, dateFrom, dateTo]);

  const visibles = sorted.slice(0, visibleCount);
  const visiblesSelectionnables = visibles.filter((d) => d.statut === "en_attente");
  const toutSelectionne = visiblesSelectionnables.length > 0 && visiblesSelectionnables.every((d) => selected.has(d.id));

  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelected((s) => {
      if (toutSelectionne) {
        const next = new Set(s);
        visiblesSelectionnables.forEach((d) => next.delete(d.id));
        return next;
      }
      const next = new Set(s);
      visiblesSelectionnables.forEach((d) => next.add(d.id));
      return next;
    });
  };

  // Filtré depuis la liste complète (pas seulement visibles) et re-vérifié sur
  // le statut réel au moment de l'action : une sélection ne peut jamais
  // entraîner la validation silencieuse d'une dépense déjà validée/rejetée,
  // même si l'état de sélection contenait un id devenu obsolète entre-temps.
  const selectedDepenses = useMemo(
    () => depenses.filter((d) => selected.has(d.id) && d.statut === "en_attente"),
    [depenses, selected],
  );

  const handleBulkValider = async () => {
    setBulkValidating(true);
    await validerPlusieurs(selectedDepenses.map((d) => d.id));
    setBulkValidating(false);
    setBulkValiderConfirm(false);
    setSelected(new Set());
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "date" || k === "montant" ? "desc" : "asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };
  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:text-primary ${className}`} onClick={() => toggleSort(k)}>
      {children}<SortIcon k={k} />
    </TableHead>
  );

  const resetFilters = () => {
    setQuery(""); setFilterCategorie(TOUS); setFilterStatut(TOUS); setFilterNiveau(TOUS); setDateFrom(""); setDateTo("");
  };
  const filtresActifs = query || filterCategorie !== TOUS || filterStatut !== TOUS || filterNiveau !== TOUS || dateFrom || dateTo;

  const handleSubmit = async () => {
    if (!form.libelle.trim()) { toast.error("Le libellé est requis."); return; }
    const montant = Number(form.montant);
    if (!(montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    if (form.date_depense > todayIso()) { toast.error("La date ne peut pas être dans le futur."); return; }
    await addDepense({
      libelle: form.libelle.trim(),
      categorie: form.categorie || null,
      montant,
      fournisseur_id: form.fournisseur_id || null,
      cycle_id: form.cycle_id === COMMUN ? null : form.cycle_id,
      date_depense: form.date_depense,
      notes: form.notes.trim() || null,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  const openEdit = (d: Depense) => {
    setEditing(d);
    setEditForm({
      libelle: d.libelle,
      categorie: d.categorie ?? "",
      montant: String(d.montant),
      fournisseur_id: d.fournisseur_id ?? "",
      cycle_id: d.cycle_id ?? COMMUN,
      date_depense: d.date_depense,
      notes: d.notes ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.libelle.trim()) { toast.error("Le libellé est requis."); return; }
    const montant = Number(editForm.montant);
    if (!(montant > 0)) { toast.error("Le montant doit être supérieur à zéro."); return; }
    if (editForm.date_depense > todayIso()) { toast.error("La date ne peut pas être dans le futur."); return; }
    setSaving(true);
    const patch: DepenseEditable = {
      libelle: editForm.libelle.trim(),
      categorie: editForm.categorie || null,
      montant,
      fournisseur_id: editForm.fournisseur_id || null,
      cycle_id: editForm.cycle_id === COMMUN ? null : editForm.cycle_id,
      date_depense: editForm.date_depense,
      notes: editForm.notes.trim() || null,
    };
    await updateDepense(editing.id, patch);
    setSaving(false);
    setEditing(null);
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, depense } = confirmAction;
    if (type === "delete") await deleteDepense(depense.id);
    else if (type === "valider") await validerDepense(depense.id);
    else if (type === "reouvrir") await reouvrirDepense(depense.id);
    setConfirmAction(null);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!rejectMotif.trim()) { toast.error("Un motif de rejet est requis."); return; }
    await rejeterDepense(rejectTarget.id, rejectMotif);
    setRejectTarget(null);
    setRejectMotif("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateDepensesExport(
        { nom: ecoleInfo?.nom ?? "École", adresse: ecoleInfo?.adresse, telephone: ecoleInfo?.telephone, email: ecoleInfo?.email, logoUrl: ecoleInfo?.logo_url },
        sorted,
        { periode: dateFrom || dateTo ? `${dateFrom || "…"} au ${dateTo || "…"}` : (label ?? "Toutes périodes") },
      );
    } catch (e: unknown) {
      toast.error("Erreur lors de l'export : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  // Le numéro (BSC-YYYY-00001) n'existe qu'une fois la dépense validée — assigné
  // par le trigger DB à la validation, jamais généré côté client (cf. migration
  // 20260815180000). Garde défensive : normalement toujours présent ici puisque
  // le bouton n'est visible que pour statut === "validee".
  const handlePrintBon = async (d: Depense) => {
    if (!d.numero_bon_sortie) {
      toast.error("Numéro de bon indisponible — rafraîchissez la page et réessayez.");
      return;
    }
    setPrintingBonId(d.id);
    try {
      await generateBonSortiePDF(
        { nom: ecoleInfo?.nom ?? "École", adresse: ecoleInfo?.adresse, telephone: ecoleInfo?.telephone, email: ecoleInfo?.email, logoUrl: ecoleInfo?.logo_url },
        {
          numero: d.numero_bon_sortie,
          libelle: d.libelle,
          categorie: d.categorie,
          fournisseur_nom: d.fournisseur_nom,
          montant: d.montant,
          date_depense: d.date_depense,
          niveau_label: cycleName(d.cycle_id),
          notes: d.notes,
          valide_le: d.valide_le ?? d.created_at,
        },
      );
    } catch (e: unknown) {
      toast.error("Erreur lors de la génération du bon : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPrintingBonId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {parCategorie.length > 0 && (
        <SettingsSection title="Répartition par catégorie" description="Dépenses validées par poste." icon={<Wallet className="h-5 w-5" />} hideSave>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parCategorie.map((c) => {
              const pct = totalDepenses > 0 ? Math.round((c.spent / totalDepenses) * 100) : 0;
              return (
                <Card key={c.name} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <span className="text-xs font-bold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{c.spent.toLocaleString("fr-FR")} FCFA</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </SettingsSection>
      )}

      <SettingsSection title={`Dépenses (${sorted.length}${sorted.length !== depenses.length ? ` / ${depenses.length}` : ""})`} description="Toutes les sorties de trésorerie enregistrées." icon={<Wallet className="h-5 w-5" />} hideSave>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 h-9 w-[180px]" />
            </div>
            <Select value={filterCategorie} onValueChange={setFilterCategorie}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Toutes catégories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Tous statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="validee">Validée</SelectItem>
                <SelectItem value="rejetee">Rejetée</SelectItem>
              </SelectContent>
            </Select>
            {cycles.length > 0 && (
              <Select value={filterNiveau} onValueChange={setFilterNiveau}>
                <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Tous niveaux</SelectItem>
                  <SelectItem value={COMMUN}>Commun</SelectItem>
                  {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px]" title="Du" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px]" title="Au" />
            {filtresActifs && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-xs">
                <X className="h-3.5 w-3.5" />Réinitialiser
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedDepenses.length > 0 && (
              <Button size="sm" onClick={() => setBulkValiderConfirm(true)}>
                <Check className="h-4 w-4" />Valider la sélection ({selectedDepenses.length})
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={exporting || sorted.length === 0} onClick={handleExport}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />Nouvelle dépense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer une dépense</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Libellé *</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Montant (FCFA) *</Label><Input type="number" min="1" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></div>
                    <div><Label>Date</Label><Input type="date" max={todayIso()} value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} /></div>
                  </div>
                  <div><Label>Catégorie</Label>
                    <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {fournisseurs.length > 0 && (
                    <div><Label>Fournisseur</Label>
                      <Select value={form.fournisseur_id} onValueChange={(v) => setForm({ ...form, fournisseur_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                        <SelectContent>{fournisseurs.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {cycles.length > 0 && (
                    <div>
                      <Label>Imputation par niveau</Label>
                      <Select value={form.cycle_id} onValueChange={(v) => setForm({ ...form, cycle_id: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={COMMUN}>Commun (réparti entre les niveaux)</SelectItem>
                          {cycles.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nom} — {NIVEAU_LABELS[niveauOfCycle(c)]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        « Commun » : la dépense sera répartie au prorata dans les bilans par niveau.
                      </p>
                    </div>
                  )}
                  <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel" /></div>
                  <Button onClick={handleSubmit} className="w-full">Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  {visiblesSelectionnables.length > 0 && (
                    <Checkbox
                      checked={toutSelectionne}
                      onCheckedChange={toggleSelectAllVisible}
                      aria-label="Sélectionner toutes les dépenses en attente affichées"
                    />
                  )}
                </TableHead>
                <Th k="libelle">Libellé</Th>
                <Th k="categorie">Catégorie</Th>
                <Th k="niveau">Niveau</Th>
                <Th k="fournisseur">Fournisseur</Th>
                <Th k="montant" className="text-right">Montant</Th>
                <Th k="date">Date</Th>
                <Th k="statut">Statut</Th>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((e) => (
                <TableRow key={e.id} data-state={selected.has(e.id) ? "selected" : undefined}>
                  <TableCell>
                    {e.statut === "en_attente" && (
                      <Checkbox
                        checked={selected.has(e.id)}
                        onCheckedChange={() => toggleSelected(e.id)}
                        aria-label={`Sélectionner « ${e.libelle} »`}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{e.libelle}</TableCell>
                  <TableCell className="text-muted-foreground">{e.categorie ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.cycle_id ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                      {cycleName(e.cycle_id) ?? "Commun"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.fournisseur_nom ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{e.montant.toLocaleString("fr-FR")} FCFA</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(e.date_depense).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUT_BADGE[e.statut] ?? ""}
                      title={
                        e.statut === "rejetee" && e.motif_rejet ? `Motif : ${e.motif_rejet}`
                        : e.statut === "validee" && e.numero_bon_sortie ? `Bon de sortie ${e.numero_bon_sortie}`
                        : undefined
                      }
                    >
                      {STATUT_LABEL[e.statut] ?? e.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {e.statut === "en_attente" && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" />Modifier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "valider", depense: e })}><Check className="h-3.5 w-3.5" />Valider</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setRejectTarget(e); setRejectMotif(""); }}><X className="h-3.5 w-3.5" />Rejeter</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "delete", depense: e })} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                        {e.statut === "validee" && (
                          <DropdownMenuItem onClick={() => handlePrintBon(e)} disabled={printingBonId === e.id}>
                            {printingBonId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            Imprimer le bon
                          </DropdownMenuItem>
                        )}
                        {(e.statut === "validee" || e.statut === "rejetee") && (
                          <DropdownMenuItem onClick={() => setConfirmAction({ type: "reouvrir", depense: e })}>
                            <RotateCcw className="h-3.5 w-3.5" />Réouvrir pour correction
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  {depenses.length === 0 ? "Aucune dépense enregistrée." : "Aucune dépense ne correspond aux filtres."}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {visibleCount < sorted.length && (
          <div className="flex justify-center mt-3">
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Afficher plus ({sorted.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* ── Édition ── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la dépense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Libellé *</Label><Input value={editForm.libelle} onChange={(e) => setEditForm({ ...editForm, libelle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Montant (FCFA) *</Label><Input type="number" min="1" value={editForm.montant} onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" max={todayIso()} value={editForm.date_depense} onChange={(e) => setEditForm({ ...editForm, date_depense: e.target.value })} /></div>
            </div>
            <div><Label>Catégorie</Label>
              <Select value={editForm.categorie} onValueChange={(v) => setEditForm({ ...editForm, categorie: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {fournisseurs.length > 0 && (
              <div><Label>Fournisseur</Label>
                <Select value={editForm.fournisseur_id} onValueChange={(v) => setEditForm({ ...editForm, fournisseur_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>{fournisseurs.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {cycles.length > 0 && (
              <div><Label>Imputation par niveau</Label>
                <Select value={editForm.cycle_id} onValueChange={(v) => setEditForm({ ...editForm, cycle_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COMMUN}>Commun (réparti entre les niveaux)</SelectItem>
                    {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom} — {NIVEAU_LABELS[niveauOfCycle(c)]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Notes</Label><Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rejet (motif requis) ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeter la dépense</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">« {rejectTarget?.libelle} » — {rejectTarget?.montant.toLocaleString("fr-FR")} FCFA</p>
          <div><Label>Motif du rejet *</Label><Textarea rows={3} value={rejectMotif} onChange={(e) => setRejectMotif(e.target.value)} placeholder="Expliquez pourquoi cette dépense est rejetée…" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>Rejeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation validation groupée ── */}
      <AlertDialog open={bulkValiderConfirm} onOpenChange={(o) => !o && setBulkValiderConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider {selectedDepenses.length} dépense(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDepenses.reduce((s, d) => s + d.montant, 0).toLocaleString("fr-FR")} FCFA au total.
              Elles seront comptées dans le bilan comptable et le grand livre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkValidating}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkValider} disabled={bulkValidating}>
              {bulkValidating && <Loader2 className="h-4 w-4 animate-spin" />}Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirmation suppression / validation / réouverture ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" && "Supprimer cette dépense ?"}
              {confirmAction?.type === "valider" && "Valider cette dépense ?"}
              {confirmAction?.type === "reouvrir" && "Réouvrir cette dépense pour correction ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmAction?.depense.libelle} » — {confirmAction?.depense.montant.toLocaleString("fr-FR")} FCFA.
              {confirmAction?.type === "delete" && " Cette action est irréversible."}
              {confirmAction?.type === "valider" && " Elle sera comptée dans le bilan comptable et le grand livre."}
              {confirmAction?.type === "reouvrir" && " Elle repassera au statut \"En attente\" et pourra être modifiée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmAction} className={confirmAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
