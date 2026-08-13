import { useState, useEffect, useMemo } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_ELEVE } from "@/components/help";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, Download, MoreHorizontal, Loader2, Shuffle, Eye, Trash2, List, LayoutGrid, Sparkles, AlertTriangle, ShieldAlert, Paperclip, Printer } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDocumentsCountByEleve } from "@/hooks/useDocumentsCountByEleve";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StudentDetailDrawer from "@/pages/eleves/components/StudentDetailDrawer";
import InscriptionWorkflowDialog from "@/pages/eleves/components/InscriptionWorkflowDialog";
import BulkInscriptionDialog from "@/pages/eleves/components/BulkInscriptionDialog";
import DuplicatesDialog from "@/pages/eleves/components/DuplicatesDialog";
import { isStatutActif } from "@/lib/eleveStatus";
import { useAnciensMatricules } from "@/hooks/useAnciensMatricules";
import { generateListeElevesPDF, type RosterClasse, type RosterData } from "@/lib/generateStudentRosterPDF";

const initials = (n: string, p: string) => `${(p?.[0] ?? "")}${(n?.[0] ?? "")}`.toUpperCase();

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
};

type ViewMode = "list" | "grid";

interface EcoleInfo {
  nom: string;
  devise: string;
  adresse: string;
  telephone: string;
  email?: string;
  logo_url?: string | null;
}

