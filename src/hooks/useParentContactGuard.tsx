import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneCI } from "@/hooks/useZinduaConfig";
import { ParentInfoRequiredDialog, type ContactParent } from "@/components/finances/ParentInfoRequiredDialog";

interface DemandeVerification {
  ecoleId: string;
  eleveId: string;
  nomEleve: string;
  /** Valeurs déjà connues à l'écran (évitent une requête). */
  parent?: string | null;
  telephone?: string | null;
}

function contactValide(parent?: string | null, telephone?: string | null): ContactParent | null {
  const nom = (parent ?? "").trim();
  if (!nom || nom === "—") return null;
  const tel = normalizePhoneCI(telephone ?? "");
  if (!tel) return null;
  return { nomComplet: nom, telephone: tel };
}

/**
 * Impose des coordonnées parent complètes (nom + numéro valide) avant tout
 * encaissement. Utilisation :
 *   const { dialog, verifierAvant } = useParentContactGuard();
 *   verifierAvant({ ... }, (contact) => encaisser(contact));
 *   ... {dialog}
 */
export function useParentContactGuard() {
  const [demande, setDemande] = useState<
    (DemandeVerification & { suite: (c: ContactParent) => void }) | null
  >(null);

  const verifierAvant = useCallback(
    async (d: DemandeVerification, suite: (contact: ContactParent) => void) => {
      const direct = contactValide(d.parent, d.telephone);
      if (direct) return suite(direct);

      // Vérification en base (le contact peut exister sans être affiché)
      const { data } = await supabase
        .from("eleve_parents")
        .select("parents(nom, prenom, telephone)")
        .eq("eleve_id", d.eleveId)
        .order("est_contact_principal", { ascending: false })
        .limit(1);
      const p = ((data ?? [])[0] as { parents: { nom: string; prenom: string; telephone: string } | null } | undefined)?.parents;
      const enBase = contactValide(p ? `${p.nom} ${p.prenom}` : null, p?.telephone);
      if (enBase) return suite(enBase);

      setDemande({ ...d, suite });
    },
    [],
  );

  const dialog = demande ? (
    <ParentInfoRequiredDialog
      open
      ecoleId={demande.ecoleId}
      eleveId={demande.eleveId}
      nomEleve={demande.nomEleve}
      onSaved={(contact) => {
        const suite = demande.suite;
        setDemande(null);
        suite(contact);
      }}
      onCancel={() => setDemande(null)}
    />
  ) : null;

  return { dialog, verifierAvant };
}
