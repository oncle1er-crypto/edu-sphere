import { useState } from "react";
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
import { Bus, UtensilsCrossed, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useGrilleServices, type GrilleService, type ServiceType } from "@/hooks/useGrilleServices";
import GrilleServiceEditor from "./GrilleServiceEditor";
import { fcfa } from "../scolarite-data";

interface Props {
  serviceType: ServiceType;
}

export default function GrilleServicesSection({ serviceType }: Props) {
  const { lignes, isLoading, anneeId, upsert, isSaving, remove } = useGrilleServices(serviceType);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GrilleService | null>(null);

  const title = serviceType === "cantine" ? "Grille tarifaire — Cantine" : "Grille tarifaire — Transport (Car)";
  const description = serviceType === "cantine"
    ? "Frais de restauration. Ajoutez, modifiez ou supprimez librement les tarifs."
    : "Frais de transport scolaire. Ajoutez, modifiez ou supprimez librement les tarifs par ligne/zone.";
  const Icon = serviceType === "cantine" ? UtensilsCrossed : Bus;

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (l: GrilleService) => { setEditing(l); setEditorOpen(true); };

  return (
    <SettingsSection
      title={title}
      description={description}
      icon={<Icon className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
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
                <TableHead>Désignation</TableHead>
                <TableHead>Périodicité</TableHead>
                <TableHead>Échéances</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.libelle}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{l.periodicite}</Badge>
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
                            Le tarif « {l.libelle} » sera supprimé. Les échéances déjà générées pour les abonnés restent en base.
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

      <GrilleServiceEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSave={(data) => upsert(data, { onSuccess: () => setEditorOpen(false) })}
        saving={isSaving}
      />
    </SettingsSection>
  );
}
