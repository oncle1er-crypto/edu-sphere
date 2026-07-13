import { Receipt, Loader2, Download, Eye, MoreVertical, Pencil, Merge, Wallet } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";
import { fcfa } from "../useFinanceData";
import { PAIEMENT_MODE_META, modeMeta } from "../scolarite-data";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { generateRecuPDF } from "@/lib/generateDocumentsPDF";
import { toast } from "sonner";

interface PaiementRecu {
  id: string;
  reference: string | null;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  matricule: string;
  classe: string;
  photo_url?: string | null;
  montant: number;
  date_paiement: string;
  mode: string;
  tranche_id: string | null;
  tranche_numero: number | null;
}

interface EcoleInfo {
  nom: string;
  sigle?: string;
  devise: string;
  adresse: string;
  telephone: string;
  email?: string;
  logo_url?: string | null;
}

type ViewMode = "detail" | "day" | "day_tranche";

const MODE_OPTIONS = Object.entries(PAIEMENT_MODE_META).map(([id, m]) => ({ id, label: m.label }));

const jourKey = (iso: string) => iso.slice(0, 10);
const jourLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export default function Receipts() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const [recus, setRecus] = useState<PaiementRecu[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecole, setEcole] = useState<EcoleInfo>({
    nom: "Complexe Scolaire La Providence de Don Orione",
    sigle: "CSP",
    devise: "Foi, Savoir, Excellence",
    adresse: "Abidjan, Côte d'Ivoire",
    telephone: "+225 00 00 00 00",
    email: "",
    logo_url: null,
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ViewMode>("detail");

  // Édition du mode
  const [editing, setEditing] = useState<PaiementRecu | null>(null);
  const [editMode, setEditMode] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("ecoles")
      .select("nom, sigle, devise, adresse, telephone, email, logo_url")
      .eq("id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEcole({
            nom: data.nom || "Complexe Scolaire La Providence de Don Orione",
            sigle: data.sigle || "",
            devise: data.devise || "Foi, Savoir, Excellence",
            adresse: data.adresse || "Abidjan, Côte d'Ivoire",
            telephone: data.telephone || "+225 00 00 00 00",
            email: data.email || "",
            logo_url: data.logo_url || null,
          });
        }
      });
  }, [ecoleId]);

  const fetchRecus = () => {
    if (!ecoleId || periodLoading || !activeAnnee?.id) { if (!ecoleId && !ecoleLoading) setLoading(false); return; }
    setLoading(true);
    supabase
      .from("paiements")
      .select(
        "id, reference, montant, date_paiement, mode, eleve_id, tranche_id, " +
        "tranches!inner(numero, frais_scolarite!inner(annee_id)), " +
        "eleves(nom, prenom, matricule, photo_url, classe_id, classes(nom))"
      )
      .eq("ecole_id", ecoleId)
      .eq("tranches.frais_scolarite.annee_id", activeAnnee.id)
      .order("date_paiement", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        setRecus(
          (data ?? []).map((p: any) => ({
            id: p.id,
            reference: p.reference,
            eleve_id: p.eleve_id,
            eleve_nom: p.eleves?.nom ?? "—",
            eleve_prenom: p.eleves?.prenom ?? "",
            matricule: p.eleves?.matricule ?? "",
            classe: p.eleves?.classes?.nom ?? "",
            photo_url: p.eleves?.photo_url ?? null,
            montant: Number(p.montant),
            date_paiement: p.date_paiement,
            mode: p.mode,
            tranche_id: p.tranche_id ?? null,
            tranche_numero: p.tranches?.numero ?? null,
          }))
        );
        setLoading(false);
      });
  };

  useEffect(fetchRecus, [ecoleId, ecoleLoading, periodLoading, activeAnnee?.id]);

  // ── Récapitulatif par mode (sur données chargées) ──
  const modeSummary = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const r of recus) {
      const meta = modeMeta(r.mode);
      const entry = map.get(r.mode) ?? { label: meta.label, total: 0, count: 0 };
      entry.total += r.montant;
      entry.count += 1;
      map.set(r.mode, entry);
    }
    const rows = Array.from(map.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
    const totalGlobal = rows.reduce((s, r) => s + r.total, 0);
    return { rows, totalGlobal };
  }, [recus]);

  // ── Regroupements élève+jour (+tranche) ──
  interface GroupedRow {
    key: string;
    eleve_id: string;
    eleve_nom: string;
    eleve_prenom: string;
    matricule: string;
    classe: string;
    photo_url?: string | null;
    date_paiement: string;
    tranche_numero: number | null;
    items: PaiementRecu[];
    montant: number;
    modesLabel: string;
  }

  const grouped: GroupedRow[] = useMemo(() => {
    if (view === "detail") return [];
    const map = new Map<string, GroupedRow>();
    for (const r of recus) {
      const k = view === "day"
        ? `${r.eleve_id}|${jourKey(r.date_paiement)}`
        : `${r.eleve_id}|${jourKey(r.date_paiement)}|${r.tranche_id ?? "none"}`;
      const g = map.get(k);
      if (g) {
        g.items.push(r);
        g.montant += r.montant;
      } else {
        map.set(k, {
          key: k,
          eleve_id: r.eleve_id,
          eleve_nom: r.eleve_nom,
          eleve_prenom: r.eleve_prenom,
          matricule: r.matricule,
          classe: r.classe,
          photo_url: r.photo_url,
          date_paiement: r.date_paiement,
          tranche_numero: view === "day_tranche" ? r.tranche_numero : null,
          items: [r],
          montant: r.montant,
          modesLabel: "",
        });
      }
    }
    // Build modes label
    for (const g of map.values()) {
      const cnt = new Map<string, number>();
      for (const it of g.items) {
        const lbl = modeMeta(it.mode).label;
        cnt.set(lbl, (cnt.get(lbl) ?? 0) + it.montant);
      }
      g.modesLabel = Array.from(cnt.entries())
        .map(([lbl, tot]) => `${lbl} (${fcfa(tot)})`)
        .join(" + ");
    }
    return Array.from(map.values()).sort((a, b) => b.date_paiement.localeCompare(a.date_paiement));
  }, [recus, view]);

  // ── PDF ──
  const buildSinglePDF = async (r: PaiementRecu) => {
    const [{ data: tranches }, { data: paiements }] = await Promise.all([
      supabase.from("tranches").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", r.eleve_id),
      supabase.from("paiements").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", r.eleve_id),
    ]);
    const total_du = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);
    const total_paye = (paiements ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);
    return generateRecuPDF({
      ecole: { nom: ecole.nom, sigle: ecole.sigle, devise: ecole.devise, adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email, logoUrl: ecole.logo_url },
      reference: r.reference ?? r.id.slice(0, 8).toUpperCase(),
      eleve: { nom: r.eleve_nom, prenom: r.eleve_prenom, matricule: r.matricule, classe: r.classe, photo_url: r.photo_url },
      montant: r.montant,
      mode: r.mode,
      date_paiement: r.date_paiement,
      total_du,
      total_paye,
    });
  };

  const buildMergedPDF = async (g: GroupedRow) => {
    const [{ data: tranches }, { data: paiements }] = await Promise.all([
      supabase.from("tranches").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", g.eleve_id),
      supabase.from("paiements").select("montant").eq("ecole_id", ecoleId!).eq("eleve_id", g.eleve_id),
    ]);
    const total_du = (tranches ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);
    const total_paye = (paiements ?? []).reduce((s: number, t: any) => s + Number(t.montant || 0), 0);

    // Compose une chaîne "mode" représentant tous les moyens de règlement encaissés
    const cnt = new Map<string, number>();
    for (const it of g.items) {
      const lbl = modeMeta(it.mode).label;
      cnt.set(lbl, (cnt.get(lbl) ?? 0) + it.montant);
    }
    const modeCombine = "COMBINÉ — " + Array.from(cnt.entries()).map(([l, v]) => `${l} ${fcfa(v)}`).join(" + ");

    const refs = g.items.map((i) => i.reference ?? i.id.slice(0, 6).toUpperCase()).join(" / ");
    return generateRecuPDF({
      ecole: { nom: ecole.nom, sigle: ecole.sigle, devise: ecole.devise, adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email, logoUrl: ecole.logo_url },
      reference: `GRP-${refs}`.slice(0, 60),
      eleve: { nom: g.eleve_nom, prenom: g.eleve_prenom, matricule: g.matricule, classe: g.classe, photo_url: g.photo_url },
      montant: g.montant,
      mode: modeCombine,
      date_paiement: g.date_paiement,
      total_du,
      total_paye,
    });
  };

  const download = async (make: () => Promise<any>, filename: string) => {
    setBusy(true);
    try { const pdf = await make(); pdf.save(filename); }
    finally { setBusy(false); }
  };
  const preview = async (make: () => Promise<any>, title: string) => {
    setBusy(true); setPreviewTitle(title);
    try {
      const pdf = await make();
      const url = URL.createObjectURL(pdf.output("blob"));
      setPdfUrl(url);
    } finally { setBusy(false); }
  };
  const closePreview = () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); setPreviewTitle(""); };

  // ── Édition mode ──
  const openEdit = (r: PaiementRecu) => { setEditing(r); setEditMode(r.mode); };
  const saveEdit = async () => {
    if (!editing || !editMode || editMode === editing.mode) { setEditing(null); return; }
    setSaving(true);
    const { error } = await supabase.from("paiements").update({ mode: editMode }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error("Impossible de modifier : " + error.message); return; }
    toast.success("Mode de paiement mis à jour");
    setEditing(null);
    fetchRecus();
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Récapitulatif par mode de paiement */}
      <SettingsSection
        title="Récapitulatif par mode de paiement"
        description={`Ventilation des ${recus.length} paiement(s) chargé(s) — Total : ${fcfa(modeSummary.totalGlobal)} FCFA`}
        icon={<Wallet className="h-5 w-5" />}
        hideSave
      >
        {modeSummary.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun paiement à récapituler.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {modeSummary.rows.map((r) => {
              const pct = modeSummary.totalGlobal > 0 ? (r.total / modeSummary.totalGlobal) * 100 : 0;
              return (
                <Card key={r.id} className="border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{r.label}</p>
                    <p className="text-lg font-bold text-primary mt-1">{fcfa(r.total)} FCFA</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.count} opération(s) · {pct.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title={`Reçus & quittances (${view === "detail" ? recus.length : grouped.length})`}
        description="Éditez le mode de paiement, réimprimez un reçu ou fusionnez plusieurs versements du même jour."
        icon={<Receipt className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} className="border rounded-md">
            <ToggleGroupItem value="detail" className="text-xs px-3">Détaillé</ToggleGroupItem>
            <ToggleGroupItem value="day" className="text-xs px-3">Groupé (élève + jour)</ToggleGroupItem>
            <ToggleGroupItem value="day_tranche" className="text-xs px-3">Groupé (élève + jour + tranche)</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{view === "detail" ? "Référence" : "Élève"}</TableHead>
                {view === "detail" && <TableHead>Élève</TableHead>}
                {view !== "detail" && <TableHead>Détail modes</TableHead>}
                {view === "day_tranche" && <TableHead>Tranche</TableHead>}
                <TableHead className="text-right">Montant</TableHead>
                {view === "detail" && <TableHead>Mode</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view === "detail" && recus.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.reference ?? r.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="font-medium">{r.eleve_nom} {r.eleve_prenom}</TableCell>
                  <TableCell className="text-right font-semibold">{fcfa(r.montant)} FCFA</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{modeMeta(r.mode).label}</TableCell>
                  <TableCell className="text-muted-foreground">{jourLabel(r.date_paiement)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Prévisualiser"
                        onClick={() => preview(() => buildSinglePDF(r), `Reçu — ${r.eleve_nom} ${r.eleve_prenom}`)} disabled={busy}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Réimprimer / télécharger"
                        onClick={() => download(() => buildSinglePDF(r), `recu-${r.reference ?? r.id.slice(0, 8)}.pdf`)} disabled={busy}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Plus d'actions"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifier le mode de paiement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => download(() => buildSinglePDF(r), `recu-${r.reference ?? r.id.slice(0, 8)}.pdf`)}>
                            <Download className="h-4 w-4 mr-2" /> Réimprimer le reçu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {view !== "detail" && grouped.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="font-medium">{g.eleve_nom} {g.eleve_prenom}<div className="text-xs text-muted-foreground">{g.matricule} · {g.classe}</div></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g.modesLabel}<div className="text-[10px]">{g.items.length} versement(s)</div></TableCell>
                  {view === "day_tranche" && <TableCell className="text-xs">{g.tranche_numero ? `Tranche ${g.tranche_numero}` : "—"}</TableCell>}
                  <TableCell className="text-right font-semibold">{fcfa(g.montant)} FCFA</TableCell>
                  <TableCell className="text-muted-foreground">{jourLabel(g.date_paiement)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8" title="Prévisualiser reçu fusionné"
                        onClick={() => preview(() => buildMergedPDF(g), `Reçu global — ${g.eleve_nom} ${g.eleve_prenom}`)} disabled={busy}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" title="Fusionner en 1 reçu PDF"
                        onClick={() => download(() => buildMergedPDF(g), `recu-global-${g.eleve_nom}-${jourKey(g.date_paiement)}.pdf`)} disabled={busy}>
                        <Merge className="h-4 w-4" /> Fusionner
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {((view === "detail" && recus.length === 0) || (view !== "detail" && grouped.length === 0)) && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Aucun paiement enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>

      {/* Aperçu PDF */}
      <Dialog open={!!pdfUrl} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{previewTitle}</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full rounded border" title="Aperçu du reçu PDF" />
            ) : (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Édition mode */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier le mode de paiement</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Reçu <span className="font-mono">{editing.reference ?? editing.id.slice(0, 8).toUpperCase()}</span> — {editing.eleve_nom} {editing.eleve_prenom} — {fcfa(editing.montant)} FCFA
              </p>
              <Select value={editMode} onValueChange={setEditMode}>
                <SelectTrigger><SelectValue placeholder="Choisir le mode" /></SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Annuler</Button>
            <Button onClick={saveEdit} disabled={saving || !editMode}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer & réimprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
