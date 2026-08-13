import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, UserPlus, Sparkles, ClipboardCheck, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { useSpCandidats, type SpCandidat } from "../hooks/useSpCandidats";
import { CandidatFormDialog } from "../components/CandidatFormDialog";
import { ServicePaymentDialog } from "../components/ServicePaymentDialog";
import { useSpServices } from "../hooks/useSpServices";
import { ConvertCandidatDialog } from "../components/ConvertCandidatDialog";
import SpTestWorkflow from "../components/SpTestWorkflow";
import { StatutCandidatLegend } from "../components/StatutCandidatLegend";
import { CandidatNotesDialog } from "../components/CandidatNotesDialog";
import { useEcoleInfo } from "../hooks/useEcoleInfo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRowsCSV, exportRowsPDF, exportRowsXLSX } from "@/lib/reports/exporters";
import { messageErreurBase } from "@/lib/dbErrorMessages";

const STATUT_COLOR: Record<string, string> = {
  en_attente: "bg-muted text-foreground",
  programme: "bg-blue-500 text-white",
  absent: "bg-orange-500 text-white",
  present: "bg-emerald-500 text-white",
  admis: "bg-emerald-700 text-white",
  refuse: "bg-destructive text-white",
};
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente", programme: "Programmé", absent: "Absent",
  present: "Présent", admis: "Admis", refuse: "Refusé",
};

const fmtMoy = (n: number | null | undefined) =>
  n == null ? "—" : n.toFixed(2).replace(".", ",");

