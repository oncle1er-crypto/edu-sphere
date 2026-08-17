import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export interface EcoleInfo {
  nom: string;
  sigle?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  ville?: string | null;
  directeur?: string | null;
  // En-tête officiel (Ministère/DRENET/DDENET/devise nationale/armoiries) —
  // saisi une fois dans Paramètres > Profil de l'école, réutilisé pour les
  // documents administratifs formels (ex. fiche de paiement à signer).
  ministere?: string | null;
  drenet?: string | null;
  ddenet?: string | null;
  devise_nationale?: string | null;
  armoiries_url?: string | null;
}

/**
 * Récupère les infos d'école (nom, logo, coordonnées, en-tête officiel) pour
 * l'entête des reçus/documents PDF. Utilise l'ecole_id du profil
 * utilisateur — indépendant du contexte multi-école.
 */
export function useEcoleInfo() {
  const { ecoleId } = useEcoleId();
  const [ecole, setEcole] = useState<EcoleInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ecoleId) { setEcole(null); return; }
    (async () => {
      const { data } = await supabase
        .from("ecoles")
        .select("nom, sigle, adresse, telephone, email, logo_url, ville, directeur, ministere, drenet, ddenet, devise_nationale, armoiries_url")
        .eq("id", ecoleId)
        .maybeSingle();
      if (!cancelled) setEcole((data as EcoleInfo) ?? null);
    })();
    return () => { cancelled = true; };
  }, [ecoleId]);

  return ecole;
}
