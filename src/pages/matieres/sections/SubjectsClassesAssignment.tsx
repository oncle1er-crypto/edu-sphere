import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Loader2, Sparkles, Copy, Settings2 } from "lucide-react";
import { useMatieres } from "@/hooks/useMatieres";
import { useClasses } from "@/hooks/useClasses";
import { useEcoleId } from "@/hooks/useEcoleId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CYCLES_FILTER = ["Maternelle", "Primaire", "Collège", "Lycée"] as const;

type CellData = { coefficient: number; volume_horaire_hebdo: number };

export default function SubjectsClassesAssignment() {
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const { matieres, loading: lm } = useMatieres();
  const { classes, loading: lc } = useClasses();
  const { ecoleId } = useEcoleId();
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [loading, setLoading] = useState(true);

  const [packOpen, setPackOpen] = useState(false);
  const [packCycle, setPackCycle] = useState<string>("Primaire");

  const [copyOpen, setCopyOpen] = useState(false);
  const [copySource, setCopySource] = useState<string>("");
  const [copyTarget, setCopyTarget] = useState<string>("");

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("classe_matieres")
      .select("classe_id, matiere_id, coefficient, volume_horaire_hebdo")
      .eq("ecole_id", ecoleId);
    const map: Record<string, CellData> = {};
    (data ?? []).forEach((r: any) => {
      map[`${r.classe_id}|${r.matiere_id}`] = {
        coefficient: Number(r.coefficient) || 1,
        volume_horaire_hebdo: Number(r.volume_horaire_hebdo) || 0,
      };
    });
    setCells(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ecoleId]);

  const toggle = async (classe_id: string, matiere_id: string, checked: boolean) => {
    if (!ecoleId) return;
    const key = `${classe_id}|${matiere_id}`;
    if (checked) {
      const m = matieres.find((x) => x.id === matiere_id);
      const coef = Number(m?.coefficient) || 1;
      const { error } = await supabase.from("classe_matieres").insert({
        ecole_id: ecoleId, classe_id, matiere_id, coefficient: coef, volume_horaire_hebdo: 2,
      });
      if (error) return toast.error(error.message);
      setCells((s) => ({ ...s, [key]: { coefficient: coef, volume_horaire_hebdo: 2 } }));
    } else {
      const { error } = await supabase.from("classe_matieres").delete()
        .eq("ecole_id", ecoleId).eq("classe_id", classe_id).eq("matiere_id", matiere_id);
      if (error) return toast.error(error.message);
      setCells((s) => { const n = { ...s }; delete n[key]; return n; });
    }
  };

  const updateCell = async (classe_id: string, matiere_id: string, patch: Partial<CellData>) => {
    if (!ecoleId) return;
    const key = `${classe_id}|${matiere_id}`;
    const next = { ...cells[key], ...patch };
    setCells((s) => ({ ...s, [key]: next }));
    const { error } = await supabase.from("classe_matieres").update(patch)
      .eq("ecole_id", ecoleId).eq("classe_id", classe_id).eq("matiere_id", matiere_id);
    if (error) toast.error(error.message);
  };

  const applyPackMena = async () => {
    if (!ecoleId) return;
    const targetClasses = classes.filter((c) => c.cycle_nom === packCycle);
    const targetMatieres = matieres.filter((m) => (m.cycles ?? []).includes(packCycle) && (m as any).active !== false);
    if (targetClasses.length === 0 || targetMatieres.length === 0) {
      toast.error("Aucune matière ou classe pour ce cycle"); return;
    }
    const rows: any[] = [];
    targetClasses.forEach((c) => {
      targetMatieres.forEach((m) => {
        if (!cells[`${c.id}|${m.id}`]) {
          rows.push({
            ecole_id: ecoleId, classe_id: c.id, matiere_id: m.id,
            coefficient: Number(m.coefficient) || 1,
            volume_horaire_hebdo: 2,
          });
        }
      });
    });
    if (rows.length === 0) { toast.info("Toutes les affectations existent déjà"); setPackOpen(false); return; }
    const { error } = await supabase.from("classe_matieres").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} affectation(s) créée(s) (Pack MENA — ${packCycle})`);
    setPackOpen(false);
    load();
  };

  const applyCopy = async () => {
    if (!ecoleId || !copySource || !copyTarget || copySource === copyTarget) {
      toast.error("Sélectionnez une classe source et une cible différentes"); return;
    }
    const rows: any[] = [];
    Object.entries(cells).forEach(([k, v]) => {
      const [cId, mId] = k.split("|");
      if (cId === copySource && !cells[`${copyTarget}|${mId}`]) {
        rows.push({
          ecole_id: ecoleId, classe_id: copyTarget, matiere_id: mId,
          coefficient: v.coefficient, volume_horaire_hebdo: v.volume_horaire_hebdo,
        });
      }
    });
    if (rows.length === 0) { toast.info("Rien à copier"); setCopyOpen(false); return; }
    const { error } = await supabase.from("classe_matieres").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} matière(s) copiée(s)`);
    setCopyOpen(false);
    setCopySource(""); setCopyTarget("");
    load();
  };

  const isLoading = lm || lc || loading;
  const filteredClasses = cycleFilter === "all" ? classes : classes.filter((c) => c.cycle_nom === cycleFilter);
  const filteredMatieres = cycleFilter === "all" ? matieres : matieres.filter((m) => (m.cycles ?? []).includes(cycleFilter));

  return (
    <SettingsSection
      icon={<BookOpen className="h-5 w-5" />}
      title="Affectation des matières aux classes"
      description="Cochez, ajustez coefficient & volume horaire, ou appliquez un pack MENA."
      hideSave
    >
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setPackOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Pack MENA
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCopyOpen(true)}>
            <Copy className="h-4 w-4 mr-1" /> Copier depuis…
          </Button>
        </div>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous cycles</SelectItem>
            {CYCLES_FILTER.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filteredMatieres.length === 0 || filteredClasses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune matière ou classe pour ce cycle.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Matière</TableHead>
                {filteredClasses.map((c) => (
                  <TableHead key={c.id} className="text-center text-xs whitespace-nowrap">{c.nom}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatieres.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="sticky left-0 bg-card font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.couleur || "bg-primary"}`} />
                      {m.nom}
                    </div>
                  </TableCell>
                  {filteredClasses.map((c) => {
                    const key = `${c.id}|${m.id}`;
                    const cell = cells[key];
                    const active = !!cell;
                    return (
                      <TableCell key={c.id} className="text-center">
                        {active ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] hover:bg-accent">
                                <span className="font-semibold">×{cell.coefficient}</span>
                                <span className="text-muted-foreground">· {cell.volume_horaire_hebdo}h</span>
                                <Settings2 className="h-3 w-3 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 space-y-3">
                              <div className="text-xs font-medium">{m.nom} — {c.nom}</div>
                              <div className="space-y-1">
                                <Label className="text-xs">Coefficient</Label>
                                <Input type="number" min={0} step={0.5} value={cell.coefficient}
                                  onChange={(e) => setCells((s) => ({ ...s, [key]: { ...s[key], coefficient: Number(e.target.value) } }))}
                                  onBlur={(e) => updateCell(c.id, m.id, { coefficient: Number(e.target.value) })}
                                  className="h-8" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Volume horaire (h/sem)</Label>
                                <Input type="number" min={0} step={0.5} value={cell.volume_horaire_hebdo}
                                  onChange={(e) => setCells((s) => ({ ...s, [key]: { ...s[key], volume_horaire_hebdo: Number(e.target.value) } }))}
                                  onBlur={(e) => updateCell(c.id, m.id, { volume_horaire_hebdo: Number(e.target.value) })}
                                  className="h-8" />
                              </div>
                              <Button size="sm" variant="ghost" className="w-full text-destructive"
                                onClick={() => toggle(c.id, m.id, false)}>
                                Retirer l'affectation
                              </Button>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Checkbox checked={false} onCheckedChange={(v) => toggle(c.id, m.id, !!v)} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={packOpen} onOpenChange={setPackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer un pack MENA</DialogTitle>
            <DialogDescription>
              Affecte toutes les matières actives du cycle choisi à toutes ses classes,
              avec coefficient par défaut et 2h/semaine. Les affectations existantes ne sont pas modifiées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Cycle cible</Label>
            <Select value={packCycle} onValueChange={setPackCycle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CYCLES_FILTER.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackOpen(false)}>Annuler</Button>
            <Button onClick={applyPackMena}><Sparkles className="h-4 w-4 mr-1" />Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copier les matières d'une classe</DialogTitle>
            <DialogDescription>
              Reprend toutes les matières (coef & volume) d'une classe source vers une classe cible.
              Les matières déjà présentes dans la cible sont conservées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Classe source</Label>
              <Select value={copySource} onValueChange={setCopySource}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Classe cible</Label>
              <Select value={copyTarget} onValueChange={setCopyTarget}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Annuler</Button>
            <Button onClick={applyCopy}><Copy className="h-4 w-4 mr-1" />Copier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
