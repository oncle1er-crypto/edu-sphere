import { useEffect, useMemo, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRightLeft, Plus, Loader2, Undo2, Users } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Transfert {
  id: string;
  created_at: string;
  user_label: string | null;
  details: any;
  action: string;
}

export default function ClassesTransfers() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes } = useClasses(activeAnnee.id);
  const { eleves } = useEleves(activeAnnee.id);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSingle, setOpenSingle] = useState(false);
  const [openMass, setOpenMass] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [destId, setDestId] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  // Mass
  const [sourceId, setSourceId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("id, created_at, user_label, details, action")
      .in("action", ["transfert_classe", "annulation_transfert"])
      .order("created_at", { ascending: false })
      .limit(100);
    setTransferts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const elevesInSource = useMemo(
    () => eleves.filter((e) => e.classe_id === sourceId),
    [eleves, sourceId]
  );

  const handleSingle = async () => {
    if (!eleveId || !destId) return;
    setSaving(true);
    const { error } = await supabase.rpc("transferer_eleve" as any, {
      _eleve_id: eleveId, _classe_dest_id: destId, _motif: motif || null, _force: false,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Transfert enregistré");
    setOpenSingle(false);
    setEleveId(""); setDestId(""); setMotif("");
    await load();
  };

  const handleMass = async () => {
    if (selected.length === 0 || !destId) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("transferer_masse" as any, {
      _eleve_ids: selected, _classe_dest_id: destId, _motif: motif || null, _force: false,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    toast.success(`Transferts : ${res.ok} réussis, ${res.erreurs} erreurs`);
    setOpenMass(false);
    setSourceId(""); setDestId(""); setSelected([]); setMotif("");
    await load();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Annuler ce transfert et repositionner l'élève dans sa classe d'origine ?")) return;
    const { error } = await supabase.rpc("annuler_transfert" as any, { _audit_log_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Transfert annulé");
    await load();
  };

  const canCancel = (t: Transfert) =>
    t.action === "transfert_classe" &&
    new Date(t.created_at) > new Date(Date.now() - 30 * 86400_000) &&
    t.details?.classe_origine_id;

  return (
    <SettingsSection
      icon={<ArrowRightLeft className="h-5 w-5" />}
      title="Transferts & passages"
      description="Mouvements d'élèves entre classes avec contrôle de capacité et annulation."
      hideSave
    >
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpenMass(true)}>
          <Users className="h-4 w-4" />Transfert en masse
        </Button>
        <Button size="sm" onClick={() => setOpenSingle(true)}>
          <Plus className="h-4 w-4" />Nouveau transfert
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Par</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : transferts.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Aucun transfert enregistré.</TableCell></TableRow>
            ) : transferts.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  {t.action === "annulation_transfert"
                    ? <Badge className="bg-amber-500/15 text-amber-700 text-[10px]">Annulation</Badge>
                    : <Badge variant="outline" className="text-[10px]">Transfert</Badge>}
                </TableCell>
                <TableCell className="font-medium">{t.details?.eleve_nom ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary">{t.details?.de ?? t.details?.retour_vers ?? "—"}</Badge></TableCell>
                <TableCell><Badge>{t.details?.vers ?? "—"}</Badge></TableCell>
                <TableCell className="text-sm">{t.details?.motif ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.user_label ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {canCancel(t) && (
                    <Button size="sm" variant="ghost" onClick={() => handleCancel(t.id)}>
                      <Undo2 className="h-3.5 w-3.5" />Annuler
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Single */}
      <Dialog open={openSingle} onOpenChange={setOpenSingle}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau transfert</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Élève *</Label>
              <Select value={eleveId} onValueChange={setEleveId}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                <SelectContent>
                  {eleves.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom} — {classes.find((c) => c.id === e.classe_id)?.nom ?? "Sans classe"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classe de destination *</Label>
              <Select value={destId} onValueChange={setDestId}>
                <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom} ({c.effectif ?? 0}/{c.capacite ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motif</Label>
              <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Demande des parents, réorientation…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSingle(false)}>Annuler</Button>
            <Button onClick={handleSingle} disabled={saving || !eleveId || !destId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass */}
      <Dialog open={openMass} onOpenChange={setOpenMass}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Transfert en masse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Classe source *</Label>
                <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSelected([]); }}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom} ({c.effectif ?? 0} él.)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Classe destination *</Label>
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {classes.filter((c) => c.id !== sourceId).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom} ({c.effectif ?? 0}/{c.capacite ?? "—"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sourceId && (
              <div className="border rounded-lg max-h-64 overflow-y-auto p-2 space-y-1">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selected.length === elevesInSource.length && elevesInSource.length > 0}
                    onCheckedChange={(v) => setSelected(v ? elevesInSource.map((e) => e.id) : [])}
                  />
                  <span className="text-xs font-semibold">Tout sélectionner ({elevesInSource.length})</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{selected.length} sélectionné(s)</Badge>
                </div>
                {elevesInSource.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm py-1 px-1 hover:bg-muted/50 rounded cursor-pointer">
                    <Checkbox
                      checked={selected.includes(e.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => v ? [...prev, e.id] : prev.filter((id) => id !== e.id))
                      }
                    />
                    <span>{e.nom} {e.prenom}</span>
                  </label>
                ))}
                {elevesInSource.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun élève dans cette classe.</p>
                )}
              </div>
            )}

            <div>
              <Label>Motif</Label>
              <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Réorganisation, redoublement collectif…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMass(false)}>Annuler</Button>
            <Button onClick={handleMass} disabled={saving || selected.length === 0 || !destId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transférer {selected.length} élève(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
