import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Si fourni : édition. Sinon : création + rattachement. */
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
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    lien: "père",
  });

  useEffect(() => {
    if (!open) return;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le parent / tuteur" : "Ajouter un parent / tuteur"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations du parent ou du tuteur légal de l'élève.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label>Prénom *</Label>
            <Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label>Nom *</Label>
            <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} maxLength={100} />
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
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
