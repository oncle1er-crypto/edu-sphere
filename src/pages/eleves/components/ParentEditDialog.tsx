import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  link?: {
    id: string;
    parent_id: string;
    lien: string;
    parents?: { nom?: string; prenom?: string; telephone?: string; email?: string } | null;
  } | null;
  eleveId: string;
  ecoleId: string;
  onSaved?: () => void;
}

const LIENS = ["père", "mère", "tuteur", "tutrice", "grand-père", "grand-mère", "oncle", "tante", "autre"];

export function ParentEditDialog({ open, onOpenChange, link, eleveId, ecoleId, onSaved }: Props) {
  const isEdit = !!link;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "", prenom: "", telephone: "", email: "", lien: "père",
  });

  // Search (only in create mode)
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch(""); setResults([]); setSelectedExistingId(null);
    if (link) {
      setForm({
        nom: link.parents?.nom ?? "",
        prenom: link.parents?.prenom ?? "",
        telephone: link.parents?.telephone ?? "",
        email: link.parents?.email ?? "",
        lien: link.lien ?? "père",
      });
    } else {
      setForm({ nom: "", prenom: "", telephone: "", email: "", lien: "père" });
    }
  }, [open, link]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const runSearch = async () => {
    const q = search.trim();
    if (q.length < 3) { toast.error("Saisir au moins 3 caractères"); return; }
    setSearching(true);
    const { data, error } = await supabase
      .from("parents")
      .select("id, nom, prenom, telephone, email")
      .eq("ecole_id", ecoleId)
      .or(`telephone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    setSearching(false);
    if (error) { toast.error(error.message); return; }
    setResults(data ?? []);
    if (!data || data.length === 0) toast.info("Aucun parent trouvé");
  };

  const pickExisting = (p: any) => {
    setSelectedExistingId(p.id);
    setForm({
      nom: p.nom ?? "", prenom: p.prenom ?? "",
      telephone: p.telephone ?? "", email: p.email ?? "",
      lien: form.lien,
    });
  };

  const handleSave = async () => {
    const nom = form.nom.trim();
    const prenom = form.prenom.trim();
    const telephone = form.telephone.trim();
    const email = form.email.trim();

    if (!nom || !prenom) return toast.error("Nom et prénom requis");
    if (!telephone) return toast.error("Téléphone requis");
    if (nom.length > 100 || prenom.length > 100) return toast.error("Nom/prénom trop long");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Email invalide");

    setSaving(true);
    try {
      if (isEdit && link) {
        const { error: pErr } = await supabase
          .from("parents")
          .update({ nom, prenom, telephone, email: email || null })
          .eq("id", link.parent_id);
        if (pErr) throw pErr;

        if (form.lien !== link.lien) {
          const { error: lErr } = await supabase
            .from("eleve_parents")
            .update({ lien: form.lien })
            .eq("id", link.id);
          if (lErr) throw lErr;
        }
        toast.success("Parent mis à jour");
      } else if (selectedExistingId) {
        // Rattacher parent existant
        const { data: existingLink } = await supabase
          .from("eleve_parents")
          .select("id")
          .eq("eleve_id", eleveId)
          .eq("parent_id", selectedExistingId)
          .maybeSingle();
        if (existingLink) {
          toast.error("Ce parent est déjà rattaché à cet élève");
          setSaving(false);
          return;
        }
        const { error: lErr } = await supabase
          .from("eleve_parents")
          .insert({ eleve_id: eleveId, parent_id: selectedExistingId, lien: form.lien });
        if (lErr) throw lErr;
        toast.success("Parent existant rattaché");
      } else {
        const { data: newP, error: pErr } = await supabase
          .from("parents")
          .insert({ ecole_id: ecoleId, nom, prenom, telephone, email: email || null })
          .select("id")
          .single();
        if (pErr) throw pErr;
        const { error: lErr } = await supabase
          .from("eleve_parents")
          .insert({ eleve_id: eleveId, parent_id: newP.id, lien: form.lien });
        if (lErr) throw lErr;
        toast.success("Parent ajouté");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le parent / tuteur" : "Ajouter un parent / tuteur"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations du parent."
              : "Recherchez un parent existant par téléphone/email, ou créez-en un nouveau."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <Label className="text-xs">Rechercher un parent existant</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Téléphone ou email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
              />
              <Button type="button" variant="outline" size="icon" onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {results.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.map((p) => (
                  <Card
                    key={p.id}
                    onClick={() => pickExisting(p)}
                    className={`p-2 cursor-pointer hover:bg-accent/30 text-xs ${
                      selectedExistingId === p.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-medium">{p.prenom} {p.nom}</p>
                    <p className="text-muted-foreground">{p.telephone ?? "—"} • {p.email ?? "—"}</p>
                  </Card>
                ))}
              </div>
            )}
            {selectedExistingId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary font-medium">Parent existant sélectionné</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1"
                  onClick={() => {
                    setSelectedExistingId(null);
                    setForm({ nom: "", prenom: "", telephone: "", email: "", lien: form.lien });
                  }}
                >
                  <UserPlus className="h-3 w-3" /> Créer nouveau
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label>Prénom *</Label>
            <Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} maxLength={100} disabled={!!selectedExistingId} />
          </div>
          <div className="space-y-1">
            <Label>Nom *</Label>
            <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} maxLength={100} disabled={!!selectedExistingId} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Lien</Label>
            <Select value={form.lien} onValueChange={(v) => set("lien", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIENS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Téléphone *</Label>
            <Input
              value={form.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              placeholder="+225 0X XX XX XX XX"
              maxLength={30}
              disabled={!!selectedExistingId}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="parent@email.ci"
              maxLength={255}
              disabled={!!selectedExistingId}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : selectedExistingId ? "Rattacher" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