export default function StudentsList() {
  const { activeAnnee } = useAcademicPeriod();
  const { eleves, loading, updateEleve, deleteEleve, fetchEleves, ecoleId } = useEleves(activeAnnee.id);
  const { matriculesAnciens } = useAnciensMatricules(activeAnnee.debut);
  const { classes } = useClasses(activeAnnee.id);
  const { isAdmin } = useIsAdmin();
  const { cycles } = useCycles();
  const { countByEleve, refetch: refetchDocsCount } = useDocumentsCountByEleve();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cycle, setCycle] = useState("all");
  const [statut, setStatut] = useState("all");
  const [docFilter, setDocFilter] = useState<"all" | "with" | "without">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Debounce search input (180ms) to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, cycle, statut, docFilter, viewMode]);

  // Dialogs
  const [viewEleve, setViewEleve] = useState<typeof eleves[0] | null>(null);
  const [viewEleveTab, setViewEleveTab] = useState<string | undefined>(undefined);
  const [workflowEleve, setWorkflowEleve] = useState<typeof eleves[0] | null>(null);

  const [transferEleve, setTransferEleve] = useState<typeof eleves[0] | null>(null);
  const [transferClasseId, setTransferClasseId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<typeof eleves[0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<typeof eleves[0] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Impression de la liste des élèves par classe
  const [ecole, setEcole] = useState<EcoleInfo>({
    nom: "Complexe Scolaire La Providence de Don Orione",
    devise: "Foi, Savoir, Excellence",
    adresse: "Abidjan, Côte d'Ivoire",
    telephone: "+225 00 00 00 00",
    email: "",
    logo_url: null,
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [afficherStatut, setAfficherStatut] = useState(true);

  useEffect(() => {
    if (!ecoleId) return;
    supabase
      .from("ecoles")
      .select("nom, devise, adresse, telephone, email, logo_url")
      .eq("id", ecoleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEcole({
            nom: data.nom || "Complexe Scolaire La Providence de Don Orione",
            devise: data.devise || "Foi, Savoir, Excellence",
            adresse: data.adresse || "Abidjan, Côte d'Ivoire",
            telephone: data.telephone || "+225 00 00 00 00",
            email: data.email || "",
            logo_url: data.logo_url || null,
          });
        }
      });
  }, [ecoleId]);

  // Keep drawer eleve in sync with realtime-refreshed list
  useEffect(() => {
    if (viewEleve) {
      const fresh = eleves.find((e) => e.id === viewEleve.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(viewEleve)) {
        setViewEleve(fresh);
      }
    }
  }, [eleves, viewEleve]);

  // Les élèves sortis / exclus / transférés n'apparaissent plus ici :
  // ils sont archivés dans « Anciens élèves » (réinsertion possible depuis cette page).
  const elevesPresents = useMemo(
    () => eleves.filter((e) => !["sorti", "exclu", "transfere"].includes(e.statut ?? "")),
    [eleves]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch;
    return elevesPresents.filter((s) => {
      const matchSearch = !q ||
        s.nom.toLowerCase().includes(q) ||
        s.prenom.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (s.classe_nom ?? "").toLowerCase().includes(q);
      const matchCycle = cycle === "all" || s.cycle_nom === cycle;
      const matchStatut = statut === "all" || s.statut === statut;
      const c = countByEleve.get(s.id) ?? 0;
      const matchDocs = docFilter === "all" || (docFilter === "with" ? c > 0 : c === 0);
      return matchSearch && matchCycle && matchStatut && matchDocs;
    });
  }, [elevesPresents, debouncedSearch, cycle, statut, docFilter, countByEleve]);


  const withDocsCount = useMemo(
    () => elevesPresents.reduce((acc, s) => acc + ((countByEleve.get(s.id) ?? 0) > 0 ? 1 : 0), 0),
    [elevesPresents, countByEleve]
  );


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const handleTransfer = async () => {
    if (!transferEleve || !transferClasseId) return;
    setActionLoading(true);
    const ok = await updateEleve(transferEleve.id, { classe_id: transferClasseId });
    if (ok) toast.success(`${transferEleve.nom} ${transferEleve.prenom} transféré(e)`);
    setTransferEleve(null);
    setTransferClasseId("");
    setActionLoading(false);
  };

  const handleDesinscrire = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    const ok = await updateEleve(deleteTarget.id, { statut: "sorti" });
    if (ok) toast.success(`${deleteTarget.nom} ${deleteTarget.prenom} désinscrit(e)`);
    setDeleteTarget(null);
    setActionLoading(false);
  };

  const handlePurge = async () => {
    if (!purgeTarget || !isAdmin) return;
    setActionLoading(true);
    // Seuls les paiements NON annulés bloquent la suppression : un élève dont
    // tous les encaissements ont été annulés redevient supprimable.
    const { count, error: cErr } = await supabase
      .from("paiements")
      .select("id", { head: true, count: "exact" })
      .eq("eleve_id", purgeTarget.id)
      .is("annule_le", null);
    if (cErr) { setActionLoading(false); toast.error(cErr.message); return; }
    if ((count ?? 0) > 0) {
      setActionLoading(false);
      toast.error("Suppression refusée", { description: "Cet élève a des paiements actifs (non annulés). Annulez-les d'abord." });
      setPurgeTarget(null);
      return;
    }

    const ok = await deleteEleve(purgeTarget.id);
    if (ok) toast.success(`${purgeTarget.nom} ${purgeTarget.prenom} supprimé(e) définitivement`);
    setPurgeTarget(null);
    setActionLoading(false);
  };

  // ── Liste des élèves par classe (PDF) ──
  // Inclut les statuts "actifs" (inscrit/pré-inscrit/actif), exclut sortis/exclus,
  // conformément à src/lib/eleveStatus.ts. "Nouveau" = aucune fiche pour ce
  // matricule dans une année scolaire antérieure à l'année active (décision
  // utilisateur du 11/08/2026 — cf. commentaire dans
  // src/hooks/useAnciensMatricules.ts et generateStudentRosterPDF.ts).
  const calcEstNouveau = (e: typeof eleves[0]) => !matriculesAnciens.has(e.matricule);

  const buildRosterData = (): RosterData => {
    const eligibles = eleves.filter((e) => isStatutActif(e.statut));
    const parClasse = new Map<string, typeof eligibles>();
    for (const e of eligibles) {
      const key = e.classe_id ?? "__sans_classe__";
      const list = parClasse.get(key) ?? [];
      list.push(e);
      parClasse.set(key, list);
    }
    const toRoster = (list: typeof eligibles) =>
      list.map((e) => ({
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        sexe: e.sexe,
        statut: e.statut,
        estNouveau: calcEstNouveau(e),
      }));
    const classesTriees = [...classes].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const rosterClasses: RosterClasse[] = classesTriees.map((c) => ({
      classeNom: c.nom,
      cycleNom: c.cycle_nom,
      eleves: toRoster(parClasse.get(c.id) ?? []),
    }));
    const sansClasse = parClasse.get("__sans_classe__") ?? [];
    if (sansClasse.length > 0) {
      rosterClasses.push({ classeNom: "Sans classe assignée", cycleNom: null, eleves: toRoster(sansClasse) });
    }
    return { anneeLabel: activeAnnee.libelle, classes: rosterClasses };
  };

  const handleRoster = async (previewOnly: boolean) => {
    setRosterBusy(true);
    try {
      const meta = { nom: ecole.nom, devise: ecole.devise, adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email, logoUrl: ecole.logo_url };
      const data = buildRosterData();
      if (data.classes.every((c) => c.eleves.length === 0)) {
        toast.info("Aucun élève inscrit ou pré-inscrit à afficher.");
        return;
      }
      if (previewOnly) {
        const pdf = await generateListeElevesPDF(meta, data, { afficherStatut, returnDoc: true });
        if (pdf) setPdfUrl(URL.createObjectURL((pdf as any).output("blob")));
      } else {
        await generateListeElevesPDF(meta, data, { afficherStatut });
        toast.success("Liste des élèves téléchargée");
      }
    } finally {
      setRosterBusy(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusBadge = (s: typeof eleves[0]) => {
    const v = s.statut;
    const variant: "default" | "secondary" | "destructive" | "outline" =
      v === "inscrit" || v === "actif" ? "default"
      : v === "pre_inscrit" ? "secondary"
      : v === "suspendu" ? "outline"
      : "destructive";
    const label = v === "pre_inscrit" ? "pré-inscrit" : v;
    return <Badge variant={variant} className="text-[10px] capitalize">{label}</Badge>;
  };

  const finalizeButton = (s: typeof eleves[0]) => (
    s.statut === "pre_inscrit" ? (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
        onClick={(e) => { e.stopPropagation(); setWorkflowEleve(s); }}
        title="Finaliser l'inscription définitive de cet élève"
      >
        <Sparkles className="h-3 w-3" /> Finaliser
      </Button>
    ) : null
  );

  const studentAvatar = (s: typeof eleves[0], size: string = "h-9 w-9 sm:h-8 sm:w-8", textSize: string = "text-xs") => (
    <Avatar className={`${size} ring-2 ring-primary/20 ring-offset-2 ring-offset-background shadow-sm`}>
      {s.photo_url ? <AvatarImage src={s.photo_url} alt={`${s.nom} ${s.prenom}`} /> : null}
      <AvatarFallback className={`${textSize} bg-accent/20 text-accent-foreground font-semibold`}>
        {initials(s.nom, s.prenom)}
      </AvatarFallback>
    </Avatar>
  );

  const studentActions = (s: typeof eleves[0]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewEleve(s)}>
          <Eye className="h-4 w-4 mr-2" />Voir la fiche
        </DropdownMenuItem>
        {s.statut === "pre_inscrit" && (
          <DropdownMenuItem onClick={() => setWorkflowEleve(s)}>
            <Sparkles className="h-4 w-4 mr-2" />Finaliser l'inscription
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => { setTransferEleve(s); setTransferClasseId(s.classe_id ?? ""); }}>
          <Shuffle className="h-4 w-4 mr-2" />Transférer de classe
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(s)}>
          <Trash2 className="h-4 w-4 mr-2" />Désinscrire
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setPurgeTarget(s)}
            title="Supprimer définitivement (uniquement si aucun paiement)"
          >
            <ShieldAlert className="h-4 w-4 mr-2" />Supprimer définitivement
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <SettingsSection
        icon={<Users className="h-5 w-5" />}
        title={`Liste des élèves (${filtered.length})`}
        description={`Recherchez, filtrez et consultez la fiche d'un élève. ${withDocsCount} avec document, ${elevesPresents.length - withDocsCount} sans. Les élèves sortis sont archivés dans « Anciens élèves ».`}
        hideSave
      >
        <HelpBanner storageKey="eleves-liste" title="Comment utiliser cette page ?">
          Recherchez un élève par nom ou matricule, filtrez par classe ou cycle, puis cliquez sur l'icône <strong>œil</strong> pour ouvrir sa fiche complète (parents, paiements, documents).
        </HelpBanner>
        <StatusLegend title="Que veulent dire les statuts d'un élève ?" items={STATUTS_ELEVE} />
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom, prénom, matricule, classe..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cycles</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pre_inscrit">Pré-inscrit</SelectItem>
                <SelectItem value="inscrit">Inscrit</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                
              </SelectContent>
            </Select>
            <Select value={docFilter} onValueChange={(v) => setDocFilter(v as typeof docFilter)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les dossiers</SelectItem>
                <SelectItem value="with">Avec au moins un document</SelectItem>
                <SelectItem value="without">Sans aucun document</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
              onClick={() => setBulkOpen(true)}
              title="Finaliser plusieurs pré-inscriptions à la fois"
            >
              <Sparkles className="h-4 w-4" />
              Finaliser en lot {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setDuplicatesOpen(true)}
              title="Détecter les doublons d'élèves"
            >
              <AlertTriangle className="h-4 w-4" />
              Doublons
            </Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 select-none">
              <Checkbox checked={afficherStatut} onCheckedChange={(v) => setAfficherStatut(v === true)} />
              Statut d'inscription sur le PDF
            </label>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleRoster(true)}
              disabled={rosterBusy}
              title="Aperçu de la liste des élèves par classe (effectifs, sexe, statut d'inscription)"
            >
              {rosterBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Aperçu
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => handleRoster(false)}
              disabled={rosterBusy}
              title="Imprimer / télécharger la liste des élèves par classe"
            >
              {rosterBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Imprimer
            </Button>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-none"
                onClick={() => setViewMode("list")}
                title="Vue liste"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-none"
                onClick={() => setViewMode("grid")}
                title="Vue miniatures"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        paginated.filter((s) => s.statut === "pre_inscrit").length > 0 &&
                        paginated.filter((s) => s.statut === "pre_inscrit").every((s) => selectedIds.has(s.id))
                      }
                      onCheckedChange={(c) => {
                        const next = new Set(selectedIds);
                        paginated.filter((s) => s.statut === "pre_inscrit").forEach((s) => {
                          if (c) next.add(s.id); else next.delete(s.id);
                        });
                        setSelectedIds(next);
                      }}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Élève</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="hidden md:table-cell w-20 text-center">Docs</TableHead>
                  <TableHead className="hidden md:table-cell">Né(e) le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setViewEleve(s)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {s.statut === "pre_inscrit" ? (
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={(c) => {
                            const next = new Set(selectedIds);
                            if (c) next.add(s.id); else next.delete(s.id);
                            setSelectedIds(next);
                          }}
                          aria-label="Sélectionner"
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.matricule}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {studentAvatar(s)}
                        <div>
                          <p className="font-medium leading-tight flex items-center gap-1.5 flex-wrap">
                            {s.nom} {s.prenom}
                            {s.est_nouveau && /maternelle/i.test(s.cycle_nom ?? "") && (
                              <Badge
                                className="text-[10px] px-1.5 py-0 bg-accent/40 text-accent-foreground border-accent/60"
                                title="Nouvel(le) élève en maternelle — tarif « Nouveau » appliqué cette année"
                              >
                                Nouveau
                              </Badge>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.sexe === "F" ? "Fille" : s.sexe === "M" ? "Garçon" : "—"} • {s.cycle_nom ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{s.classe_nom ?? "Non affecté"}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {(() => {
                        const c = countByEleve.get(s.id) ?? 0;
                        return c > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-medium"
                            title={`${c} document(s) dans le dossier`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {c}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-muted-foreground/60 text-[11px]"
                            title="Aucun document"
                          >
                            <Paperclip className="h-3 w-3" />—
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(s.date_naissance)}</TableCell>
                    <TableCell><div className="flex items-center gap-1.5 flex-wrap">{statusBadge(s)}{finalizeButton(s)}</div></TableCell>
                    <TableCell>{studentActions(s)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Aucun élève trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* GRID / CARD VIEW */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {paginated.map((s) => (
              <Card
                key={s.id}
                className="relative group p-3 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewEleve(s)}
              >
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {studentActions(s)}
                </div>
                {(() => {
                  const c = countByEleve.get(s.id) ?? 0;
                  return c > 0 ? (
                    <span
                      className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                      title={`${c} document(s) dans le dossier`}
                    >
                      <Paperclip className="h-2.5 w-2.5" />
                      {c}
                    </span>
                  ) : null;
                })()}
                {studentAvatar(s, "h-16 w-16", "text-xl")}
                <div className="min-w-0 w-full">
                  <p className="font-semibold text-sm leading-tight truncate">{s.nom} {s.prenom}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.matricule}</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <Badge variant="secondary" className="text-[10px]">{s.classe_nom ?? "Non affecté"}</Badge>
                  {s.est_nouveau && /maternelle/i.test(s.cycle_nom ?? "") && (
                    <Badge
                      className="text-[10px] px-1.5 py-0 bg-accent/40 text-accent-foreground border-accent/60"
                      title="Nouvel(le) élève en maternelle — tarif « Nouveau » appliqué cette année"
                    >
                      Nouveau
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{s.sexe === "F" ? "F" : s.sexe === "M" ? "M" : "—"}</span>
                  <span>•</span>
                  <span>{formatDate(s.date_naissance)}</span>
                </div>
                {statusBadge(s)}
                {finalizeButton(s)}
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                Aucun élève trouvé.
              </div>
            )}
          </div>
        )}

        {/* Pagination footer */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 pt-2 text-sm">
            <p className="text-muted-foreground text-xs">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>


      {/* Student detail drawer */}
      <StudentDetailDrawer
        eleve={viewEleve}
        open={!!viewEleve}
        onClose={() => { setViewEleve(null); setViewEleveTab(undefined); refetchDocsCount(); }}
        onUpdated={() => { /* realtime handles list refresh, drawer stays open */ }}
        initialTab={viewEleveTab}
      />

      {/* Inscription workflow */}
      <InscriptionWorkflowDialog
        eleve={workflowEleve}
        open={!!workflowEleve}
        onClose={() => setWorkflowEleve(null)}
        onOpenDrawer={(tab) => { setViewEleveTab(tab); setViewEleve(workflowEleve); }}
        onUpdated={() => fetchEleves()}
      />


      {/* Bulk finalization */}
      <BulkInscriptionDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        eleves={
          selectedIds.size > 0
            ? eleves.filter((e) => selectedIds.has(e.id) && e.statut === "pre_inscrit")
            : eleves.filter((e) => e.statut === "pre_inscrit")
        }
        onDone={() => { fetchEleves(); setSelectedIds(new Set()); }}
      />

      {/* Transfer dialog */}
      <Dialog open={!!transferEleve} onOpenChange={() => setTransferEleve(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transférer de classe</DialogTitle></DialogHeader>
          {transferEleve && (
            <div className="space-y-4">
              <p className="text-sm">Transférer <strong>{transferEleve.nom} {transferEleve.prenom}</strong> vers :</p>
              <Select value={transferClasseId} onValueChange={setTransferClasseId}>
                <SelectTrigger><SelectValue placeholder="Nouvelle classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferEleve(null)}>Annuler</Button>
            <Button onClick={handleTransfer} disabled={actionLoading || !transferClasseId}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desinscription dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Désinscrire un élève</DialogTitle></DialogHeader>
          {deleteTarget && (
            <p className="text-sm">
              Êtes-vous sûr de vouloir désinscrire <strong>{deleteTarget.nom} {deleteTarget.prenom}</strong> ({deleteTarget.matricule}) ?
              L'élève sera marqué comme « sorti ».
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDesinscrire} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Désinscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression définitive (admin) */}
      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Suppression définitive
            </DialogTitle>
          </DialogHeader>
          {purgeTarget && (
            <div className="space-y-2 text-sm">
              <p>
                Vous êtes sur le point de supprimer <strong>définitivement</strong>{" "}
                <strong>{purgeTarget.nom} {purgeTarget.prenom}</strong> ({purgeTarget.matricule}).
              </p>
              <p className="text-destructive">
                Cette action est <strong>irréversible</strong> et n'est autorisée que si l'élève n'a aucun paiement enregistré.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doublons */}
      <DuplicatesDialog
        open={duplicatesOpen}
        onClose={() => setDuplicatesOpen(false)}
        eleves={eleves}
        onView={(e) => { setDuplicatesOpen(false); setViewEleve(e); }}
        onDeleted={() => fetchEleves()}
      />

      {/* Aperçu PDF — liste des élèves par classe */}
      <Dialog open={!!pdfUrl} onOpenChange={(open) => { if (!open) closePdfPreview(); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Aperçu — Liste des élèves par classe</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full rounded border" title="Aperçu de la liste des élèves" />
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => handleRoster(false)} disabled={rosterBusy} className="gap-1">
              <Printer className="h-4 w-4" />Imprimer / Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>

  );
}
