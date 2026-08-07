import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneCI } from "@/hooks/useZinduaConfig";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { toast } from "sonner";

export interface ContactParent {
  nomComplet: string;
  telephone: string;
}

interface Props {
  open: boolean;
  ecoleId: string;
  eleveId: string;
  nomEleve: string;
  /** Appelé après enregistrement : l'encaissement peut reprendre. */
  onSaved: (contact: ContactParent) => void;
  /** L'utilisateur renonce à l'encaissement. */
  onCancel: () => void;
}

const schema = z.object({
  nom: z.string().trim().min(2, "Nom requis (2 caractères minimum)").max(80),
  prenom: z.string().trim().min(2, "Prénom requis (2 caractères minimum)").max(80),
  telephone: z.string().trim().min(8, "Téléphone requis"),
  telephone2: z.string().trim().max(30).optional(),
  lien: z.string().trim().min(2).max(30),
});

/**
 * Modale bloquante : impose de compléter le nom et le numéro du parent avant
 * de valider un encaissement (indispensable pour l'envoi du reçu WhatsApp/SMS).
 */
export function ParentInfoRequiredDialog({ open, ecoleId, eleveId, nomEleve, onSaved, onCancel }: Props) {
  const [chargement, setChargement] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [telephone2, setTelephone2] = useState("");
  const [lien, setLien] = useState("Parent");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !eleveId) return;
    let annule = false;
    setChargement(true);
    setErreur(null);
    (async () => {
      const { data } = await supabase
        .from("eleve_parents")
        .select("parent_id, lien, est_contact_principal, parents(id, nom, prenom, telephone, telephone2)")
        .eq("eleve_id", eleveId)
        .order("est_contact_principal", { ascending: false })
        .limit(1);
      if (annule) return;
      const ligne = (data ?? [])[0] as
        | { parent_id: string; lien: string | null; parents: { id: string; nom: string; prenom: string; telephone: string; telephone2: string | null } | null }
        | undefined;
      if (ligne?.parents) {
        setParentId(ligne.parents.id);
        setNom(ligne.parents.nom ?? "");
        setPrenom(ligne.parents.prenom ?? "");
        setTelephone(ligne.parents.telephone ?? "");
        setTelephone2(ligne.parents.telephone2 ?? "");
        setLien(ligne.lien || "Parent");
      } else {
        setParentId(null);
        setNom(""); setPrenom(""); setTelephone(""); setTelephone2(""); setLien("Parent");
      }
      setChargement(false);
    })();
    return () => { annule = true; };
  }, [open, eleveId]);

  const enregistrer = async () => {
    setErreur(null);
    const parsed = schema.safeParse({ nom, prenom, telephone, telephone2, lien });
    if (!parsed.success) {
      setErreur(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Formulaire incomplet.");
      return;
    }
    const tel = normalizePhoneCI(parsed.data.telephone);
    if (!tel) {
      setErreur("Numéro ivoirien invalide : 10 chiffres commençant par 01, 05, 07 ou 27.");
      return;
    }
    const tel2 = parsed.data.telephone2 ? normalizePhoneCI(parsed.data.telephone2) : null;
    if (parsed.data.telephone2 && !tel2) {
      setErreur("Le second numéro est invalide.");
      return;
    }

    setSaving(true);
    try {
      let id = parentId;
      if (id) {
        const { error } = await supabase
          .from("parents")
          .update({
            nom: parsed.data.nom,
            prenom: parsed.data.prenom,
            telephone: tel,
            telephone2: tel2,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("parents")
          .insert({
            ecole_id: ecoleId,
            nom: parsed.data.nom,
            prenom: parsed.data.prenom,
            telephone: tel,
            telephone2: tel2,
          })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        const { error: linkErr } = await supabase
          .from("eleve_parents")
          .insert({ eleve_id: eleveId, parent_id: id, lien: parsed.data.lien, est_contact_principal: true });
        if (linkErr) throw linkErr;
      }
      toast.success("Coordonnées du parent enregistrées");
      onSaved({ nomComplet: `${parsed.data.nom} ${parsed.data.prenom}`.trim(), telephone: tel });
    } catch (e) {
      setErreur(messageErreurBase(e, "Impossible d'enregistrer les coordonnées du parent."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />Coordonnées du parent incomplètes
          </DialogTitle>
          <DialogDescription>
            Complétez le nom et le numéro du parent de <strong>{nomEleve}</strong> avant de valider
            l'encaissement : le reçu lui sera envoyé par WhatsApp (ou SMS).
          </DialogDescription>
        </DialogHeader>

        {chargement ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Chargement…
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom *</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prénom *</Label>
                <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={80} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Téléphone *</Label>
                <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="07 00 00 00 00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Second numéro</Label>
                <Input value={telephone2} onChange={(e) => setTelephone2(e.target.value)} placeholder="Optionnel" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lien de parenté</Label>
              <Input value={lien} onChange={(e) => setLien(e.target.value)} maxLength={30} />
            </div>

            {erreur && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{erreur}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Annuler l'encaissement</Button>
          <Button onClick={enregistrer} disabled={saving || chargement}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer et continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
