import { useMemo, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, BookOpen, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useSalles, type Salle } from "@/hooks/useSalles";
import { SallesDialog } from "../components/SallesDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClassesRooms() {
  const { activeAnnee } = useAcademicPeriod();
  const { classes } = useClasses(activeAnnee.id);
  const { salles, loading, addSalle, updateSalle, deleteSalle } = useSalles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Salle | null>(null);
  const [toDelete, setToDelete] = useState<Salle | null>(null);

  const classesBySalle = useMemo(() => {
    const map = new Map<string, typeof classes>();
    classes.forEach((c) => {
      const key = (c as any).salle_id || (c.salle ?? "").trim();
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    });
    return map;
  }, [classes]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  const statutColor = (s: string) =>
    s === "disponible" ? "bg-emerald-500/15 text-emerald-700" :
    s === "occupee" ? "bg-blue-500/15 text-blue-700" :
    s === "maintenance" ? "bg-amber-500/15 text-amber-700" :
    "bg-rose-500/15 text-rose-700";

  return (
    <SettingsSection
      icon={<MapPin className="h-5 w-5" />}
      title={`Salles de classe (${salles.length})`}
      description="Créez, modifiez ou supprimez les salles de l'établissement."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />Nouvelle salle
        </Button>
      </div>

      {salles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucune salle enregistrée. Cliquez sur « Nouvelle salle » pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {salles.map((s) => {
            const rattaches = classesBySalle.get(s.id) ?? classesBySalle.get(s.code) ?? [];
            const effectif = rattaches.reduce((sum, c) => sum + (c.effectif ?? 0), 0);
            return (
              <Card key={s.id} className="border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-accent/15 text-primary flex items-center justify-center">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold font-display text-sm">Salle {s.code}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.nom || s.type}
                          {s.batiment ? ` · Bât. ${s.batiment}` : ""}
                          {s.etage ? ` · ${s.etage}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <Badge variant="outline">{s.type}</Badge>
                    <Badge className={statutColor(s.statut)}>{s.statut}</Badge>
                    <Badge variant="secondary">Cap. {s.capacite}</Badge>
                    {rattaches.length > 0 && <Badge variant="outline">{effectif} él.</Badge>}
                  </div>
                  {(s.equipements ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.equipements!.map((e) => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                    </div>
                  )}
                  {rattaches.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {rattaches.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-[10px]">{c.nom}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SallesDialog
        open={open}
        onOpenChange={setOpen}
        salle={editing}
        onSubmit={editing ? (d) => updateSalle(editing.id, d) : addSalle}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la salle {toDelete?.code} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les classes rattachées ne perdront pas leur nom de salle mais devront être ré-affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (toDelete) { await deleteSalle(toDelete.id); setToDelete(null); } }}
            >Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
