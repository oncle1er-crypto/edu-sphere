import {
  Receipt, Loader2, Download, Eye, MoreVertical, Pencil, Merge, Wallet, Printer, FileText,
  Search, X, ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet, RotateCcw, Ban,
} from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";
import { fcfa } from "../useFinanceData";
import { CancelPaymentDialog, type CancelPaymentTarget } from "../components/CancelPaymentDialog";
import { PAIEMENT_MODE_META, modeMeta } from "../scolarite-data";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { generateRecuPDF } from "@/lib/generateDocumentsPDF";
import { buildReceiptPdf } from "@/lib/downloadReceipt";
import { generateRecapPaiementsJournalier } from "@/lib/generateFinanceReports";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import type jsPDF from "jspdf";
import type { Database } from "@/integrations/supabase/types";

type PaiementMode = Database["public"]["Enums"]["paiement_mode"];

/** Forme réelle des lignes renvoyées par la requête `paiements` de fetchRecus (select avec jointures ci-dessous). */
interface PaiementJointRow {
  id: string;
  reference: string | null;
  montant: number;
  date_paiement: string;
  mode: string;
  eleve_id: string;
  tranche_id: string | null;
  annule_le: string | null;
  motif_annulation: string | null;
  tranches: { numero: number } | null;
  eleves: { nom: string; prenom: string; matricule: string; photo_url: string | null; classe_id: string | null; classes: { nom: string } | null } | null;
}

/** Ligne "montant" seul, avec ou sans jointure frais_scolarite (select conditionnel selon anneeId). */
interface MontantRow { montant: number }

/** Forme des lignes de la requête `paiements` de genererRecapJournalier (select avec jointures, sans eleve_id/tranche_id). */
interface RecapPaiementRow {
  id: string;
  reference: string | null;
  montant: number;
  date_paiement: string;
  mode: string;
  tranches: { numero: number } | null;
  eleves: { nom: string; prenom: string; matricule: string; classes: { nom: string } | null } | null;
}

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
  annule_le: string | null;
  motif_annulation: string | null;
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
type SortKey = "date" | "montant" | "eleve" | "classe" | "mode" | "tranche" | "reference";
type SortDir = "asc" | "desc";

const MODE_OPTIONS = Object.entries(PAIEMENT_MODE_META).map(([id, m]) => ({ id, label: m.label }));

// Badge palette (fond doux) par mode — semantic tokens conservés autant que possible.
const MODE_BADGE: Record<string, string> = {
  especes:         "bg-emerald-100 text-emerald-800 border-emerald-200",
  wave:            "bg-sky-100 text-sky-800 border-sky-200",
  orange_money:    "bg-orange-100 text-orange-800 border-orange-200",
  mtn_money:       "bg-yellow-100 text-yellow-900 border-yellow-200",
  moov_money:      "bg-indigo-100 text-indigo-800 border-indigo-200",
  virement:        "bg-blue-100 text-blue-800 border-blue-200",
  cheque:          "bg-violet-100 text-violet-800 border-violet-200",
  remise:          "bg-rose-100 text-rose-800 border-rose-200",
  bourse:          "bg-pink-100 text-pink-800 border-pink-200",
  prise_en_charge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
};
const modeBadgeClass = (mode: string) =>
  MODE_BADGE[mode] ?? "bg-muted text-foreground border-border";

const jourKey = (iso: string) => iso.slice(0, 10);
const jourLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
const initials = (nom: string, prenom: string) =>
  ((nom?.[0] ?? "") + (prenom?.[0] ?? "")).toUpperCase() || "?";

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthStartIso = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  return d.toISOString().slice(0, 10);
};
const monthEndIso = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths + 1, 0);
  return d.toISOString().slice(0, 10);
};

