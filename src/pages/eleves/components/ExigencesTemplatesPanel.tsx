import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutTemplate, Plus, Pencil, Trash2, Star, Send, Search,
} from "lucide-react";
import { useModelesExigences, ModeleExigences } from "@/hooks/useModelesExigences";
import { useEleves } from "@/hooks/useEleves";

interface DocType { key: string; label: string; }

interface Props {
  docTypes: DocType[];
}

export default function ExigencesTemplatesPanel({ docTypes }: Props) {
  const { modeles, saveModele, deleteModele, applyToEleves } = useModelesExigences();
  const { eleves } = useEleves();
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ModeleExigences> | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyModele, setApplyModele] = useState<ModeleExigences | null>(null);
  const [selectedEleves, setSelectedEleves] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [classeFilter, setClasseFilter] = useState<string>("all");

  const classesOptions = useMemo(() => {
    const set = new Map<string, string>();
    eleves.forEach((e) => {
      if (e.classe_id && e.classe_nom) set.set(e.classe_id, e.classe_nom);
    });
    return Array.from(set.entries()).map(([id, nom]) => ({ id, nom }));
  }, [eleves]);

  const filteredEleves = useMemo(() => {
    return eleves.filter((e) => {
      if (classeFilter !== "all" && e.classe_id !== classeFilter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        e.nom.toLowerCase().includes(s) ||
        e.prenom.toLowerCase().includes(s) ||
        e.matricule.toLowerCase().includes(s)
      );
    });
  }, [eleves, q, classeFilter]);

  const startCreate = () => {
    setEditing({
      nom: "",
      description: "",
      est_defaut: false,
      types_obligatoires: docTypes.filter((d) =>
        ["acte_naissance", "photo_identite", "certificat_scolarite"].includes(d.key)
      ).map((d) => d.key),
      types_optionnels: [],
    });
  };

  const setTypeStatus = (key: string, status: "obligatoire" | "optionnel" | "none") => {
    if (!editing) return;
    const obl = new Set(editing.types_obligatoires ?? []);
    const opt = new Set(editing.types_optionnels ?? []);
    obl.delete(key); opt.delete(key);
    if (status === "obligatoire") obl.add(key);
    if (status === "optionnel") opt.add(key);
    setEditing({ ...editing, types_obligatoires: Array.from(obl), types_optionnels: Array.from(opt) });
  };

  const getTypeStatus = (key: string): "obligatoire" | "optionnel" | "none" => {
    if (editing?.types_obligatoires?.includes(key)) return "obligatoire";
    if (editing?.types_optionnels?.includes(key)) return "optionnel";
    return "none";
  };

  const handleSave = async () => {
    if (!editing?.nom?.trim()) return;
    const saved = await saveModele({
      id: editing.id,
      nom: editing.nom.trim(),
      description: editing.description ?? null,
      est_defaut: !!editing.est_defaut,
      types_obligatoires: editing.types_obligatoires ?? [],
      types_optionnels: editing.types_optionnels ?? [],
    });
    if (saved) setEditing(null);
  };

  const openApply = (m: ModeleExigences) => {
    setApplyModele(m);
    setSelectedEleves(new Set());
    setApplyOpen(true);
    setManageOpen(false);
  };

  const toggleAll = () => {
    if (selectedEleves.size === filteredEleves.length) {
      setSelectedEleves(new Set());
    } else {
      setSelectedEleves(new Set(filteredEleves.map((e) => e.id)));
    }
  };

  const handleApply = async () => {
    if (!applyModele) return;
    const ok = await applyToEleves(applyModele, Array.from(selectedEleves));
    if (ok) { setApplyOpen(false); setApplyModele(null); }
  };

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-sm">Modèles d'exigences</p>
            <p className="text-xs text-muted-foreground">
              {modeles.length} modèle(s) — appliquez un modèle à plusieurs élèves en quelques clics.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {modeles.slice(0, 3).map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="outline"
                onClick={() => openApply(m)}
              >
                <Send className="h-3.5 w-3.5" />
                {m.nom}
                {m.est_defaut && <Star className="h-3 w-3 fill-current text-accent" />}
              </Button>
            ))}
            <Button size="sm" onClick={() => setManageOpen(true)}>
              <LayoutTemplate className="h-4 w-4" />
              Gérer les modèles
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manage models dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modèles d'exigences de documents</DialogTitle>
            <DialogDescription>
              Définissez des modèles standards pour les inscrire/appliquer rapidement à plusieurs élèves.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={startCreate}>
                <Plus className="h-4 w-4" />
                Nouveau modèle
              </Button>
            </div>

            {modeles.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Aucun modèle. Créez votre premier modèle.
              </div>
            ) : (
              <div className="space-y-2">
                {modeles.map((m) => (
                  <div
                    key={m.id}
                    className="border rounded-lg p-3 flex items-start gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{m.nom}</p>
                        {m.est_defaut && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Star className="h-3 w-3 fill-current" /> Par défaut
                          </Badge>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.types_obligatoires.map((t) => (
                          <Badge key={`o-${t}`} className="text-[10px]">
                            {docTypes.find((d) => d.key === t)?.label ?? t}
                          </Badge>
                        ))}
                        {m.types_optionnels.map((t) => (
                          <Badge key={`p-${t}`} variant="secondary" className="text-[10px]">
                            {docTypes.find((d) => d.key === t)?.label ?? t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openApply(m)}>
                        <Send className="h-3.5 w-3.5" />
                        Appliquer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer le modèle "${m.nom}" ?`)) deleteModele(m.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modele dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nom du modèle</Label>
                  <Input
                    value={editing.nom ?? ""}
                    onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                    placeholder="Ex: Inscription primaire"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch
                    checked={!!editing.est_defaut}
                    onCheckedChange={(v) => setEditing({ ...editing, est_defaut: v })}
                    id="defaut"
                  />
                  <Label htmlFor="defaut" className="text-sm">Modèle par défaut</Label>
                </div>
              </div>
              <div>
                <Label>Description (optionnel)</Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="À quoi sert ce modèle ?"
                />
              </div>
              <div>
                <Label className="mb-2 block">Documents</Label>
                <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                  {docTypes.map((d) => {
                    const status = getTypeStatus(d.key);
                    return (
                      <div key={d.key} className="flex items-center justify-between gap-2 border rounded-lg p-2">
                        <span className="text-sm">{d.label}</span>
                        <Select value={status} onValueChange={(v: any) => setTypeStatus(d.key, v)}>
                          <SelectTrigger className="w-40 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="obligatoire">Obligatoire</SelectItem>
                            <SelectItem value="optionnel">Optionnel</SelectItem>
                            <SelectItem value="none">Non géré</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!editing?.nom?.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appliquer « {applyModele?.nom} » à des élèves</DialogTitle>
            <DialogDescription>
              Les exigences existantes pour ces élèves seront remplacées pour les documents listés dans le modèle.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={classeFilter} onValueChange={setClasseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classesOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {selectedEleves.size === filteredEleves.length ? "Aucun" : "Tout"}
            </Button>
          </div>

          <ScrollArea className="h-[320px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredEleves.map((e) => {
                const checked = selectedEleves.has(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(selectedEleves);
                        if (v) next.add(e.id); else next.delete(e.id);
                        setSelectedEleves(next);
                      }}
                    />
                    <span className="text-sm flex-1">{e.prenom} {e.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.matricule} • {e.classe_nom ?? "—"}
                    </span>
                  </label>
                );
              })}
              {filteredEleves.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Aucun élève.
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <p className="text-xs text-muted-foreground mr-auto self-center">
              {selectedEleves.size} élève(s) sélectionné(s)
            </p>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Annuler</Button>
            <Button onClick={handleApply} disabled={selectedEleves.size === 0}>
              <Send className="h-4 w-4" />
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
