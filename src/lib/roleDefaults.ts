/**
 * Modules accessibles par défaut pour chaque rôle.
 * Utilisé pour pré-cocher la matrice de permissions quand
 * un rôle n'a encore aucune ligne enregistrée dans `role_permissions`.
 */
export const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  admin: [
    "eleves", "enseignants", "classes", "matieres", "emploi_temps", "examens",
    "finances", "presences", "vie_scolaire", "bibliotheque", "transport",
    "cantine", "communication", "cartes", "statistiques", "cours_vacances",
    "services_ponctuels", "parametres",
  ],
  directeur: ["eleves", "classes", "examens", "presences", "vie_scolaire", "cours_vacances", "services_ponctuels", "parametres"],
  enseignant: ["examens", "presences", "classes"],
  educateur: ["vie_scolaire", "presences", "eleves"],
  comptable: ["finances", "eleves", "cours_vacances", "services_ponctuels"],
  secretaire: ["eleves", "classes", "vie_scolaire", "services_ponctuels"],
  surveillant: ["presences", "eleves"],
  parent: ["eleves", "examens"],
};
