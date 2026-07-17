import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wallet, Plus, Pencil, Trash2, RefreshCw, Copy, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useGrilleTarifs, NIVEAU_LABELS, type GrilleLigne } from "@/hooks/useGrilleTarifs";
import GrilleTarifEditor from "./GrilleTarifEditor";
import { fcfa } from "../scolarite-data";
import { toast } from "sonner";

export default function GrilleTarifaireSection() {
  const { ecoleId } = useEcoleId();
  const {
    lignes, isLoading, anneeId,
    upsert, isSaving,
    remove, regenererPreInscrits, isRegenerating,
    dupliquerDepuis, isDuplicating,
    recalculerTousEleves, isRecalculating,
  } = useGrilleTarifs();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GrilleLigne | null>(null);
  const [annees, setAnnees] = useState<Array<{ id: string; libelle: string }>>([]);
  const [srcAnnee, setSrcAnnee] = useState<string>("");
  const [dupOpen, setDupOpen] = useState(false);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("annees_scolaires")
      .select("id, libelle")
      .eq("ecole_id", ecoleId)
      .order("debut", { ascending: false })
      .then(({ data }) => setAnnees((data ?? []) as any));
  }, [ecoleId]);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (l: GrilleLigne) => { setEditing(l); setEditorOpen(true); };

  const handleSave = (data: any) => {
    upsert(data, { onSuccess: () => setEditorOpen(false) });
  };

  return (
    <SettingsSection
      title="Grille tarifaire — Scolarité"
      description="Tarifs par niveau, tranches personnalisables. Modifiable, supprimable, dupliquable."
      icon={<Wallet className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-wrap gap-2 justify-end">
        <Dialog open={dupOpen} onOpenChange={setDupOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!anneeId}>
              <Copy className="h-4 w-4" />Reconduire depuis…
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reconduire une grille tarifaire</DialogTitle>
              <DialogDescription>
                Copie toutes les lignes d'une année précédente vers l'année en cours. Les lignes existantes ne sont pas écrasées.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <Label>Année source</Label>
              <Select value={srcAnnee} onValueChange={setSrcAnnee}>
                <SelectTrigger><SelectValue placeholder="Choisir une année" /></SelectTrigger>
                <SelectContent>
                  {annees.filter((a) => a.id !== anneeId).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupOpen(false)}>Annuler</Button>
              <Button
                disabled={!srcAnnee || isDuplicating}
                onClick={() =>
                  dupliquerDepuis(srcAnnee, { onSuccess: () => setDupOpen(false) })
                }
              >
                {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Reconduire
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!anneeId || isRegenerating}>
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Régénérer pré-inscrits
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Régénérer les tranches des pré-inscrits ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les tranches de tous les élèves au statut « pré-inscrit » et sans aucun paiement seront supprimées
                et recalculées à partir de la grille en vigueur. Les élèves déjà inscrits ou ayant payé ne sont pas touchés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => regenererPreInscrits()}>Régénérer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="secondary" disabled={!anneeId || isRecalculating}>
              {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Appliquer à tous les élèves
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recalculer la scolarité de tous les élèves ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes les tranches non payées de tous les élèves de l'année en cours seront ajustées à la nouvelle grille tarifaire.
                <br /><br />
                <strong>Aucun paiement déjà encaissé n'est annulé</strong> — seul le montant restant est mis à jour.
                Les tranches déjà entièrement payées ne changent pas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => recalculerTousEleves(undefined)}>
                Confirmer et recalculer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" onClick={openCreate} disabled={!anneeId}>
          <Plus className="h-4 w-4" />Nouveau tarif
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : lignes.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">Aucun tarif défini pour l'année en cours.</p>
          <Button size="sm" onClick={openCreate} disabled={!anneeId}>
            <Plus className="h-4 w-4" />Créer le premier tarif
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Niveau</TableHead>
                <TableHead>Tranches</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{NIVEAU_LABELS[l.niveau_code]}</div>
                    <div className="flex gap-1 mt-1">
                      {l.variant === "ancien" && <Badge variant="outline" className="text-xs">Ancien</Badge>}
                      {l.variant === "nouveau" && <Badge className="text-xs bg-accent/30 text-accent-foreground">Nouveau</Badge>}
                      <span className="text-xs text-muted-foreground italic">{l.libelle}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {l.tranches.map((t, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs">
                          {t.label || `T${i + 1}`}: {fcfa(t.montant)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary tabular-nums">
                    {fcfa(l.montant_total)} F
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Le tarif « {l.libelle} » sera supprimé. Les élèves déjà facturés conservent leurs tranches existantes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(l.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
        <p className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Pour la <strong>Maternelle 1 (Petite Section)</strong>, la <strong>Maternelle 2 (Moyenne Section)</strong> et la <strong>Grande Section</strong>, créez deux lignes : une « Ancien » et une « Nouveau ». Le tarif appliqué à un élève dépend de la case « Nouvel élève » sur sa fiche.</span>
        </p>
        <p className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Toute modification s'applique aux nouvelles inscriptions. Utilisez « Régénérer pré-inscrits » pour la propager aux élèves non encore inscrits.</span>
        </p>
      </div>

      <GrilleTarifEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        existingCodes={lignes.map((l) => ({ niveau_code: l.niveau_code, variant: l.variant }))}
        onSave={handleSave}
        saving={isSaving}
      />
    </SettingsSection>
  );
}
