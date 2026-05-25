import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MyEnseignant {
  id: string;
  ecole_id: string;
  nom: string;
  prenom: string;
  matricule: string | null;
  email: string | null;
  telephone: string | null;
  specialite: string | null;
  diplome: string | null;
  photo_url: string | null;
  type_contrat: string | null;
  date_embauche: string | null;
}

export function useMyEnseignant() {
  const { user } = useAuth();
  const [enseignant, setEnseignant] = useState<MyEnseignant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("enseignants")
      .select("id, ecole_id, nom, prenom, matricule, email, telephone, specialite, diplome, photo_url, type_contrat, date_embauche")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEnseignant((data as MyEnseignant) ?? null);
        setLoading(false);
      });
  }, [user]);

  return { enseignant, loading };
}
