import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Plus, Loader2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Transfert {
  id: string;
  created_at: string;
  user_label: string | null;
  details: any;
}

export default function ClassesTransfers() {
  const { classes } = useClasses();
  const { eleves } = useEleves();
  const { user } = useAuth();
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [destId, setDestId] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("id, created_at, user_label, details")
      .eq("action", "transfert_classe")
      .order("created_at", { ascending: false })
      .limit(50);
    setTransferts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const eleve = eleves.find((e) => e.id === eleveId);
    const dest = classes.find((c) => c.id === destId);
    if (!eleve || !dest || !user) return;
    const origineId = eleve.classe_id;
    if (origineId === destId) { toast.error("L'élève est déjà dans cette classe"); return; }

    setSaving(true);
    const origine = classes.find((c) => c.id === origineId);

    const { error: upErr } = await supabase
      .from("eleves")
      .update({ classe_id: destId })
      .eq("id", eleveId);
    if (upErr) { toast.error(upErr.message); setSaving(false); return; }

    await supabase.from("audit_logs").insert({
      ecole_id: eleve.ecole_id,
      user_id: user.id,
      user_label: user.email ?? "Utilisateur",
      action: "transfert_classe",
      cible: `${eleve.prenom} ${eleve.nom}`,
      niveau: "info",
      details: {
        eleve_id: eleveId,
        eleve_nom: `${eleve.prenom} ${eleve.nom}`,
        de: origine?.nom ?? "—",
        vers: dest.nom,
        motif: motif || null,
      },
    });

    toast.success("Transfert enregistré");
    setSaving(false);
    setOpen(false);
    setEleveId(""); setDestId(""); setMotif("");
    await load();
  };

  return (
    <SettingsSection
      icon={<ArrowRightLeft className="h-5 w-5" />}
      title="Transferts & passages"
      description="Mouvements d'élèves entre classes."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nouveau transfert</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : transferts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Aucun transfert enregistré.</TableCell></TableRow>
            ) : transferts.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="font-medium">{t.details?.eleve_nom ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary">{t.details?.de ?? "—"}</Badge></TableCell>
                <TableCell><Badge>{t.details?.vers ?? "—"}</Badge></TableCell>
                <TableCell className="text-sm">{t.details?.motif ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.user_label ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau transfert</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Élève *</Label>
              <Select value={eleveId} onValueChange={setEleveId}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                <SelectContent>
                  {eleves.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {classes.find((c) => c.id === e.classe_id)?.nom ?? "Sans classe"}</SelectItem>
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
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
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
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !eleveId || !destId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
