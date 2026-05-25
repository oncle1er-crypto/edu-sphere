import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Check, X, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useJustifications } from "@/hooks/useJustifications";
import { useEleves } from "@/hooks/useEleves";

export default function Justifications() {
  const { justifications, loading, fetchJustifications, addJustification, updateStatut } = useJustifications();
  const { eleves, fetchEleves } = useEleves();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eleveId, setEleveId] = useState("");
  const [motif, setMotif] = useState("");

  useEffect(() => { fetchJustifications(); fetchEleves(); }, [fetchJustifications, fetchEleves]);

  const getEleveName = (id: string) => {
    const e = eleves.find((el) => el.id === id);
    return e ? `${e.nom} ${e.prenom}` : id.slice(0, 8);
  };

  const handleAdd = async () => {
    if (!eleveId || !motif) return;
    const ok = await addJustification({ eleve_id: eleveId, motif });
    if (ok) { setDialogOpen(false); setEleveId(""); setMotif(""); }
  };

  const statutBadge = (s: string) => {
    if (s === "acceptee") return <Badge className="bg-accent/15 text-primary border-accent/30 hover:bg-accent/15">Accepté</Badge>;
    if (s === "refusee") return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">Refusé</Badge>;
    return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/15">En attente</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Justificatifs en attente"
      description="Validation des pièces fournies par les familles."
    >
      <div className="flex justify-end mb-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Ajouter un justificatif</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau justificatif</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Élève</Label>
                <Select value={eleveId} onValueChange={setEleveId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                  <SelectContent>
                    {eleves.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motif</Label>
                <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Certificat médical, décès familial…" />
              </div>
              <Button onClick={handleAdd} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {justifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun justificatif en attente.</p>
        ) : justifications.map((j) => (
          <div key={j.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{getEleveName(j.eleve_id)}</p>
                {statutBadge(j.statut)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{j.motif}</p>
              <p className="text-xs text-muted-foreground">reçu le {new Date(j.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
            {j.statut === "en_attente" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-primary" onClick={() => updateStatut(j.id, "acceptee")}>
                  <Check className="h-4 w-4" />Accepter
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatut(j.id, "refusee")}>
                  <X className="h-4 w-4" />Refuser
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