export default function SpTestsEntree() {
  const { candidats, loading, save, remove, convertir, reload } = useSpCandidats();
  const { services } = useSpServices();
  const ecole = useEcoleInfo();
  const [editing, setEditing] = useState<Partial<SpCandidat> | null>(null);
  const [pay, setPay] = useState<SpCandidat | null>(null);
  const [convert, setConvert] = useState<SpCandidat | null>(null);
  const [notesOn, setNotesOn] = useState<SpCandidat | null>(null);
  const [workflow, setWorkflow] = useState(false);
  const [q, setQ] = useState("");
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});

  const testService = services.find((s) => s.slug === "test_entree");

  useEffect(() => {
    const ids = candidats.map((c) => c.id);
    if (!ids.length || !testService) { setPaidMap({}); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("sp_paiements")
        .select("candidat_id, montant_du, montant_paye, remise, annule_le, service_id")
        .in("candidat_id", ids)
        .eq("service_id", testService.id)
        .is("annule_le", null);
      const agg: Record<string, { du: number; paye: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const k = r.candidat_id as string;
        agg[k] = agg[k] ?? { du: 0, paye: 0 };
        agg[k].du += Number(r.montant_du ?? 0);
        agg[k].paye += Number(r.montant_paye ?? 0) + Number(r.remise ?? 0);
      }
      const map: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(agg)) map[k] = v.paye >= v.du && v.du > 0;
      setPaidMap(map);
    })();
  }, [candidats, testService?.id]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidats;
    return candidats.filter((c) =>
      [c.nom, c.prenom, c.numero, c.parent, c.telephone].some((v) => v?.toLowerCase().includes(s))
    );
  }, [candidats, q]);

  const PAR_PAGE = 25;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAR_PAGE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAR_PAGE, page * PAR_PAGE),
    [filtered, page]
  );


  const saveNotes = async (
    id: string,
    notes: { note_francais: number | null; note_maths: number | null; note_anglais: number | null }
  ) => {
    const { error } = await (supabase as any).from("sp_candidats").update(notes).eq("id", id);
    if (error) return toast.error(messageErreurBase(error));
    toast.success("Notes enregistrées");
    await reload();
  };

  const columns = [
    "N°", "Nom", "Prénom", "Sexe", "Classe demandée",
    "Parent", "Téléphone", "Date test",
    "Français /20", "Maths /20", "Anglais /20", "Moyenne /20", "Statut",
  ];
  const buildRows = (list: SpCandidat[]) =>
    list.map((c) => [
      c.numero,
      c.nom,
      c.prenom,
      c.sexe ?? "",
      c.classe_demandee ?? "",
      c.parent ?? "",
      c.telephone ?? "",
      c.date_test ? new Date(c.date_test).toLocaleString("fr-FR") : "",
      fmtMoy(c.note_francais),
      fmtMoy(c.note_maths),
      fmtMoy(c.note_anglais),
      fmtMoy(c.moyenne_test),
      STATUT_LABEL[c.statut] ?? c.statut,
    ]);

  const exportBy = async (
    fmt: "csv" | "xlsx" | "pdf",
    mode: "classe" | "statut"
  ) => {
    if (filtered.length === 0) {
      toast.warning("Aucun candidat à exporter");
      return;
    }
    const sortKey = (c: SpCandidat) =>
      (mode === "classe" ? (c.classe_demandee ?? "—") : STATUT_LABEL[c.statut] ?? c.statut).toLowerCase();
    const sorted = [...filtered].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

    const payload = {
      title: "Liste des candidats — Tests d'entrée",
      sousTitre:
        mode === "classe" ? "Groupé par classe demandée" : "Groupé par statut",
      filename: `tests-entree-${mode}-${new Date().toISOString().slice(0, 10)}`,
      columns,
      rows: buildRows(sorted),
      ecole,
      orientation: "landscape" as const,
      pdfGroupBy: {
        columnIndex: mode === "classe" ? 4 : 12,
        label: mode === "classe" ? "Classe" : "Statut",
        hideColumn: true,
        pageBreak: true,
      },
    };

    try {
      if (fmt === "csv") exportRowsCSV(payload);
      else if (fmt === "xlsx") exportRowsXLSX(payload);
      else await exportRowsPDF(payload);
      toast.success(`Export ${fmt.toUpperCase()} téléchargé`);
    } catch (e: any) {
      toast.error(messageErreurBase(e) || "Erreur export");
    }
  };

  return (
    <div className="space-y-4">
      <StatutCandidatLegend />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tests d'entrée ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Printer className="h-4 w-4" /> Imprimer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Par classe demandée</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportBy("pdf", "classe")}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBy("xlsx", "classe")}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBy("csv", "classe")}>CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Par statut</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportBy("pdf", "statut")}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBy("xlsx", "statut")}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBy("csv", "statut")}>CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-1" />Simple
            </Button>
            <Button size="sm" onClick={() => setWorkflow(true)} className="gap-1">
              <Sparkles className="h-4 w-4" />Nouveau parcours (candidat + paiement + reçu)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Classe demandée</TableHead>
                  <TableHead>Parent / Tél.</TableHead>
                  <TableHead>Date test</TableHead>
                  <TableHead className="text-center">Moyenne</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.nom} {c.prenom}</div>
                      <div className="text-xs text-muted-foreground">{c.sexe} • {c.date_naissance ?? "—"}</div>
                    </TableCell>
                    <TableCell>{c.classe_demandee ?? "—"}</TableCell>
                    <TableCell>{c.parent ?? "—"}<div className="text-xs text-muted-foreground">{c.telephone}</div></TableCell>
                    <TableCell>{c.date_test ? new Date(c.date_test).toLocaleString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">
                      {fmtMoy(c.moyenne_test)}
                    </TableCell>
                    <TableCell><Badge className={STATUT_COLOR[c.statut] ?? "bg-muted"}>{STATUT_LABEL[c.statut] ?? c.statut}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Saisir les notes" onClick={() => setNotesOn(c)}>
                          <ClipboardCheck className="h-4 w-4" />
                        </Button>
                        {!paidMap[c.id] && (
                          <Button size="icon" variant="ghost" title="Encaisser" onClick={() => setPay(c)}><CreditCard className="h-4 w-4" /></Button>
                        )}
                        <Button size="icon" variant="ghost" title="Convertir en élève" disabled={!!c.converti_eleve_id} onClick={() => setConvert(c)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-3">
                <p className="text-xs text-muted-foreground">Page {page} / {totalPages} — {filtered.length} candidat(s)</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Précédent
                  </Button>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((n) => n + 1)}>
                    Suivant <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          )}
        </CardContent>
      </Card>

      <CandidatFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (p) => { await save(p); setEditing(null); }}
      />

      <ServicePaymentDialog
        open={!!pay}
        onOpenChange={(v) => !v && setPay(null)}
        preset={pay ? {
          service_id: testService?.id,
          beneficiaire_type: "candidat",
          candidat_id: pay.id,
          beneficiaire_libre: `${pay.nom} ${pay.prenom}`,
        } : undefined}
      />

      {convert && (
        <ConvertCandidatDialog
          open={!!convert}
          onOpenChange={(v) => !v && setConvert(null)}
          candidatNom={`${convert.nom} ${convert.prenom}`}
          onConfirm={async (classeId) => { await convertir(convert.id, classeId); }}
        />
      )}

      <CandidatNotesDialog
        open={!!notesOn}
        onOpenChange={(v) => !v && setNotesOn(null)}
        candidat={notesOn}
        onSubmit={async (notes) => { if (notesOn) await saveNotes(notesOn.id, notes); }}
      />

      <SpTestWorkflow open={workflow} onOpenChange={setWorkflow} />
    </div>
  );
}
