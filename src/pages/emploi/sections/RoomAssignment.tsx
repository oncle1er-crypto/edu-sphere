import { useMemo, useState, useEffect } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { DoorOpen, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSalles, Salle } from "@/hooks/useSalles";

import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAnneeId } from "@/hooks/useAnneeId";

const TYPES = [
  { value: "standard", label: "Standard" },
  { value: "labo_svt", label: "Laboratoire SVT" },
  { value: "labo_physique", label: "Laboratoire Physique" },
  { value: "labo_chimie", label: "Laboratoire Chimie" },
  { value: "informatique", label: "Salle informatique" },
  { value: "gymnase", label: "Gymnase" },
  { value: "amphi", label: "Amphithéâtre" },
  { value: "autre", label: "Autre" },
];

const emptySalle = (): Partial<Salle> => ({
  code: "",
  nom: "",
  type: "standard",
  capacite: 35,
  batiment: "",
  etage: "",
  statut: "active",
});

export default function RoomAssignment() {
  const { salles, loading, addSalle, updateSalle, deleteSalle } = useSalles();
  const { ecoleId } = useEcoleId();
  const { anneeId } = useAnneeId();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Salle> | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});

  // Fetch slot count per salle to compute occupation
  useEffect(() => {
    if (!ecoleId || !anneeId) return;
    supabase
      .from("creneaux_emploi_temps" as any)
      .select("salle_id")
      .eq("ecole_id", ecoleId)
      .eq("annee_id", anneeId)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        ((data as any[]) ?? []).forEach((r) => {
          if (r.salle_id) counts[r.salle_id] = (counts[r.salle_id] ?? 0) + 1;
        });
        setUsage(counts);
      });
  }, [ecoleId, anneeId, salles.length]);

  const maxUsage = useMemo(
    () => Math.max(1, ...Object.values(usage)),
    [usage]
  );

  const openCreate = () => { setEditing(emptySalle()); setOpen(true); };
  const openEdit = (s: Salle) => { setEditing(s); setOpen(true); };

  const save = async () => {
    if (!editing?.code) return;
    const ok = editing.id
      ? await updateSalle(editing.id, editing)
      : await addSalle(editing);
    if (ok) setOpen(false);
  };

  return (
    <SettingsSection
      title="Affectation des salles"
      description="Gérez le parc de salles et visualisez leur occupation."
      icon={<DoorOpen className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nouvelle salle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Capacité</TableHead>
            <TableHead className="text-center">Créneaux / sem.</TableHead>
            <TableHead className="text-center">Occupation</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!loading && salles.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucune salle. Cliquez sur « Nouvelle salle ».</TableCell></TableRow>
          )}
          {salles.map((r) => {
            const slots = usage[r.id] ?? 0;
            const occ = Math.round((slots / maxUsage) * 100);
            return (
              <TableRow key={r.id}>
                <TableCell className="font-bold">{r.code}</TableCell>
                <TableCell>{r.nom ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {TYPES.find((t) => t.value === r.type)?.label ?? r.type}
                </TableCell>
                <TableCell className="text-center">{r.capacite}</TableCell>
                <TableCell className="text-center">{slots}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={occ > 85 ? "destructive" : occ > 50 ? "default" : "secondary"}>
                    {occ}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={r.statut === "active" ? "default" : "outline"}>
                    {r.statut}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Supprimer la salle ${r.code} ?`)) deleteSalle(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier la salle" : "Nouvelle salle"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <Label>Code *</Label>
                <Input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  placeholder="S01"
                />
              </div>
              <div className="col-span-1">
                <Label>Nom</Label>
                <Input
                  value={editing.nom ?? ""}
                  onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                  placeholder="Salle 1"
                />
              </div>
              <div className="col-span-1">
                <Label>Type</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label>Capacité</Label>
                <Input
                  type="number"
                  value={editing.capacite ?? 0}
                  onChange={(e) => setEditing({ ...editing, capacite: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-1">
                <Label>Bâtiment</Label>
                <Input
                  value={editing.batiment ?? ""}
                  onChange={(e) => setEditing({ ...editing, batiment: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Label>Étage</Label>
                <Input
                  value={editing.etage ?? ""}
                  onChange={(e) => setEditing({ ...editing, etage: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Label>Statut</Label>
                <Select
                  value={editing.statut}
                  onValueChange={(v) => setEditing({ ...editing, statut: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">En maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
