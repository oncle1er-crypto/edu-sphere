import { useEffect, useMemo, useState, Fragment } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Users, Plus, Search, Loader2, Trash2, Receipt, Printer, History, Wallet, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useEleves } from "@/hooks/useEleves";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useGrilleServices } from "@/hooks/useGrilleServices";
import { useServiceInvoicing } from "@/hooks/useServiceInvoicing";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { InvoicePaymentDialog, type InvoiceForPayment } from "@/pages/finances/components/InvoicePaymentDialog";
import { InvoicePaymentsHistoryDialog } from "@/pages/finances/components/InvoicePaymentsHistoryDialog";
import { downloadInvoiceReceipt } from "@/lib/downloadInvoiceReceipt";
import { toast } from "sonner";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { sortByEleve } from "@/lib/sortEleves";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { computeServiceKpis } from "@/components/services/serviceKpis";
import { ServiceKpiCards } from "@/components/services/ServiceKpiCards";
import { ServiceEcheancesAlert } from "@/components/services/ServiceEcheancesAlert";
import { ResilierAbonnementDialog, type AbonnementResiliable } from "@/components/services/ResilierAbonnementDialog";
import { RelanceImpayesDialog, type CibleRelance } from "@/components/services/RelanceImpayesDialog";

interface Abonnement {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  classe_nom: string;
  classe_id: string | null;
  regime: string | null;
  grille_id: string | null;
  grille_libelle: string | null;
  periodicite: string | null;
  montant_total: number;
  statut: string;
}

interface FactureLite {
  id: string; numero: string; libelle: string;
  montant: number; montant_paye: number;
  date_echeance: string; statut: string;
  ecole_id: string; categorie: string;
}

