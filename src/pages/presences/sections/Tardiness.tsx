import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Plus, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRetards } from "@/hooks/useRetards";
import { useEleves } from "@/hooks/useEleves";

export default function Tardiness() {
  const { retards, loading, fetchRetards, addRetard } = useRetards();
  const { eleves, fetchEleves } = useEleves();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [heureArrivee, setHeureArrivee] = useState("08:15");
  const [duree, setDuree] = useState("15");
  const [motif, setMotif] = useState("");

  useEffect(() => { fetchRetards(); fetchEleves(); }, [fetchRetards, fetchEleves]);

  const getEleveName = (id: string) => {
    const e = eleves.find((el) => el.id === id);
    return e ? `${e.prenom} ${e.nom}` : id.slice(0, 8);
  };

  // Count recurrences this month per student
  const thisMonth = new Date().toISOString().slice(0, 7);
  const recidiveMap = new Map<string, number>();
  retards.forEach((r) => {
    if (r.date_retard.startsWith(thisMonth)) {
      recidiveMap.set(r.eleve_id, (recidiveMap.get(r.eleve_id) || 0) + 1);
    }
  });

  const handleAdd = async () => {
    if (!eleveId) return;
    const ok = await addRetard({
      eleve_id: eleveId,
      heure_arrivee: heureArrivee,
      duree_minutes: parseInt(duree) || 0,
      motif: motif || undefined,
    });
    if (ok) { setDialogOpen(false); setEleveId(""); setMotif(""); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      icon={<CalendarClock className="h-5 w-5" />}
      title="Retards des élèves"
      description="Suivi des retards quotidiens et détection des récidives."
    >
      <div className="flex justify-end mb-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Enregistrer un retard</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau retard</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Élève</Label>
                <Select value={eleveId} onValueChange={setEleveId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {eleves.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Heure d'arrivée</Label><Input type="time" value={heureArrivee} onChange={(e) => setHeureArrivee(e.target.value)} /></div>
                <div><Label>Durée (min)</Label><Input type="number" value={duree} onChange={(e) => setDuree(e.target.value)} /></div>
              </div>
              <div><Label>Motif (optionnel)</Label><Input value={motif} onChange={(e) => setMotif(e.target.value)} /></div>
              <Button onClick={handleAdd} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Retard</TableHead>
              <TableHead>Récidive</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retards.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun retard enregistré.</TableCell></TableRow>
            ) : retards.map((r) => {
              const recidive = recidiveMap.get(r.eleve_id) || 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{new Date(r.date_retard).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{getEleveName(r.eleve_id)}</TableCell>
                  <TableCell>{r.heure_arrivee ?? "—"}</TableCell>
                  <TableCell>{r.duree_minutes ? `${r.duree_minutes} min` : "—"}</TableCell>
                  <TableCell>
                    <Badge className={recidive >= 5 ? "bg-red-500/15 text-red-700 hover:bg-red-500/15" : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"}>
                      {recidive}× ce mois
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
