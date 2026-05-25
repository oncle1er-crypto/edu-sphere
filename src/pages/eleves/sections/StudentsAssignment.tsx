import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Shuffle, Loader2, ArrowRight } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { toast } from "sonner";

export default function StudentsAssignment() {
  const { classes, loading: loadingC } = useClasses();
  const { eleves, loading: loadingE, updateEleve } = useEleves();

  const [sourceClasseId, setSourceClasseId] = useState<string | null>(null);
  const [targetClasseId, setTargetClasseId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferring, setTransferring] = useState(false);

  // Unassigned students
  const unassigned = eleves.filter((e) => !e.classe_id && (e.statut === "inscrit" || e.statut === "actif"));

  const sourceEleves = sourceClasseId === "__unassigned"
    ? unassigned
    : sourceClasseId
      ? eleves.filter((e) => e.classe_id === sourceClasseId)
      : [];

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleTransfer = async () => {
    if (selected.size === 0 || !targetClasseId) return;
    setTransferring(true);
    let ok = 0;
    for (const id of selected) {
      const result = await updateEleve(id, { classe_id: targetClasseId });
      if (result) ok++;
    }
    toast.success(`${ok} élève(s) transféré(s)`);
    setSelected(new Set());
    setSourceClasseId(null);
    setTargetClasseId("");
    setTransferring(false);
  };

  if (loadingC || loadingE) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Compute effectif from eleves (real count)
  const classesWithEffectif = classes.map((c) => {
    const effectif = eleves.filter((e) => e.classe_id === c.id).length;
    const capacite = c.capacite ?? 50;
    return { ...c, effectif, capacite };
  });

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<GraduationCap className="h-5 w-5" />}
        title="Affectation aux classes"
        description="Visualisez les effectifs et déplacez des élèves entre classes."
        hideSave
      >
        {unassigned.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {unassigned.length} élève(s) non affecté(s)
            </span>
            <Button size="sm" variant="outline" onClick={() => { setSourceClasseId("__unassigned"); setSelected(new Set()); }}>
              Affecter
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classesWithEffectif.map((c) => {
            const pct = c.capacite > 0 ? Math.round((c.effectif / c.capacite) * 100) : 0;
            const full = pct >= 100;
            return (
              <Card key={c.id} className="border cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSourceClasseId(c.id); setSelected(new Set()); }}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold font-display">{c.nom}</h4>
                    <Badge variant={full ? "destructive" : "secondary"} className="text-[10px]">
                      {full ? "Pleine" : "Disponible"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prof. principal : {c.prof_nom || "Non assigné"}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{c.effectif} / {c.capacite}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucune classe configurée.</p>
          )}
        </div>
      </SettingsSection>

      {/* Transfer dialog */}
      <Dialog open={!!sourceClasseId} onOpenChange={() => { setSourceClasseId(null); setSelected(new Set()); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sourceClasseId === "__unassigned"
                ? "Élèves non affectés"
                : `Élèves — ${classes.find((c) => c.id === sourceClasseId)?.nom ?? ""}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={targetClasseId} onValueChange={setTargetClasseId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Classe de destination" /></SelectTrigger>
                <SelectContent>
                  {classes.filter((c) => c.id !== sourceClasseId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={sourceEleves.length > 0 && selected.size === sourceEleves.length} onCheckedChange={() => { if (selected.size === sourceEleves.length) setSelected(new Set()); else setSelected(new Set(sourceEleves.map((e) => e.id))); }} /></TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceEleves.map((e) => (
                    <TableRow key={e.id} className={selected.has(e.id) ? "bg-accent/10" : ""}>
                      <TableCell><Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleOne(e.id)} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.matricule}</TableCell>
                      <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                      <TableCell><Badge variant="secondary">{e.statut}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {sourceEleves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Aucun élève.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSourceClasseId(null)}>Fermer</Button>
            <Button onClick={handleTransfer} disabled={transferring || selected.size === 0 || !targetClasseId}>
              {transferring && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Transférer {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