export default function CanteenSubscribers() {
  const { ecoleId } = useEcoleId();
  const { keepClasse } = useNiveauFilters();
  const { eleves } = useEleves();
  const { anneeId } = useAnneeId();
  const { lignes: grilles } = useGrilleServices("cantine");
  const { generateFor, isGenerating, generateBulk, isBulkGenerating } = useServiceInvoicing("cantine", () => fetchData());
  const { isAdmin } = useIsAdmin();

  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);
  const [factures, setFactures] = useState<Record<string, FactureLite[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", regime: "normal", grille_id: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Abonnement | null>(null);
  const [payFor, setPayFor] = useState<InvoiceForPayment | null>(null);
  const [historyFor, setHistoryFor] = useState<InvoiceForPayment | null>(null);
  const [toResilier, setToResilier] = useState<AbonnementResiliable | null>(null);
  const [relanceOpen, setRelanceOpen] = useState(false);

  const fetchData = async () => {
    if (!ecoleId) return;
    const { data } = await supabase
      .from("abonnements_cantine")
      .select("id, eleve_id, regime, statut, grille_id, eleves(nom, prenom, classe_id, classes(nom)), grille_tarifs_services(libelle, periodicite, montant_total)")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false });

    const list: Abonnement[] = sortByEleve((data ?? []) as any[], (a) => ({ nom: a.eleves?.nom, prenom: a.eleves?.prenom })).map((a) => ({
      id: a.id,
      eleve_id: a.eleve_id,
      eleve_nom: a.eleves ? `${a.eleves.nom} ${a.eleves.prenom}` : "?",
      classe_nom: a.eleves?.classes?.nom ?? "—",
      classe_id: a.eleves?.classe_id ?? null,
      regime: a.regime,
      grille_id: a.grille_id,
      grille_libelle: a.grille_tarifs_services?.libelle ?? null,
      periodicite: a.grille_tarifs_services?.periodicite ?? null,
      montant_total: Number(a.grille_tarifs_services?.montant_total ?? 0),
      statut: a.statut,
    }));
    setAbonnements(list);

    const eleveIds = Array.from(new Set(list.map((a) => a.eleve_id)));
    if (eleveIds.length) {
      const { data: fData } = await supabase.from("factures")
        .select("id, numero, libelle, montant, montant_paye, date_echeance, statut, ecole_id, categorie, eleve_id")
        .eq("ecole_id", ecoleId).eq("categorie", "cantine")
        .in("eleve_id", eleveIds)
        .order("date_echeance");
      const grouped: Record<string, FactureLite[]> = {};
      ((fData ?? []) as any[]).forEach((f) => {
        (grouped[f.eleve_id] ||= []).push({
          id: f.id, numero: f.numero, libelle: f.libelle,
          montant: Number(f.montant), montant_paye: Number(f.montant_paye),
          date_echeance: f.date_echeance, statut: f.statut,
          ecole_id: f.ecole_id, categorie: f.categorie,
        });
      });
      setFactures(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ecoleId]);

  const handleAdd = async () => {
    if (!form.eleve_id || !form.grille_id || !ecoleId || !anneeId) {
      toast.error("Sélectionnez un élève et un tarif");
      return;
    }
    setSaving(true);
    const grille = grilles.find((g) => g.id === form.grille_id);
    const { error } = await supabase.from("abonnements_cantine").insert({
      ecole_id: ecoleId, eleve_id: form.eleve_id, annee_id: anneeId,
      regime: form.regime,
      grille_id: form.grille_id,
      montant_mensuel: grille?.periodicite === "mensuel"
        ? Math.round((grille?.montant_total ?? 0) / Math.max(grille?.tranches.length ?? 1, 1))
        : Math.round((grille?.montant_total ?? 0) / 12),
    });
    if (error) toast.error(messageErreurBase(error));
    else { toast.success("Abonnement créé"); setForm({ eleve_id: "", regime: "normal", grille_id: "" }); await fetchData(); }
    setOpen(false);
    setSaving(false);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    const hasPaid = (factures[toDelete.eleve_id] ?? []).some((f) => f.montant_paye > 0);
    if (hasPaid) {
      toast.error("Impossible de supprimer : des paiements existent. Désactivez plutôt l'abonnement.");
      setToDelete(null);
      return;
    }
    const { error } = await supabase.from("abonnements_cantine").delete().eq("id", toDelete.id);
    if (error) toast.error(messageErreurBase(error));
    else { toast.success("Abonnement supprimé"); await fetchData(); }
    setToDelete(null);
  };

  const reprint = async (f: FactureLite) => {
    if (f.montant_paye <= 0) { toast.info("Aucun paiement à réimprimer"); return; }
    await downloadInvoiceReceipt({ ecoleId: f.ecole_id, factureId: f.id });
  };

  const filtered = abonnements.filter((a) =>
    keepClasse(a.classe_id) && (
      a.eleve_nom.toLowerCase().includes(search.toLowerCase()) ||
    a.classe_nom.toLowerCase().includes(search.toLowerCase()))
  );

  const abonnesActifs = filtered.filter((a) => a.statut === "actif").length;

  const kpis = useMemo(() => {
    const facs = filtered.flatMap((a) => factures[a.eleve_id] ?? []);
    return computeServiceKpis(facs);
  }, [filtered, factures]);

  const ciblesRelance: CibleRelance[] = useMemo(() => {
    const jour = new Date().toISOString().slice(0, 10);
    return filtered
      .map((a) => {
        const reste = (factures[a.eleve_id] ?? [])
          .filter((f) => f.statut !== "annulee" && f.date_echeance <= jour)
          .reduce((s, f) => s + Math.max(0, f.montant - f.montant_paye), 0);
        return { abonnement_id: a.id, eleve_id: a.eleve_id, eleve_nom: a.eleve_nom, classe_nom: a.classe_nom, reste };
      })
      .filter((c) => c.reste > 0);
  }, [filtered, factures]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <SettingsSection icon={<Users className="h-5 w-5" />} title={`Abonnés (${filtered.length})`} description="Abonnements cantine, adossés à la grille tarifaire (mensuel ou trimestriel)." hideSave>
      <ServiceKpiCards abonnesActifs={abonnesActifs} kpis={kpis} service="cantine" />
      <ServiceEcheancesAlert kpis={kpis} service="cantine" onRelancer={() => setRelanceOpen(true)} />

      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Les reçus <b>double-souche</b> se réimpriment via l'icône <Printer className="inline h-3 w-3" /> à côté de chaque facture (ci-dessous ou dans <b>Facturation cantine</b>).
          Un élève qui arrête la cantine en cours d'année doit être <b>résilié</b> (bouton « Arrêter ») : les échéances futures sont annulées, les impayés passés restent dus.
        </p>
      </div>


      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={isBulkGenerating || filtered.length === 0}
            onClick={() => generateBulk(filtered.filter((a) => a.statut === "actif" && a.grille_id).map((a) => a.id))}>
            {isBulkGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Générer factures (masse)
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouvel abonnement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel abonnement cantine</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <FieldRow label="Élève *">
                  <SearchableSelect
                    value={form.eleve_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, eleve_id: v }))}
                    placeholder="Sélectionner un élève"
                    searchPlaceholder="Rechercher un élève..."
                    options={eleves.map((e) => ({
                      value: e.id, label: `${e.nom} ${e.prenom}`,
                      keywords: `${e.matricule ?? ""} ${e.classe_nom ?? ""}`,
                    }))}
                  />
                </FieldRow>
                <FieldRow label="Régime">
                  <Select value={form.regime} onValueChange={(v) => setForm((p) => ({ ...p, regime: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="vegetarien">Végétarien</SelectItem>
                      <SelectItem value="halal">Halal</SelectItem>
                      <SelectItem value="allergie">Allergie</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Tarif (grille) *">
                  <Select value={form.grille_id} onValueChange={(v) => setForm((p) => ({ ...p, grille_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={grilles.length === 0 ? "Aucun tarif configuré" : "Sélectionner"} /></SelectTrigger>
                    <SelectContent>
                      {grilles.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.libelle} · {g.periodicite} · {Number(g.montant_total).toLocaleString("fr-FR")} F
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                {grilles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Créez d'abord un tarif dans <b>Finances → Grille tarifaire — Cantine</b>.
                  </p>
                )}
                <Button className="w-full" onClick={handleAdd} disabled={saving || !form.eleve_id || !form.grille_id}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead>Périodicité</TableHead>
              <TableHead className="text-right">Total annuel</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const eleveFacs = factures[a.eleve_id] ?? [];
              const isOpen = expanded === a.id;
              return (
                <Fragment key={a.id}>
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.eleve_nom}</TableCell>
                    <TableCell><Badge variant="secondary">{a.classe_nom}</Badge></TableCell>
                    <TableCell className="text-sm">{a.grille_libelle ?? <span className="text-muted-foreground italic">non défini</span>}</TableCell>
                    <TableCell><Badge variant="outline">{a.periodicite ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{a.montant_total.toLocaleString("fr-FR")} F</TableCell>
                    <TableCell><Badge variant={a.statut === "actif" ? "default" : "secondary"}>{a.statut}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : a.id)}>
                        {eleveFacs.length} facture{eleveFacs.length > 1 ? "s" : ""}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!a.grille_id || isGenerating} onClick={() => generateFor(a.id)}>
                        <Receipt className="h-3.5 w-3.5" /> Générer
                      </Button>
                      {isAdmin && (
                        <>
                          {a.statut === "actif" && (
                            <Button size="sm" variant="ghost" title="Arrêter l'abonnement en cours d'année"
                              onClick={() => setToResilier({ id: a.id, eleve_nom: a.eleve_nom })}>
                              Arrêter
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Supprimer" onClick={() => setToDelete(a)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30">
                        {eleveFacs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">Aucune facture — cliquez sur <b>Générer</b>.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">N°</TableHead>
                                <TableHead className="text-xs">Libellé</TableHead>
                                <TableHead className="text-xs">Échéance</TableHead>
                                <TableHead className="text-xs text-right">Montant</TableHead>
                                <TableHead className="text-xs text-right">Réglé</TableHead>
                                <TableHead className="text-xs">Statut</TableHead>
                                <TableHead className="text-xs text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eleveFacs.map((f) => {
                                const solde = f.montant_paye >= f.montant;
                                return (
                                  <TableRow key={f.id}>
                                    <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                                    <TableCell className="text-xs">{f.libelle}</TableCell>
                                    <TableCell className="text-xs">{f.date_echeance}</TableCell>
                                    <TableCell className="text-right text-xs">{f.montant.toLocaleString("fr-FR")}</TableCell>
                                    <TableCell className="text-right text-xs text-primary">{f.montant_paye.toLocaleString("fr-FR")}</TableCell>
                                    <TableCell><Badge variant={solde ? "default" : f.montant_paye > 0 ? "secondary" : "destructive"}>{solde ? "Payée" : f.montant_paye > 0 ? "Partielle" : "Impayée"}</Badge></TableCell>
                                    <TableCell className="text-right space-x-1">
                                      {!solde && (
                                        <Button size="sm" variant="outline" onClick={() => setPayFor({ id: f.id, numero: f.numero, libelle: f.libelle, montant: f.montant, montant_paye: f.montant_paye, eleve_nom: a.eleve_nom, ecole_id: f.ecole_id, categorie: f.categorie })}>
                                          <Wallet className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {f.montant_paye > 0 && (
                                        <>
                                          <Button size="sm" variant="ghost" onClick={() => setHistoryFor({ id: f.id, numero: f.numero, libelle: f.libelle, montant: f.montant, montant_paye: f.montant_paye, eleve_nom: a.eleve_nom, ecole_id: f.ecole_id, categorie: f.categorie })} title="Historique">
                                            <History className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => reprint(f)} title="Réimprimer reçu">
                                            <Printer className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucun abonnement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet abonnement ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'abonnement de <b>{toDelete?.eleve_nom}</b> sera supprimé définitivement.
              Les factures déjà encaissées bloqueront la suppression — utilisez <b>Arrêter</b> dans ce cas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResilierAbonnementDialog
        abonnement={toResilier}
        service="cantine"
        open={!!toResilier}
        onOpenChange={(o) => !o && setToResilier(null)}
        onDone={fetchData}
      />

      <RelanceImpayesDialog
        cibles={ciblesRelance}
        ecoleId={ecoleId}
        service="cantine"
        open={relanceOpen}
        onOpenChange={setRelanceOpen}
        onDone={fetchData}
      />

      <InvoicePaymentDialog facture={payFor} open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)} onPaymentRecorded={fetchData} />
      <InvoicePaymentsHistoryDialog facture={historyFor} open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)} onChanged={fetchData} />

    </SettingsSection>
  );
}
