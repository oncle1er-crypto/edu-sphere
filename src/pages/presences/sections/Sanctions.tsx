import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileWarning, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSanctionsPresences } from "@/hooks/useSanctionsPresences";
import { useEleves } from "@/hooks/useEleves";

const TYPES_SANCTIONS = [
  { value: "avertissement", label: "Avertissement écrit" },
  { value: "blame", label: "Blâme" },
  { value: "exclusion_temporaire", label: "Exclusion temporaire" },
  { value: "convocation_parents", label: "Convocation parents" },
];

export default function Sanctions() {
  const { sanctions, loading, fetchSanctions, addSanction } = useSanctionsPresences();
  const { eleves, fetchEleves } = useEleves();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [type, setType] = useState("avertissement");
  const [motif, setMotif] = useState("");
  const [nbAbsences, setNbAbsences] = useState("");

  useEffect(() => { fetchSanctions(); fetchEleves(); }, [fetchSanctions, fetchEleves]);

  const getEleveName = (id: string) => {
    const e = eleves.find((el) => el.id === id);
    return e ? `${e.prenom} ${e.nom}` : id.slice(0, 8);
  };

  const handleAdd = async () => {
    if (!eleveId || !type) return;
    const ok = await addSanction({
      eleve_id: eleveId,
      type,
      motif: motif || undefined,
      nb_absences_declencheur: nbAbsences ? parseInt(nbAbsences) : undefined,
    });
    if (ok) { setDialogOpen(false); setEleveId(""); setMotif(""); setNbAbsences(""); }
  };

  const typeLabel = (t: string) => TYPES_SANCTIONS.find((s) => s.value === t)?.label ?? t;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      icon={<FileWarning className="h-5 w-5" />}
      title="Sanctions liées à l'absentéisme"
      description="Mesures disciplinaires déclenchées par les seuils d'absences."
    >
      <div className="flex justify-end mb-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Nouvelle sanction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer une sanction</DialogTitle></DialogHeader>
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
              <div>
                <Label>Type de sanction</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES_SANCTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Absences cumulées</Label><Input type="number" value={nbAbsences} onChange={(e) => setNbAbsences(e.target.value)} placeholder="Ex: 8" /></div>
              <div><Label>Motif</Label><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Absentéisme répété…" /></div>
              <Button onClick={handleAdd} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Absences cumulées</TableHead>
              <TableHead>Sanction</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sanctions.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune sanction enregistrée.</TableCell></TableRow>
            ) : sanctions.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{getEleveName(r.eleve_id)}</TableCell>
                <TableCell><Badge variant="outline">{r.nb_absences_declencheur ?? "—"}</Badge></TableCell>
                <TableCell>{typeLabel(r.type)}</TableCell>
                <TableCell className="text-sm">{new Date(r.date_sanction).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