const PAGE_SIZE = 50;

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

  // ── Filtres ──
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [modesSel, setModesSel] = useState<Set<string>>(new Set());
  const [classesSel, setClassesSel] = useState<Set<string>>(new Set());
  const [tranchesSel, setTranchesSel] = useState<Set<string>>(new Set());
  const [montantMin, setMontantMin] = useState<string>("");
  const [montantMax, setMontantMax] = useState<string>("");

  // ── Tri / pagination ──
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // ── Sélection multiple ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Récap journalier
  const [recapDate, setRecapDate] = useState<string>(() => todayIso());
  const [recapBusy, setRecapBusy] = useState(false);

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
    if (!ecoleId || periodLoading || !activeAnnee?.id) {
      if (!ecoleId && !ecoleLoading) setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("paiements")
      .select(
        "id, reference, montant, date_paiement, mode, eleve_id, tranche_id, annule_le, motif_annulation, " +
        "tranches!inner(numero, frais_scolarite!inner(annee_id)), " +
        "eleves(nom, prenom, matricule, photo_url, classe_id, classes(nom))"
      )
      .eq("ecole_id", ecoleId)
      .eq("tranches.frais_scolarite.annee_id", activeAnnee.id)
      .order("date_paiement", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        setRecus(
          ((data ?? []) as unknown as PaiementJointRow[]).map((p) => ({
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
            annule_le: p.annule_le ?? null,
            motif_annulation: p.motif_annulation ?? null,
          }))
        );
        setLoading(false);
      });
  };

  useEffect(fetchRecus, [ecoleId, ecoleLoading, periodLoading, activeAnnee?.id]);

  // Options dérivées pour les filtres
  const classeOptions = useMemo(() => {
    const s = new Set<string>();
    recus.forEach((r) => r.classe && s.add(r.classe));
    return Array.from(s).sort();
  }, [recus]);

  const trancheOptions = useMemo(() => {
    const s = new Set<string>();
    recus.forEach((r) => r.tranche_numero != null && s.add(String(r.tranche_numero)));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [recus]);

  // ── Application des filtres ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minV = montantMin ? Number(montantMin) : null;
    const maxV = montantMax ? Number(montantMax) : null;
    return recus.filter((r) => {
      if (dateFrom && jourKey(r.date_paiement) < dateFrom) return false;
      if (dateTo && jourKey(r.date_paiement) > dateTo) return false;
      if (modesSel.size && !modesSel.has(r.mode)) return false;
      if (classesSel.size && !classesSel.has(r.classe)) return false;
      if (tranchesSel.size && !tranchesSel.has(String(r.tranche_numero ?? ""))) return false;
      if (minV != null && r.montant < minV) return false;
      if (maxV != null && r.montant > maxV) return false;
      if (q) {
        const hay = `${r.eleve_nom} ${r.eleve_prenom} ${r.matricule} ${r.classe} ${r.reference ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recus, query, dateFrom, dateTo, modesSel, classesSel, tranchesSel, montantMin, montantMax]);

  // ── Tri ──
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "date":      av = a.date_paiement; bv = b.date_paiement; break;
        case "montant":   av = a.montant; bv = b.montant; break;
        case "eleve":     av = `${a.eleve_nom} ${a.eleve_prenom}`.toLowerCase();
                          bv = `${b.eleve_nom} ${b.eleve_prenom}`.toLowerCase(); break;
        case "classe":    av = a.classe.toLowerCase(); bv = b.classe.toLowerCase(); break;
        case "mode":      av = modeMeta(a.mode).label; bv = modeMeta(b.mode).label; break;
        case "tranche":   av = a.tranche_numero ?? 999; bv = b.tranche_numero ?? 999; break;
        case "reference": av = a.reference ?? ""; bv = b.reference ?? ""; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, dateFrom, dateTo, modesSel, classesSel, tranchesSel, montantMin, montantMax, sortKey, sortDir]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);

  // Les paiements annulés restent visibles dans la liste mais ne comptent
  // jamais dans les totaux (KPI, point de caisse, ventilation par mode).
  const filteredActifs = useMemo(() => filtered.filter((r) => !r.annule_le), [filtered]);

  // ── KPIs sur la sélection filtrée ──
  const kpis = useMemo(() => {
    const total = filteredActifs.reduce((s, r) => s + r.montant, 0);
    const count = filteredActifs.length;
    const eleves = new Set(filteredActifs.map((r) => r.eleve_id)).size;
    const jours  = new Set(filteredActifs.map((r) => jourKey(r.date_paiement))).size;
    const avg = count > 0 ? Math.round(total / count) : 0;
    return { total, count, eleves, jours, avg };
  }, [filteredActifs]);

  // ── KPI Paiements du jour (indépendant des filtres) ──
  const todayKpi = useMemo(() => {
    const t = todayIso();
    const list = recus.filter((r) => !r.annule_le && jourKey(r.date_paiement) === t);
    return { total: list.reduce((s, r) => s + r.montant, 0), count: list.length };
  }, [recus]);

  // ── Récapitulatif par mode (sur données filtrées) ──
  const modeSummary = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const r of filteredActifs) {
      const meta = modeMeta(r.mode);
      const entry = map.get(r.mode) ?? { label: meta.label, total: 0, count: 0 };
      entry.total += r.montant;
      entry.count += 1;
      map.set(r.mode, entry);
    }
    const rows = Array.from(map.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
    const totalGlobal = rows.reduce((s, r) => s + r.total, 0);
    return { rows, totalGlobal };
  }, [filteredActifs]);

  // ── Regroupements élève+jour (+tranche) sur données filtrées ──
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
    for (const r of sorted) {
      if (r.annule_le) continue;
      const k = view === "day"
        ? `${r.eleve_id}|${jourKey(r.date_paiement)}`
        : `${r.eleve_id}|${jourKey(r.date_paiement)}|${r.tranche_id ?? "none"}`;
      const g = map.get(k);
      if (g) { g.items.push(r); g.montant += r.montant; }
      else {
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
    for (const g of map.values()) {
      const cnt = new Map<string, number>();
      for (const it of g.items) {
        const lbl = modeMeta(it.mode).label;
        cnt.set(lbl, (cnt.get(lbl) ?? 0) + it.montant);
      }
      g.modesLabel = Array.from(cnt.entries()).map(([lbl, tot]) => `${lbl} (${fcfa(tot)})`).join(" + ");
    }
    return Array.from(map.values()).sort((a, b) => b.date_paiement.localeCompare(a.date_paiement));
  }, [sorted, view]);

  // ── PDF ──
  const buildSinglePDF = async (r: PaiementRecu) => {
    const receiptType = modeMeta(r.mode).kind === "remise"
      ? (r.mode === "bourse" ? "bourse" : r.mode === "prise_en_charge" ? "prise_en_charge" : "remise")
      : "encaissement";
    const built = await buildReceiptPdf({
      ecoleId: ecoleId!,
      eleveId: r.eleve_id,
      paiementId: r.id,
      type: receiptType,
    });
    if (!built) throw new Error("Reçu introuvable");
    return built.pdf;
  };


  const buildMergedPDF = async (g: GroupedRow) => {
    const anneeId = activeAnnee?.id;
    const trQ = supabase
      .from("tranches")
      .select(anneeId ? "montant, frais_scolarite!inner(annee_id)" : "montant")
      .eq("ecole_id", ecoleId!)
      .eq("eleve_id", g.eleve_id);
    if (anneeId) trQ.eq("frais_scolarite.annee_id", anneeId);
    const paQ = supabase
      .from("paiements")
      .select(anneeId ? "montant, tranches!inner(frais_scolarite!inner(annee_id))" : "montant")
      .eq("ecole_id", ecoleId!)
      .eq("eleve_id", g.eleve_id)
      .is("annule_le", null);
    if (anneeId) paQ.eq("tranches.frais_scolarite.annee_id", anneeId);
    const [{ data: tranches }, { data: paiements }] = await Promise.all([trQ, paQ]);
    const total_du = ((tranches ?? []) as unknown as MontantRow[]).reduce((s, t) => s + Number(t.montant || 0), 0);
    const total_paye = ((paiements ?? []) as unknown as MontantRow[]).reduce((s, t) => s + Number(t.montant || 0), 0);


    const cnt = new Map<string, number>();
    for (const it of g.items) {
      const lbl = modeMeta(it.mode).label;
      cnt.set(lbl, (cnt.get(lbl) ?? 0) + it.montant);
    }
    const fmtPdf = (v: number) => v.toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ");
    const modeCombine = "COMBINE - " + Array.from(cnt.entries()).map(([l, v]) => `${l} ${fmtPdf(v)} FCFA`).join(" + ");
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

  const download = async (make: () => Promise<jsPDF>, filename: string) => {
    setBusy(true);
    try { const pdf = await make(); pdf.save(filename); }
    finally { setBusy(false); }
  };
  const preview = async (make: () => Promise<jsPDF>, title: string) => {
    setBusy(true); setPreviewTitle(title);
    try {
      const pdf = await make();
      const url = URL.createObjectURL(pdf.output("blob"));
      setPdfUrl(url);
    } finally { setBusy(false); }
  };
  const closePreview = () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); setPreviewTitle(""); };

  const [cancelTarget, setCancelTarget] = useState<CancelPaymentTarget | null>(null);
  const openCancel = (r: PaiementRecu) => setCancelTarget({
    id: r.id,
    date: r.date_paiement,
    montant: r.montant,
    modeLabel: modeMeta(r.mode).label,
    reference: r.reference,
    trancheNum: r.tranche_numero,
    eleveLabel: `${r.eleve_nom} ${r.eleve_prenom}`,
  });

  const openEdit = (r: PaiementRecu) => { setEditing(r); setEditMode(r.mode); };
  const saveEdit = async () => {
    if (!editing || !editMode || editMode === editing.mode) { setEditing(null); return; }
    setSaving(true);
    const { error } = await supabase.from("paiements").update({ mode: editMode as PaiementMode }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error("Impossible de modifier : " + messageErreurBase(error)); return; }
    toast.success("Mode de paiement mis à jour");
    setEditing(null);
    fetchRecus();
  };

  // ── Export Excel ──
  const exportExcel = () => {
    if (filtered.length === 0) { toast.info("Aucune donnée à exporter."); return; }
    const rows = sorted.map((r) => ({
      Date: jourLabel(r.date_paiement),
      Heure: new Date(r.date_paiement).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      Référence: r.reference ?? r.id.slice(0, 8).toUpperCase(),
      Matricule: r.matricule,
      Nom: r.eleve_nom,
      Prénom: r.eleve_prenom,
      Classe: r.classe,
      Tranche: r.tranche_numero != null ? `T${r.tranche_numero}` : "",
      Mode: modeMeta(r.mode).label,
      "Montant (FCFA)": r.montant,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Reçus");
    const fname = `recus_${dateFrom || "debut"}_${dateTo || todayIso()}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`${rows.length} ligne(s) exportée(s)`);
  };

  // ── Sélection multiple ──
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      const allSelected = visible.every((r) => s.has(r.id));
      if (allSelected) visible.forEach((r) => s.delete(r.id));
      else visible.forEach((r) => s.add(r.id));
      return s;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const downloadSelected = async () => {
    const items = sorted.filter((r) => selectedIds.has(r.id));
    if (items.length === 0) return;
    setBusy(true);
    try {
      for (const r of items) {
        const pdf = await buildSinglePDF(r);
        pdf.save(`recu-${r.reference ?? r.id.slice(0, 8)}.pdf`);
      }
      toast.success(`${items.length} reçu(s) téléchargé(s)`);
    } finally { setBusy(false); }
  };

  // ── Reset filtres ──
  const activeFiltersCount =
    (query ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) +
    (modesSel.size ? 1 : 0) + (classesSel.size ? 1 : 0) + (tranchesSel.size ? 1 : 0) +
    (montantMin ? 1 : 0) + (montantMax ? 1 : 0);
  const resetFilters = () => {
    setQuery(""); setDateFrom(""); setDateTo("");
    setModesSel(new Set()); setClassesSel(new Set()); setTranchesSel(new Set());
    setMontantMin(""); setMontantMax("");
  };
  const applyPreset = (preset: "today" | "7d" | "month" | "prevMonth" | "year") => {
    const today = todayIso();
    switch (preset) {
      case "today":     setDateFrom(today); setDateTo(today); break;
      case "7d":        setDateFrom(addDaysIso(today, -6)); setDateTo(today); break;
      case "month":     setDateFrom(monthStartIso(0)); setDateTo(monthEndIso(0)); break;
      case "prevMonth": setDateFrom(monthStartIso(-1)); setDateTo(monthEndIso(-1)); break;
      case "year":      setDateFrom(""); setDateTo(""); break;
    }
  };

  // ── Tri : helper d'entête cliquable ──
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "date" || k === "montant" ? "desc" : "asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 inline ml-1" />
      : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };
  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:text-primary ${className}`} onClick={() => toggleSort(k)}>
      {children}<SortIcon k={k} />
    </TableHead>
  );

  // ── Récap journalier PDF ──
  const genererRecapJournalier = async (previewOnly: boolean) => {
    if (!ecoleId || !recapDate) return;
    if (!activeAnnee?.id) { toast.error("Année scolaire active introuvable"); return; }
    setRecapBusy(true);
    try {
      const start = `${recapDate}T00:00:00`;
      const end = `${recapDate}T23:59:59`;
      const { data, error } = await supabase
        .from("paiements")
        .select(
          "id, reference, montant, date_paiement, mode, " +
          "tranches!inner(numero, frais_scolarite!inner(annee_id)), " +
          "eleves(nom, prenom, matricule, classes(nom))"
        )
        .eq("ecole_id", ecoleId)
        .eq("tranches.frais_scolarite.annee_id", activeAnnee.id)
        .is("annule_le", null)
        .gte("date_paiement", start)
        .lte("date_paiement", end)
        .order("date_paiement", { ascending: true });
      if (error) throw error;

      const paiements = ((data ?? []) as unknown as RecapPaiementRow[]).map((p) => {
        const d = new Date(p.date_paiement);
        return {
          heure: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
          reference: p.reference ?? p.id.slice(0, 8).toUpperCase(),
          eleve: `${p.eleves?.nom ?? ""} ${p.eleves?.prenom ?? ""}`.trim() || "—",
          matricule: p.eleves?.matricule ?? "",
          classe: p.eleves?.classes?.nom ?? "—",
          tranche: p.tranches?.numero ? `T${p.tranches.numero}` : "—",
          mode: modeMeta(p.mode).label,
          montant: Number(p.montant),
        };
      });
      if (paiements.length === 0) { toast.info("Aucun paiement enregistré ce jour-là."); return; }
      const modeMap = new Map<string, { total: number; nb: number }>();
      const classeMap = new Map<string, { total: number; nb: number }>();
      for (const p of paiements) {
        const m = modeMap.get(p.mode) ?? { total: 0, nb: 0 };
        m.total += p.montant; m.nb += 1; modeMap.set(p.mode, m);
        const c = classeMap.get(p.classe) ?? { total: 0, nb: 0 };
        c.total += p.montant; c.nb += 1; classeMap.set(p.classe, c);
      }
      const ventilationModes = Array.from(modeMap.entries()).map(([mode, v]) => ({ mode, ...v })).sort((a, b) => b.total - a.total);
      const ventilationClasses = Array.from(classeMap.entries()).map(([classe, v]) => ({ classe, ...v })).sort((a, b) => b.total - a.total);
      const meta = { nom: ecole.nom, devise: ecole.devise, adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email, logoUrl: ecole.logo_url };
      if (previewOnly) {
        const pdf = await generateRecapPaiementsJournalier(meta, recapDate, { paiements, ventilationModes, ventilationClasses }, true);
        if (pdf) {
          const url = URL.createObjectURL(pdf.output("blob"));
          setPreviewTitle(`Récap paiements — ${new Date(recapDate).toLocaleDateString("fr-FR")}`);
          setPdfUrl(url);
        }
      } else {
        await generateRecapPaiementsJournalier(meta, recapDate, { paiements, ventilationModes, ventilationClasses });
        toast.success("Récapitulatif journalier téléchargé");
      }
    } catch (e) {
      toast.error("Erreur : " + messageErreurBase(e));
    } finally {
      setRecapBusy(false);
    }
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selectedIds.has(r.id));

  return (
    <div className="space-y-6">
      {/* Récap journalier PDF */}
      <SettingsSection
        title="Récapitulatif journalier des paiements"
        description="Éditez la liste détaillée des encaissements du jour (heure, référence, élève, classe, tranche, mode et montant) avec ventilations et zone de signature."
        icon={<FileText className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={recapDate} onChange={(e) => setRecapDate(e.target.value)}
              max={todayIso()} className="w-[180px]" />
          </div>
          <Button variant="outline" onClick={() => genererRecapJournalier(true)} disabled={recapBusy || !recapDate}>
            {recapBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Aperçu
          </Button>
          <Button onClick={() => genererRecapJournalier(false)} disabled={recapBusy || !recapDate}>
            {recapBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Imprimer / Télécharger PDF
          </Button>
        </div>
      </SettingsSection>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {([
          { label: "Paiements du jour", value: `${fcfa(todayKpi.total)} FCFA`, sub: `${todayKpi.count} reçu(s)`, today: true, onClick: () => { const t = todayIso(); setDateFrom(t); setDateTo(t); } },
          { label: "Total encaissé", value: `${fcfa(kpis.total)} FCFA`, hero: true },
          { label: "Reçus", value: kpis.count.toLocaleString("fr-FR") },
          { label: "Ticket moyen", value: `${fcfa(kpis.avg)} FCFA` },
          { label: "Élèves", value: kpis.eleves.toLocaleString("fr-FR") },
          { label: "Jours couverts", value: kpis.jours.toLocaleString("fr-FR") },
        ] as { label: string; value: string; sub?: string; today?: boolean; hero?: boolean; onClick?: () => void }[]).map((k) => (
          <Card
            key={k.label}
            onClick={k.onClick}
            className={`${k.today ? "border-accent/60 bg-accent/10 cursor-pointer hover:bg-accent/20 transition" : k.hero ? "border-primary/40 bg-primary/5" : ""}`}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
              <p className={`mt-1 font-bold ${k.today ? "text-xl text-primary" : k.hero ? "text-xl text-primary" : "text-lg"}`}>{k.value}</p>
              {k.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Récapitulatif par mode (filtré) */}
      <SettingsSection
        title="Ventilation par mode de paiement"
        description={`Sur la sélection actuelle — ${filtered.length} paiement(s), total : ${fcfa(modeSummary.totalGlobal)} FCFA`}
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
                    <Badge variant="outline" className={`${modeBadgeClass(r.id)} text-[10px]`}>{r.label}</Badge>
                    <p className="text-lg font-bold text-primary mt-2">{fcfa(r.total)} FCFA</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.count} op. · {pct.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Liste principale */}
      <SettingsSection
        title={`Reçus & quittances (${view === "detail" ? filtered.length : grouped.length})`}
        description="Recherchez, filtrez, triez, exportez. Cliquez sur un en-tête de colonne pour trier."
        icon={<Receipt className="h-5 w-5" />}
        hideSave
      >
        {/* Barre de recherche + filtres */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher élève, matricule, référence, classe…"
                value={query} onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Presets date */}
            <Select onValueChange={(v) => applyPreset(v as "today" | "7d" | "month" | "prevMonth" | "year")}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Période rapide" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="prevMonth">Mois précédent</SelectItem>
                <SelectItem value="year">Année active</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-[145px]" title="Date de début" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-[145px]" title="Date de fin" />

            {/* Mode */}
            <MultiFilter label="Mode" options={MODE_OPTIONS} selected={modesSel} onChange={setModesSel} />
            {/* Classe */}
            <MultiFilter label="Classe" options={classeOptions.map((c) => ({ id: c, label: c }))} selected={classesSel} onChange={setClassesSel} />
            {/* Tranche */}
            <MultiFilter label="Tranche" options={trancheOptions.map((t) => ({ id: t, label: `T${t}` }))} selected={tranchesSel} onChange={setTranchesSel} />

            {/* Montant */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Montant {(montantMin || montantMax) && <Badge variant="secondary" className="ml-2 h-5">1</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 space-y-2" align="start">
                <div className="text-xs font-medium">Fourchette de montant (FCFA)</div>
                <div className="flex gap-2">
                  <Input placeholder="Min" type="number" value={montantMin} onChange={(e) => setMontantMin(e.target.value)} />
                  <Input placeholder="Max" type="number" value={montantMax} onChange={(e) => setMontantMax(e.target.value)} />
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMontantMin(""); setMontantMax(""); }}>
                  Effacer
                </Button>
              </PopoverContent>
            </Popover>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Réinitialiser ({activeFiltersCount})
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Exporter Excel
              </Button>
            </div>
          </div>

          {/* Barre d'actions sélection */}
          {selectedIds.size > 0 && view === "detail" && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{selectedIds.size} reçu(s) sélectionné(s)</span>
              <Button size="sm" variant="outline" onClick={downloadSelected} disabled={busy}>
                <Download className="h-4 w-4 mr-1" /> Télécharger les PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" /> Effacer la sélection
              </Button>
            </div>
          )}

          {/* Toggle vue */}
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} className="border rounded-md w-fit">
            <ToggleGroupItem value="detail" className="text-xs px-3">Détaillé</ToggleGroupItem>
            <ToggleGroupItem value="day" className="text-xs px-3">Groupé (élève + jour)</ToggleGroupItem>
            <ToggleGroupItem value="day_tranche" className="text-xs px-3">Groupé (élève + jour + tranche)</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Tableau */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 sticky top-0 z-10">
                {view === "detail" && (
                  <TableHead className="w-10">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Tout sélectionner" />
                  </TableHead>
                )}
                {view === "detail" ? (
                  <>
                    <Th k="reference">Référence</Th>
                    <Th k="eleve">Élève</Th>
                    <Th k="classe">Classe</Th>
                    <Th k="tranche">Tranche</Th>
                    <Th k="mode">Mode</Th>
                    <Th k="montant" className="text-right">Montant</Th>
                    <Th k="date">Date</Th>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Élève</TableHead>
                    <TableHead>Détail modes</TableHead>
                    {view === "day_tranche" && <TableHead>Tranche</TableHead>}
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view === "detail" && visible.map((r) => (
                <TableRow
                  key={r.id}
                  className={r.annule_le ? "bg-muted/40 text-muted-foreground line-through" : (selectedIds.has(r.id) ? "bg-primary/5" : "")}
                  title={r.annule_le ? `Annulé le ${new Date(r.annule_le).toLocaleDateString("fr-FR")}${r.motif_annulation ? ` — ${r.motif_annulation}` : ""}` : undefined}
                >
                  <TableCell>
                    <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleOne(r.id)} aria-label="Sélectionner" />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.reference ?? r.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                        {initials(r.eleve_nom, r.eleve_prenom)}
                      </div>
                      <div>
                        <div>{r.eleve_nom} {r.eleve_prenom}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.matricule}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.classe || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {r.tranche_numero != null ? `T${r.tranche_numero}` : "—"}
                    {r.annule_le && (
                      <Badge variant="outline" className="ml-2 bg-muted text-muted-foreground border-border text-[9px] no-underline">ANNULÉ</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${modeBadgeClass(r.mode)} text-[10px]`}>
                      {modeMeta(r.mode).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fcfa(r.montant)} FCFA</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{jourLabel(r.date_paiement)}</TableCell>
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
                          {!r.annule_le && (
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4 mr-2" /> Modifier le mode de paiement
                            </DropdownMenuItem>
                          )}
                          {!r.annule_le && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openCancel(r)}>
                              <Ban className="h-4 w-4 mr-2" /> Annuler cet encaissement
                            </DropdownMenuItem>
                          )}
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                        {initials(g.eleve_nom, g.eleve_prenom)}
                      </div>
                      <div>
                        <div>{g.eleve_nom} {g.eleve_prenom}</div>
                        <div className="text-xs text-muted-foreground">{g.matricule} · {g.classe}</div>
                      </div>
                    </div>
                  </TableCell>
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

              {((view === "detail" && filtered.length === 0) || (view !== "detail" && grouped.length === 0)) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    Aucun paiement pour ces filtres.
                    {activeFiltersCount > 0 && (
                      <Button variant="link" size="sm" onClick={resetFilters} className="ml-2">Réinitialiser</Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pied de tableau + charger plus */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-2 text-sm">
            <div className="text-muted-foreground">
              {view === "detail" ? (
                <>Affichage <strong>{Math.min(visible.length, filtered.length)}</strong> / <strong>{filtered.length}</strong></>
              ) : (
                <>Groupes affichés : <strong>{grouped.length}</strong></>
              )}
            </div>
            <div className="font-semibold">
              Total filtré : <span className="text-primary">{fcfa(kpis.total)} FCFA</span>
            </div>
            {view === "detail" && visibleCount < filtered.length && (
              <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Charger {Math.min(PAGE_SIZE, filtered.length - visibleCount)} de plus
              </Button>
            )}
          </div>
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

      <CancelPaymentDialog
        paiement={cancelTarget}
        open={!!cancelTarget}
        onOpenChange={(o) => { if (!o) setCancelTarget(null); }}
        onCancelled={fetchRecus}
      />

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

// ── Composant multi-select (Popover + checkboxes) ──
function MultiFilter({
  label, options, selected, onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    onChange(s);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {label}
          {selected.size > 0 && <Badge variant="secondary" className="ml-2 h-5">{selected.size}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="max-h-64 overflow-auto space-y-1">
          {options.length === 0 && <p className="text-xs text-muted-foreground p-2">Aucune option</p>}
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {selected.size > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => onChange(new Set())}>
            Effacer
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
