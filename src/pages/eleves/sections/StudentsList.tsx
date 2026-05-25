import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Users, Search, Download, MoreHorizontal, Loader2, Shuffle, Eye, Trash2, List, LayoutGrid } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { toast } from "sonner";
import StudentDetailDrawer from "@/pages/eleves/components/StudentDetailDrawer";

const initials = (n: string, p: string) => `${(p?.[0] ?? "")}${(n?.[0] ?? "")}`.toUpperCase();

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
};

type ViewMode = "list" | "grid";

export default function StudentsList() {
  const { eleves, loading, updateEleve, deleteEleve, fetchEleves } = useEleves();
  const { classes } = useClasses();
  const { cycles } = useCycles();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cycle, setCycle] = useState("all");
  const [statut, setStatut] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Debounce search input (180ms) to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, cycle, statut, viewMode]);

  // Dialogs
  const [viewEleve, setViewEleve] = useState<typeof eleves[0] | null>(null);
  const [transferEleve, setTransferEleve] = useState<typeof eleves[0] | null>(null);
  const [transferClasseId, setTransferClasseId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<typeof eleves[0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Keep drawer eleve in sync with realtime-refreshed list
  useEffect(() => {
    if (viewEleve) {
      const fresh = eleves.find((e) => e.id === viewEleve.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(viewEleve)) {
        setViewEleve(fresh);
      }
    }
  }, [eleves, viewEleve]);

  const filtered = useMemo(() => {
    const q = debouncedSearch;
    return eleves.filter((s) => {
      const matchSearch = !q ||
        s.nom.toLowerCase().includes(q) ||
        s.prenom.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (s.classe_nom ?? "").toLowerCase().includes(q);
      const matchCycle = cycle === "all" || s.cycle_nom === cycle;
      const matchStatut = statut === "all" || s.statut === statut;
      return matchSearch && matchCycle && matchStatut;
    });
  }, [eleves, debouncedSearch, cycle, statut]);

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
    if (ok) toast.success(`${transferEleve.prenom} ${transferEleve.nom} transféré(e)`);
    setTransferEleve(null);
    setTransferClasseId("");
    setActionLoading(false);
  };

  const handleDesinscrire = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    const ok = await updateEleve(deleteTarget.id, { statut: "sorti" });
    if (ok) toast.success(`${deleteTarget.prenom} ${deleteTarget.nom} désinscrit(e)`);
    setDeleteTarget(null);
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const studentAvatar = (s: typeof eleves[0], size: string = "h-8 w-8", textSize: string = "text-xs") => (
    <Avatar className={`${size} ring-2 ring-primary/20 ring-offset-2 ring-offset-background shadow-sm`}>
      {s.photo_url ? <AvatarImage src={s.photo_url} alt={`${s.prenom} ${s.nom}`} /> : null}
      <AvatarFallback className={`${textSize} bg-accent/20 text-accent-foreground font-semibold`}>
        {initials(s.nom, s.prenom)}
      </AvatarFallback>
    </Avatar>
  );

  const studentActions = (s: typeof eleves[0]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setViewEleve(s)}>
          <Eye className="h-4 w-4 mr-2" />Voir la fiche
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTransferEleve(s); setTransferClasseId(s.classe_id ?? ""); }}>
          <Shuffle className="h-4 w-4 mr-2" />Transférer de classe
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(s)}>
          <Trash2 className="h-4 w-4 mr-2" />Désinscrire
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <SettingsSection
        icon={<Users className="h-5 w-5" />}
        title={`Liste des élèves (${filtered.length})`}
        description="Recherchez, filtrez et consultez la fiche d'un élève."
        hideSave
      >
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
                <SelectItem value="sorti">Sorti</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" />Export</Button>
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
                  <TableHead>Matricule</TableHead>
                  <TableHead>Élève</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="hidden md:table-cell">Né(e) le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setViewEleve(s)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.matricule}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {studentAvatar(s)}
                        <div>
                          <p className="font-medium leading-tight">{s.prenom} {s.nom}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.sexe === "F" ? "Fille" : s.sexe === "M" ? "Garçon" : "—"} • {s.cycle_nom ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{s.classe_nom ?? "Non affecté"}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(s.date_naissance)}</TableCell>
                    <TableCell>{statusBadge(s)}</TableCell>
                    <TableCell>{studentActions(s)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
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
            {filtered.map((s) => (
              <Card
                key={s.id}
                className="relative group p-3 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewEleve(s)}
              >
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {studentActions(s)}
                </div>
                {studentAvatar(s, "h-16 w-16", "text-xl")}
                <div className="min-w-0 w-full">
                  <p className="font-semibold text-sm leading-tight truncate">{s.prenom} {s.nom}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.matricule}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{s.classe_nom ?? "Non affecté"}</Badge>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{s.sexe === "F" ? "F" : s.sexe === "M" ? "M" : "—"}</span>
                  <span>•</span>
                  <span>{formatDate(s.date_naissance)}</span>
                </div>
                {statusBadge(s)}
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                Aucun élève trouvé.
              </div>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Student detail drawer */}
      <StudentDetailDrawer
        eleve={viewEleve}
        open={!!viewEleve}
        onClose={() => setViewEleve(null)}
        onUpdated={() => { /* realtime handles list refresh, drawer stays open */ }}
      />

      {/* Transfer dialog */}
      <Dialog open={!!transferEleve} onOpenChange={() => setTransferEleve(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transférer de classe</DialogTitle></DialogHeader>
          {transferEleve && (
            <div className="space-y-4">
              <p className="text-sm">Transférer <strong>{transferEleve.prenom} {transferEleve.nom}</strong> vers :</p>
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
              Êtes-vous sûr de vouloir désinscrire <strong>{deleteTarget.prenom} {deleteTarget.nom}</strong> ({deleteTarget.matricule}) ?
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
    </>
  );
}
