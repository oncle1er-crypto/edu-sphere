import type { StudentCardData } from "@/pages/cartes/components/StudentIdCard";
import type { Ecole } from "@/context/EcoleContext";

/**
 * Construit les données carte scolaire à partir d'un élève (DB) + école courante.
 * Tolérant aux champs absents.
 */
export function buildStudentCardData(
  eleve: any,
  ecole: Ecole | null,
  opts: { anneeScolaire?: string } = {},
): StudentCardData {
  const matricule: string =
    eleve?.matricule ??
    eleve?.numero_matricule ??
    eleve?.code ??
    (eleve?.id ? `ELV-${String(eleve.id).slice(0, 8).toUpperCase()}` : "ELV-—");

  return {
    id: String(eleve?.id ?? matricule),
    nom: (eleve?.nom ?? "").toString(),
    prenom: (eleve?.prenom ?? eleve?.prenoms ?? "").toString(),
    matricule,
    classe: eleve?.classe_nom ?? eleve?.classe ?? "",
    niveau: eleve?.niveau ?? eleve?.cycle ?? "",
    anneeScolaire:
      opts.anneeScolaire ??
      eleve?.annee_scolaire ??
      eleve?.annee ??
      "2025 - 2026",
    photo: eleve?.photo_url ?? eleve?.photo ?? undefined,

    dateNaissance: eleve?.date_naissance ?? eleve?.dob ?? "",
    lieuNaissance: eleve?.lieu_naissance ?? eleve?.lieu ?? "",
    sexe:
      eleve?.sexe === "M" ? "Masculin"
      : eleve?.sexe === "F" ? "Féminin"
      : eleve?.sexe ?? "",
    adresse: eleve?.adresse ?? "",

    ecoleNom: ecole?.nom ?? "Complexe Scolaire La Providence de Don Orione",
    ecoleLogo: (ecole as any)?.logo ?? (ecole as any)?.logo_url ?? undefined,
    ecoleAdresse: ecole?.adresse,
    ecoleTelephone: ecole?.telephone,
    ecoleSite: (ecole as any)?.site_web ?? (ecole as any)?.email ?? undefined,
    devise: "Instruire l'esprit, former le cœur.",
    deviseLatin: "FOI • SAVOIR • EXCELLENCE",

    directeurNom: ecole?.directeur ?? "M. Diop",
    directeurSignature: (ecole as any)?.signature_directeur ?? undefined,

    verificationToken: String(eleve?.id ?? matricule),
  };
}
