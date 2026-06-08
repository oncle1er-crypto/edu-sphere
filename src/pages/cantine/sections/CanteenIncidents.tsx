import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertCircle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCantineIncidents } from "@/hooks/useCantine";

export default function CanteenIncidents() {
  const { items, loading, add, update } = useCantineIncidents();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type_incident: "Hygiène", gravite: "faible", description: "" });

  const handleAdd = async () => {
    if (!form.description.trim()) return;
    await add(form);
    setOpen(false);
    setForm({ type_incident: "Hygiène", gravite: "faible", description: "" });
  };

  return (
    <SettingsSection
      title="Incidents cantine"
      description="Suivi des incidents alimentaires, hygiène et qualité."
      icon={<AlertCircle className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Signaler un incident
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun incident signalé.</p>
      ) : (
        <div className="space-y-3">
          {items.map((inc: any) => (
            <div key={inc.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${inc.gravite === "elevee" ? "text-destructive" : "text-primary"}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{inc.type_incident}</span>
                  <Badge variant={inc.gravite === "elevee" ? "destructive" : "secondary"}>{inc.gravite}</Badge>
                  <span className="text-xs text-muted-foreground">{inc.date_incident}</span>
                </div>
                <p className="text-sm text-muted-foreground">{inc.description}</p>
              </div>
              <Select value={inc.statut} onValueChange={(v) => update(inc.id, { statut: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ouvert">Ouvert</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="resolu">Résolu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signaler un incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type_incident} onValueChange={(v) => setForm({ ...form, type_incident: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Allergie">Allergie</SelectItem>
                  <SelectItem value="Hygiène">Hygiène</SelectItem>
                  <SelectItem value="Qualité">Qualité</SelectItem>
                  <SelectItem value="Sécurité">Sécurité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gravité</Label>
              <Select value={form.gravite} onValueChange={(v) => setForm({ ...form, gravite: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="elevee">Élevée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
