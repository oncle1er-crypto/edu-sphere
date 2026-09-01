import { Fragment, useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  Wallet, Download, Loader2, Plus, CheckCircle2, BadgeCheck, FileText,
  ChevronDown, ChevronRight, CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBulletinsPaie } from "@/hooks/useBulletinsPaie";
import { useRhPaie, normaliserStatut, type RhBulletinLigne } from "@/hooks/useRhPaie";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useNiveau } from "@/context/NiveauContext";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import PreparePaieDialog from "../components/PreparePaieDialog";
import { downloadBulletinPaiePDF } from "@/lib/generateBulletinPaiePDF";
import { bornesMois, verifierCoherenceBulletin } from "@/lib/payrollBulletin";
import { toast } from "sonner";
import { messageErreurBase } from "@/lib/dbErrorMessages";

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}
const num = (n: number) => n.toLocaleString("fr-FR");
const pct = (t: number | null) => (t === null ? "—" : `${String(t).replace(".", ",")} %`);

const STATUT_BADGE: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-muted text-muted-foreground hover:bg-muted" },
  valide: { label: "Validé", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  paye: { label: "Payé", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
};

export default function StaffPayroll() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const {
    bulletins: bulletinsRaw, loading, apercu, genererBrouillons, validerBulletin, payerBulletin,
    lignesBulletin, refetch,
  } = useRhPaie(mois, annee);
  const { addBulletin } = useBulletinsPaie(mois, annee);
  const { enseignants } = useEnseignants();
  const { isGlobal, matchesCycle, label: niveauLabel } = useNiveau();
  const ecole = useEcoleInfo();
  // Un bulletin sans cycle (personnel commun, ex. administration) reste visible dans
  // toutes les vues — même logique que useEnseignants/useDepenses/Reports.tsx.
  const bulletins = useMemo(
    () => (isGlobal ? bulletinsRaw : bulletinsRaw.filter((b) => matchesCycle(b.personnel_cycle_id))),
    [bulletinsRaw, isGlobal, matchesCycle],
  );
  const [open, setOpen] = useState(false);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lignes, setLignes] = useState<Record<string, RhBulletinLigne[]>>({});
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ enseignant_id: "", salaire_brut: "", retenues: "" });

  const kpis = useMemo(() => ({
    brut: bulletins.reduce((s, b) => s + b.salaire_brut, 0),
    charges: bulletins.reduce((s, b) => s + b.total_charges_patronales, 0),
    net: bulletins.reduce((s, b) => s + b.net_a_payer, 0),
    cout: bulletins.reduce((s, b) => s + b.cout_employeur, 0),
  }), [bulletins]);

  const anneesOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const toggleRow = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!lignes[id]) {
      const l = await lignesBulletin(id);
      setLignes((prev) => ({ ...prev, [id]: l }));
    }
  };

  const handleSubmit = async () => {
    if (!form.enseignant_id || !form.salaire_brut) {
      toast.error("Membre du personnel et salaire brut requis");
      return;
    }
    const brut = Number(form.salaire_brut);
    const ret = Number(form.retenues) || 0;
    await addBulletin({
      enseignant_id: form.enseignant_id,
      salaire_brut: brut,
      retenues: ret,
      net_a_payer: brut - ret,
    });
    setForm({ enseignant_id: "", salaire_brut: "", retenues: "" });
    setOpen(false);
    refetch();
  };

  const exporter = () => {
    if (bulletins.length === 0) {
      toast.error("Aucun bulletin à exporter");
      return;
    }
    const rows = [
      ["Membre du personnel", "Poste", "Mois", "Année", "Brut", "Retenues", "Net", "Charges patronales", "Coût employeur", "Statut"],
      ...bulletins.map((b) => [
        b.personnel_nom, b.personnel_poste ?? "", String(b.mois), String(b.annee),
        String(b.salaire_brut), String(b.retenues), String(b.net_a_payer),
        String(b.total_charges_patronales), String(b.cout_employeur),
        normaliserStatut(b.statut),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paie-${annee}-${String(mois).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV généré");
  };

  const imprimerBulletin = async (bulletinId: string, enseignantId: string) => {
    setPdfBusy(bulletinId);
    try {
      const b = bulletins.find((x) => x.id === bulletinId);
      if (!b) return;
      const detail = lignes[bulletinId] ?? (await lignesBulletin(bulletinId));
      setLignes((prev) => ({ ...prev, [bulletinId]: detail }));
      const erreursCoherence = verifierCoherenceBulletin(detail, {
        total_gains: b.total_gains,
        total_retenues: b.retenues,
        net_a_payer: b.net_a_payer,
        total_charges_patronales: b.total_charges_patronales,
        cout_employeur: b.cout_employeur,
        brut_imposable: b.brut_imposable,
        base_cnps: b.base_cnps,
      });
      if (erreursCoherence.length > 0) {
        toast.error("Bulletin non imprimé : incohérence détectée", {
          description: erreursCoherence.join(" "),
        });
        return;
      }
      const { data: p, error } = await supabase
        .from("enseignants")
        .select("nom, prenom, matricule, poste, specialite, departement, date_embauche, numero_cnps, numero_cmu, parts_fiscales, type_contrat")
        .eq("id", enseignantId)
        .maybeSingle();
      if (error) { toast.error(messageErreurBase(error)); return; }
      const { data: cumulsRows, error: cumulsError } = await supabase
        .from("bulletins_paie")
        .select("total_gains, brut_imposable, retenues, net_a_payer, base_cnps, total_charges_patronales")
        .eq("enseignant_id", enseignantId)
        .eq("annee", b.annee)
        .lte("mois", b.mois);
      if (cumulsError) { toast.error(messageErreurBase(cumulsError)); return; }
      const cumuls = (cumulsRows ?? []).reduce((acc, row) => ({
        total_gains: acc.total_gains + Number(row.total_gains ?? 0),
        brut_imposable: acc.brut_imposable + Number(row.brut_imposable ?? 0),
        total_retenues: acc.total_retenues + Number(row.retenues ?? 0),
        net_a_payer: acc.net_a_payer + Number(row.net_a_payer ?? 0),
        base_cnps: acc.base_cnps + Number(row.base_cnps ?? 0),
        total_charges_patronales: acc.total_charges_patronales + Number(row.total_charges_patronales ?? 0),
      }), {
        total_gains: 0, brut_imposable: 0, total_retenues: 0,
        net_a_payer: 0, base_cnps: 0, total_charges_patronales: 0,
      });
      const periode = bornesMois(b.mois, b.annee);
      await downloadBulletinPaiePDF({
        ecole: {
          nom: ecole?.nom ?? "École",
          sigle: ecole?.sigle ?? null,
          adresse: ecole?.adresse ?? null,
          telephone: ecole?.telephone ?? null,
          email: ecole?.email ?? null,
          logo_url: ecole?.logo_url ?? null,
        },
        salarie: {
          nom: p?.nom ?? "—",
          prenom: p?.prenom ?? "—",
          matricule: p?.matricule ?? null,
          poste: p?.poste ?? p?.specialite ?? null,
          departement: p?.departement ?? null,
          date_embauche: p?.date_embauche ?? null,
          numero_cnps: p?.numero_cnps ?? null,
          numero_cmu: p?.numero_cmu ?? null,
          parts_fiscales: p?.parts_fiscales ?? null,
          anciennete_annees: b.anciennete_annees,
          type_contrat: p?.type_contrat ?? null,
        },
        mois: b.mois,
        annee: b.annee,
        statut: normaliserStatut(b.statut),
        lignes: detail.map((l) => ({
          libelle: l.libelle, base: l.base, taux: l.taux, montant: l.montant, type: l.type,
        })),
        total_gains: b.total_gains || b.salaire_brut,
        total_retenues: b.retenues,
        net_a_payer: b.net_a_payer,
        total_charges_patronales: b.total_charges_patronales,
        cout_employeur: b.cout_employeur,
        brut_imposable: b.brut_imposable,
        base_cnps: b.base_cnps,
        date_paiement: b.date_paiement,
        periode_debut: periode.debut,
        periode_fin: periode.fin,
        cumuls_annuels: cumuls,
      });
    } finally {
      setPdfBusy(null);
    }
  };

  const renderDetail = (id: string) => {
    const l = lignes[id];
    if (!l) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      );
    }
    const blocs: { titre: string; type: string }[] = [
      { titre: "Gains", type: "gain" },
      { titre: "Retenues", type: "retenue" },
      { titre: "Charges patronales", type: "charge_patronale" },
    ];
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3 bg-muted/40 rounded-md">
        {blocs.map((bloc) => {
          const rows = l.filter((x) => x.type === bloc.type);
          const total = rows.reduce((s, x) => s + x.montant, 0);
          return (
            <div key={bloc.type} className="border rounded-md bg-background overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold bg-muted">{bloc.titre}</p>
              <div className="divide-y">
                {rows.map((r) => (
                  <div key={r.id} className="px-3 py-2 text-xs flex justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.libelle}</span>
                      <span className="text-muted-foreground">
                        Base {r.base ? num(r.base) : "—"} · Taux {pct(r.taux)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-semibold">{num(r.montant)}</span>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Aucune ligne</p>
                )}
              </div>
              <div className="px-3 py-2 text-xs font-bold flex justify-between border-t bg-muted/60">
                <span>Total {bloc.titre.toLowerCase()}</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Wallet className="h-5 w-5" />}
        title="Paie & salaires"
        description={`${MOIS_LABELS[mois - 1]} ${annee} · ${bulletins.length} bulletin(s)${isGlobal ? "" : ` · ${niveauLabel}`}`}
        hideSave
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2">
            <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOIS_LABELS.map((l, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anneesOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4" />Bulletin manuel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau bulletin de paie</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Membre du personnel *</Label>
                    <SearchableSelect
                      value={form.enseignant_id}
                      onValueChange={(v) => setForm({ ...form, enseignant_id: v })}
                      placeholder="Choisir..."
                      searchPlaceholder="Rechercher..."
                      options={enseignants.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Salaire brut (FCFA) *</Label>
                      <Input type="number" value={form.salaire_brut}
                        onChange={(e) => setForm({ ...form, salaire_brut: e.target.value })} />
                    </div>
                    <div>
                      <Label>Retenues (FCFA)</Label>
                      <Input type="number" value={form.retenues}
                        onChange={(e) => setForm({ ...form, retenues: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">Créer le bulletin</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={exporter}>
              <Download className="h-4 w-4" />Tout exporter
            </Button>
            <Button size="sm" onClick={() => setPrepareOpen(true)}>
              <CalendarClock className="h-4 w-4" />Fiches de paie du mois
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Masse salariale brute</p>
              <p className="text-xl font-extrabold font-display mt-1 text-primary">{fmt(kpis.brut)}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Charges patronales</p>
              <p className="text-xl font-extrabold font-display mt-1 text-orange-600">{fmt(kpis.charges)}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net à payer</p>
              <p className="text-xl font-extrabold font-display mt-1 text-emerald-600">{fmt(kpis.net)}</p>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Coût employeur total</p>
              <p className="text-xl font-extrabold font-display mt-1 text-blue-600">{fmt(kpis.cout)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Membre</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Retenues</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Charges patronales</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulletins.map((b) => {
                  const st = normaliserStatut(b.statut);
                  const badge = STATUT_BADGE[st];
                  const isOpen = expanded === b.id;
                  return (
                    <Fragment key={b.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleRow(b.id)}
                      >
                        <TableCell>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          {b.personnel_nom}
                          <span className="block text-xs text-muted-foreground">
                            {b.personnel_matricule ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{b.personnel_poste ?? "—"}</TableCell>
                        <TableCell className="text-right">{fmt(b.salaire_brut)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">-{fmt(b.retenues)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(b.net_a_payer)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(b.total_charges_patronales)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 flex-wrap">
                            {st === "brouillon" && (
                              <Button size="sm" variant="ghost" onClick={() => validerBulletin(b.id)}>
                                <BadgeCheck className="h-4 w-4" />Valider
                              </Button>
                            )}
                            {st === "valide" && (
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                tone="warning"
                                confirmTitle="Marquer ce bulletin comme payé ?"
                                confirmDescription="Deux dépenses comptables seront automatiquement créées : le net versé et les charges patronales. Cette action est définitive."
                                confirmLabel="Marquer payé"
                                onConfirm={async () => {
                                  await payerBulletin(b.id, new Date().toISOString().slice(0, 10));
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />Marquer payé
                              </ConfirmButton>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={pdfBusy === b.id}
                              onClick={() => imprimerBulletin(b.id, b.enseignant_id)}
                            >
                              {pdfBusy === b.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              Bulletin PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-2">{renderDetail(b.id)}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {bulletins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      Aucun bulletin pour ce mois. Cliquez sur « Fiches de paie du mois » pour préparer les brouillons.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </SettingsSection>

      <PreparePaieDialog
        open={prepareOpen}
        onOpenChange={setPrepareOpen}
        apercu={apercu}
        genererBrouillons={genererBrouillons}
        onDone={(m, a) => { setMois(m); setAnnee(a); refetch(); }}
      />
    </div>
  );
}
