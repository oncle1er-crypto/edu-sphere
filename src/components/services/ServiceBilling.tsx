import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Receipt, Plus, Loader2, Wallet, Printer, History, Pencil, ArrowUpDown, ArrowUp, ArrowDown, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useEleves } from "@/hooks/useEleves";
import { InvoicePaymentDialog, type InvoiceForPayment } from "@/pages/finances/components/InvoicePaymentDialog";
import { InvoicePaymentsHistoryDialog } from "@/pages/finances/components/InvoicePaymentsHistoryDialog";
import { InvoiceEditDialog, type EditableInvoice } from "@/pages/finances/components/InvoiceEditDialog";
import { downloadInvoiceReceipt } from "@/lib/downloadInvoiceReceipt";
import { RelanceImpayesDialog, type CibleRelance } from "@/components/services/RelanceImpayesDialog";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

export type ServiceKind = "cantine" | "transport";

interface Row {
  id: string;
  numero: string;
  eleve_id: string;
  eleve_nom: string;
  classe_nom: string;
  libelle: string;
  montant: number;
  montant_paye: number;
  statut: string;
  date_echeance: string;
  ecole_id: string;
  categorie: string;
  classe_id?: string | null;
}

type SortKey = "date_echeance" | "libelle" | "statut";
type SortDir = "asc" | "desc";

const CONFIG = {
  cantine: {
    titre: "Facturation cantine",
    description: "Génération séquentielle, encaissement et suivi des factures de restauration.",
    libelleDefaut: "Cantine - Mensuel",
    montantDefaut: "15000",
    prefixe: "CTN",
    dialogTitre: "Nouvelle facture cantine",
    vide: "Aucune facture cantine.",
  },
  transport: {
    titre: "Facturation transport",
    description: "Génération séquentielle, encaissement et suivi des factures d'abonnement.",
    libelleDefaut: "Transport - Mensuel",
    montantDefaut: "18000",
    prefixe: "TRP",
    dialogTitre: "Nouvelle facture transport",
    vide: "Aucune facture transport.",
  },
} as const;

