import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, Download, Loader2, Undo2, ShieldAlert } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { toast } from "sonner";

function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(";")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function StudentsAlumni() {
  const { eleves, loading, updateEleve, deleteEleve } = useEleves();
  const { activeAnnee } = useAcademicPeriod();
  const { classes } = useClasses(activeAnnee?.id);
  const { isAdmin } = useIsAdmin();
  const [q, setQ] = useState("");

  const [reinsertTarget, setReinsertTarget] = useState<typeof eleves[0] | null>(null);
  const [reinsertClasseId, setReinsertClasseId] = useState("");
  const [purgeTarget, setPurgeTarget] = useState<typeof eleves[0] | null>(null);
  const [busy, setBusy] = useState(false);

  const alumni = eleves.filter((e) => e.statut === "sorti" || e.statut === "exclu" || e.statut === "transfere");
  const filtered = alumni.filter(
    (a) =>
      a.nom.toLowerCase().includes(q.toLowerCase()) ||
      a.prenom.toLowerCase().includes(q.toLowerCase()) ||
      a.matricule.toLowerCase().includes(q.toLowerCase())
  );

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("Aucune donnée à exporter");
      return;
    }
    const rows = filtered.map((a) => ({
      Matricule: a.matricule,
      Nom: a.nom,
      Prénom: a.prenom,
      Sexe: a.sexe ?? "",
      "Date naissance": a.date_naissance ?? "",
      "Lieu naissance": a.lieu_naissance ?? "",
      Nationalité: a.nationalite ?? "",
      "Dernière classe": a.classe_nom ?? "",
      Statut: a.statut,
    }));
    exportToCSV(rows, `anciens_eleves_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${rows.length} élèves exportés`);
  };

  const handleReinsert = async () => {
    if (!reinsertTarget) return;
    setBusy(true);
    const ok = await updateEleve(reinsertTarget.id, {
      statut: "inscrit",
      ...(reinsertClasseId ? { classe_id: reinsertClasseId } : {}),
    });
    if (ok) toast.success(`${reinsertTarget.nom} ${reinsertTarget.prenom} réinséré(e) dans la liste des élèves`);
    setReinsertTarget(null);
    setReinsertClasseId("");
    setBusy(false);
  };

  const handlePurge = async () => {
    if (!purgeTarget || !isAdmin) return;
    setBusy(true);
    // Seuls les paiements NON annulés bloquent la suppression définitive.
    const { count, error } = await supabase
      .from("paiements")
      .select("id", { head: true, count: "exact" })
      .eq("eleve_id", purgeTarget.id)
      .is("annule_le", null);
    if (error) { setBusy(false); toast.error(messageErreurBase(error)); return; }
    if ((count ?? 0) > 0) {
      setBusy(false);
      setPurgeTarget(null);
      toast.error("Suppression refusée", { description: "Cet élève a des paiements actifs (non annulés). Annulez-les d'abord." });
      return;
    }
    const ok = await deleteEleve(purgeTarget.id);
    if (ok) toast.success(`${purgeTarget.nom} ${purgeTarget.prenom} supprimé(e) définitivement`);
    setPurgeTarget(null);
    setBusy(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Archive className="h-5 w-5" />}
      title={`Anciens élèves (${filtered.length})`}
      description="Archives des élèves sortis, exclus ou transférés. Réinsérez un élève pour le remettre dans la liste des élèves."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, prénom, matricule..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />Exporter CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Dernière classe</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{a.matricule}</TableCell>
                <TableCell className="font-medium">{a.nom} {a.prenom}</TableCell>
                <TableCell><Badge variant="secondary">{a.classe_nom ?? "—"}</Badge></TableCell>
                <TableCell><Badge>{a.statut}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => { setReinsertTarget(a); setReinsertClasseId(a.classe_id ?? ""); }}
                      title="Réinsérer cet élève dans la liste des élèves"
                    >
                      <Undo2 className="h-3.5 w-3.5" />Réinsérer
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-destructive"
                        onClick={() => setPurgeTarget(a)}
                        title="Supprimer définitivement (si aucun paiement actif)"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />Supprimer
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun ancien élève trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Réinsertion */}
      <Dialog open={!!reinsertTarget} onOpenChange={() => setReinsertTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Réinsérer un élève</DialogTitle></DialogHeader>
          {reinsertTarget && (
            <div className="space-y-4 text-sm">
              <p>
                <strong>{reinsertTarget.nom} {reinsertTarget.prenom}</strong> ({reinsertTarget.matricule}) sera remis
                au statut « inscrit » et réapparaîtra dans la liste des élèves.
              </p>
              <Select value={reinsertClasseId} onValueChange={setReinsertClasseId}>
                <SelectTrigger><SelectValue placeholder="Classe d'affectation (optionnel)" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinsertTarget(null)}>Annuler</Button>
            <Button onClick={handleReinsert} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Réinsérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression définitive */}
      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />Suppression définitive
            </DialogTitle>
          </DialogHeader>
          {purgeTarget && (
            <div className="space-y-2 text-sm">
              <p>
                Supprimer <strong>définitivement</strong> <strong>{purgeTarget.nom} {purgeTarget.prenom}</strong> ({purgeTarget.matricule}) ?
              </p>
              <p className="text-destructive">
                Action <strong>irréversible</strong>, autorisée uniquement si l'élève n'a aucun paiement actif
                (les paiements annulés ne bloquent pas la suppression).
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
