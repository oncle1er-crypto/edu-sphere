import { useEffect, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Loader2, Trash2, UserPlus } from "lucide-react";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useEnseignants } from "@/hooks/useEnseignants";
import { useEleves } from "@/hooks/useEleves";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Groupe {
  id: string;
  nom: string;
  type: string;
  description: string | null;
  enseignant_id: string | null;
  membres_count?: number;
  enseignant_nom?: string;
}

const TYPES = ["option", "langue", "soutien", "specialite", "atelier"];

export default function ClassesGroups() {
  const { ecoleId } = useEcoleId();
  const { enseignants } = useEnseignants();
  const { activeAnnee } = useAcademicPeriod();
  const { eleves } = useEleves(activeAnnee.id);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("option");
  const [desc, setDesc] = useState("");
  const [profId, setProfId] = useState("none");
  const [saving, setSaving] = useState(false);

  const [manage, setManage] = useState<Groupe | null>(null);
  const [membreIds, setMembreIds] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("groupes_pedagogiques")
      .select("*, enseignants(nom, prenom), groupe_membres(count)")
      .eq("ecole_id", ecoleId)
      .order("nom");
    setGroupes((data ?? []).map((g: any) => ({
      ...g,
      membres_count: g.groupe_membres?.[0]?.count ?? 0,
      enseignant_nom: g.enseignants ? `${g.enseignants.nom} ${g.enseignants.prenom}` : "",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [ecoleId]);

  const handleCreate = async () => {
    if (!ecoleId || !nom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("groupes_pedagogiques").insert({
      ecole_id: ecoleId, nom: nom.trim(), type, description: desc || null,
      enseignant_id: profId === "none" ? null : profId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Groupe créé");
    setOpen(false); setNom(""); setType("option"); setDesc(""); setProfId("none");
    await load();
  };

  const handleDelete = async (g: Groupe) => {
    if (!confirm(`Supprimer le groupe "${g.nom}" ?`)) return;
    const { error } = await supabase.from("groupes_pedagogiques").delete().eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success("Groupe supprimé");
    await load();
  };

  const openManage = async (g: Groupe) => {
    setManage(g);
    const { data } = await supabase.from("groupe_membres").select("eleve_id").eq("groupe_id", g.id);
    setMembreIds(new Set((data ?? []).map((m: any) => m.eleve_id)));
  };

  const toggleMembre = async (eleveId: string) => {
    if (!manage || !ecoleId) return;
    if (membreIds.has(eleveId)) {
      const { error } = await supabase.from("groupe_membres").delete()
        .eq("groupe_id", manage.id).eq("eleve_id", eleveId);
      if (error) return toast.error(error.message);
      const n = new Set(membreIds); n.delete(eleveId); setMembreIds(n);
    } else {
      const { error } = await supabase.from("groupe_membres").insert({
        groupe_id: manage.id, eleve_id: eleveId, ecole_id: ecoleId,
      });
      if (error) return toast.error(error.message);
      const n = new Set(membreIds); n.add(eleveId); setMembreIds(n);
    }
  };

  return (
    <SettingsSection
      icon={<Users className="h-5 w-5" />}
      title={`Groupes & options (${groupes.length})`}
      description="Groupes transversaux : options, langues, soutien, spécialités."
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nouveau groupe</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : groupes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun groupe créé.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groupes.map((g) => (
            <Card key={g.id} className="border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-display">{g.nom}</h4>
                  <Badge>{g.membres_count} élèves</Badge>
                </div>
                {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] mr-2">{g.type}</Badge>
                  {g.enseignant_nom && <>Animé par : <span className="text-foreground font-medium">{g.enseignant_nom}</span></>}
                </p>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => openManage(g)}>
                    <UserPlus className="h-3 w-3" />Membres
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(g)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau groupe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Option Latin" /></div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enseignant responsable</Label>
              <SearchableSelect
                value={profId}
                onValueChange={setProfId}
                placeholder="— Aucun —"
                searchPlaceholder="Rechercher un enseignant..."
                options={[{ value: "none", label: "— Aucun —" }, ...enseignants.map((e) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))]}
              />
            </div>
            <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !nom.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manage} onOpenChange={(o) => !o && setManage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Membres — {manage?.nom}</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {eleves.map((e) => (
              <label key={e.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={membreIds.has(e.id)} onCheckedChange={() => toggleMembre(e.id)} />
                <span className="text-sm">{e.nom} {e.prenom}</span>
                <span className="text-xs text-muted-foreground ml-auto">{e.matricule}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => { setManage(null); load(); }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