/** Écran de facturation partagé Cantine / Transport. */
export default function ServiceBilling({ service }: { service: ServiceKind }) {
  const cfg = CONFIG[service];
  const { ecoleId } = useEcoleId();
  const { keepClasse } = useNiveauFilters();
  const { anneeId } = useAnneeId();
  const { eleves } = useEleves();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payFor, setPayFor] = useState<InvoiceForPayment | null>(null);
  const [historyFor, setHistoryFor] = useState<InvoiceForPayment | null>(null);
  const [editFor, setEditFor] = useState<EditableInvoice | null>(null);
  const [statutFilter, setStatutFilter] = useState<string>("retard");
  const [sortKey, setSortKey] = useState<SortKey>("date_echeance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [relanceCibles, setRelanceCibles] = useState<CibleRelance[] | null>(null);
  const [form, setForm] = useState({
    eleve_id: "",
    libelle: String(cfg.libelleDefaut),
    montant: String(cfg.montantDefaut),
    date_echeance: new Date().toISOString().slice(0, 10),
  });


  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("factures")
      .select("id, numero, libelle, montant, montant_paye, statut, date_echeance, ecole_id, categorie, eleve_id, eleves(nom, prenom, classe_id, classes(nom))")
      .eq("ecole_id", ecoleId).eq("categorie", service)
      .order("created_at", { ascending: false });
    setRows(((data ?? []) as any[]).map((f) => ({
      id: f.id, numero: f.numero, libelle: f.libelle,
      montant: Number(f.montant), montant_paye: Number(f.montant_paye),
      statut: f.statut, date_echeance: f.date_echeance,
      ecole_id: f.ecole_id, categorie: f.categorie,
      eleve_id: f.eleve_id,
      eleve_nom: f.eleves ? `${f.eleves.nom} ${f.eleves.prenom}` : "?",
      classe_nom: f.eleves?.classes?.nom ?? "—",
      classe_id: f.eleves?.classe_id ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId, service]);

  const jour = new Date().toISOString().slice(0, 10);
  const estEnRetard = (f: Row) =>
    f.statut !== "annulee" && f.date_echeance <= jour && f.montant_paye < f.montant;

  const effectiveStatus = (f: Row) => {
    if (f.statut === "annulee") return "annulee";
    if (f.montant_paye >= f.montant) return "payee";
    if (estEnRetard(f)) return "retard";
    return f.montant_paye > 0 ? "partielle" : f.statut;
  };

  const displayed = useMemo(() => {
    let list = rows.filter((r) => keepClasse(r.classe_id));
    if (statutFilter === "retard") list = list.filter(estEnRetard);
    else if (statutFilter !== "all") list = list.filter((r) => effectiveStatus(r) === statutFilter);
    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "date_echeance") { av = a.date_echeance; bv = b.date_echeance; }
      else if (sortKey === "libelle") { av = a.libelle?.toLowerCase() ?? ""; bv = b.libelle?.toLowerCase() ?? ""; }
      else { av = effectiveStatus(a); bv = effectiveStatus(b); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, statutFilter, sortKey, sortDir, keepClasse]);

  /** Une cible par élève, avec le cumul de son reste dû échu (lignes affichées). */
  const ciblesAffichees: CibleRelance[] = useMemo(() => {
    const map = new Map<string, CibleRelance>();
    displayed.filter(estEnRetard).forEach((f) => {
      const reste = Math.max(0, f.montant - f.montant_paye);
      const prev = map.get(f.eleve_id);
      if (prev) prev.reste += reste;
      else map.set(f.eleve_id, {
        eleve_id: f.eleve_id, eleve_nom: f.eleve_nom, classe_nom: f.classe_nom, reste,
      });
    });
    return Array.from(map.values());
  }, [displayed]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k
    ? <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />
    : sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;

  const handleAdd = async () => {
    if (!form.eleve_id || !ecoleId || !anneeId) return;
    setSaving(true);
    const numero = `${cfg.prefixe}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { error } = await supabase.from("factures").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, annee_id: anneeId,
      numero, libelle: form.libelle, montant: parseFloat(form.montant) || 0,
      date_echeance: form.date_echeance, statut: "emise", categorie: service,
    });
    if (error) toast.error(messageErreurBase(error));
    else { toast.success("Facture créée"); await fetchData(); }
    setOpen(false); setSaving(false);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const focusHandled = useRef(false);
  useEffect(() => {
    const statut = searchParams.get("statut");
    if (statut) setStatutFilter(statut);
    const fid = searchParams.get("facture");
    if (!fid || loading || focusHandled.current) {
      if (statut) {
        const next = new URLSearchParams(searchParams);
        next.delete("statut");
        setSearchParams(next, { replace: true });
      }
      return;
    }
    const r = rows.find((x) => x.id === fid);
    if (!r) return;
    focusHandled.current = true;
    openPayDialog(r);
    const next = new URLSearchParams(searchParams);
    next.delete("facture");
    next.delete("statut");
    setSearchParams(next, { replace: true });
  }, [searchParams, rows, loading]);

  const openPayDialog = (r: Row) => {
    setPayFor({
      id: r.id, numero: r.numero, libelle: r.libelle,
      montant: r.montant, montant_paye: r.montant_paye,
      eleve_nom: r.eleve_nom, ecole_id: r.ecole_id, categorie: r.categorie,
    });
  };

  const reprint = async (r: Row) => {
    if (r.montant_paye <= 0) { toast.info("Aucun paiement à réimprimer"); return; }
    await downloadInvoiceReceipt({ ecoleId: r.ecole_id, factureId: r.id });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection title={cfg.titre} description={cfg.description} icon={<Receipt className="h-5 w-5" />} hideSave>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Une seule période est facturée à la fois par abonné : la suivante s'ouvre après l'échéance de la précédente,
          et uniquement si celle-ci est soldée. La relance SMS n'est proposée que sur le filtre <b>En retard</b>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="retard">En retard</SelectItem>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="emise">Émise (à venir)</SelectItem>
              <SelectItem value="partielle">Partielle</SelectItem>
              <SelectItem value="payee">Payée</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>
          {statutFilter === "retard" && (
            <Button size="sm" variant="outline" disabled={ciblesAffichees.length === 0}
              onClick={() => setRelanceCibles(ciblesAffichees)}
              title={ciblesAffichees.length === 0 ? "Aucune facture en retard" : "Relancer par SMS les familles en retard"}>
              <MessageSquare className="h-4 w-4" /> Relancer les impayés ({ciblesAffichees.length})
            </Button>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvelle facture</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{cfg.dialogTitre}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <FieldRow label="Élève *">
                <Select value={form.eleve_id} onValueChange={(v) => setForm((p) => ({ ...p, eleve_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{eleves.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Libellé"><Input value={form.libelle} onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))} /></FieldRow>
              <FieldRow label="Montant (FCFA)"><Input type="number" value={form.montant} onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))} /></FieldRow>
              <FieldRow label="Échéance"><Input type="date" value={form.date_echeance} onChange={(e) => setForm((p) => ({ ...p, date_echeance: e.target.value }))} /></FieldRow>
              <Button className="w-full" onClick={handleAdd} disabled={saving || !form.eleve_id}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("libelle")}>Libellé<SortIcon k="libelle" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date_echeance")}>Échéance / Période<SortIcon k="date_echeance" /></TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Réglé</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("statut")}>Statut<SortIcon k="statut" /></TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((f) => {
              const st = effectiveStatus(f);
              const solde = st === "payee";
              const retard = st === "retard";
              const annulee = st === "annulee";
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                  <TableCell className="font-medium">{f.eleve_nom}</TableCell>
                  <TableCell>{f.libelle}</TableCell>
                  <TableCell>{f.date_echeance}</TableCell>
                  <TableCell className="text-right">{f.montant.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right text-primary">{f.montant_paye.toLocaleString("fr-FR")}</TableCell>
                  <TableCell>
                    <Badge variant={solde ? "default" : retard ? "destructive" : annulee ? "outline" : "secondary"}>
                      {solde ? "Payée" : retard ? "En retard" : annulee ? "Annulée" : f.montant_paye > 0 ? "Partielle" : "À venir"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {!annulee && (
                      <Button size="sm" variant="ghost" onClick={() => setEditFor({ id: f.id, numero: f.numero, libelle: f.libelle, date_echeance: f.date_echeance })} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {retard && (
                      <Button size="sm" variant="ghost" title="Relancer cette famille par SMS"
                        onClick={() => setRelanceCibles([{
                          eleve_id: f.eleve_id, eleve_nom: f.eleve_nom, classe_nom: f.classe_nom,
                          reste: Math.max(0, f.montant - f.montant_paye),
                        }])}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!solde && !annulee && (
                      <Button size="sm" variant="outline" onClick={() => openPayDialog(f)}>
                        <Wallet className="h-3.5 w-3.5" /> Encaisser
                      </Button>
                    )}
                    {f.montant_paye > 0 && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setHistoryFor({
                          id: f.id, numero: f.numero, libelle: f.libelle,
                          montant: f.montant, montant_paye: f.montant_paye,
                          eleve_nom: f.eleve_nom, ecole_id: f.ecole_id, categorie: f.categorie,
                        })} title="Historique / Annuler">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reprint(f)} title="Réimprimer le reçu">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {displayed.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                {statutFilter === "retard" ? "Aucune facture en retard — rien à relancer." : cfg.vide}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InvoicePaymentDialog
        facture={payFor}
        open={!!payFor}
        onOpenChange={(o) => !o && setPayFor(null)}
        onPaymentRecorded={fetchData}
      />

      <InvoicePaymentsHistoryDialog
        facture={historyFor}
        open={!!historyFor}
        onOpenChange={(o) => !o && setHistoryFor(null)}
        onChanged={fetchData}
      />

      <InvoiceEditDialog
        facture={editFor}
        open={!!editFor}
        onOpenChange={(o) => !o && setEditFor(null)}
        onSaved={fetchData}
      />

      <RelanceImpayesDialog
        cibles={relanceCibles ?? []}
        ecoleId={ecoleId}
        service={service}
        open={!!relanceCibles}
        onOpenChange={(o) => !o && setRelanceCibles(null)}
        onDone={fetchData}
      />
    </SettingsSection>
  );
}
