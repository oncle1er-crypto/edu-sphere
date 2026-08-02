import { auth, defineMcp } from "@lovable.dev/mcp-js";
import apercuEcoleTool from "./tools/apercu-ecole";
import listerClassesTool from "./tools/lister-classes";
import pointEncaissementsTool from "./tools/point-encaissements";
import rechercherElevesTool from "./tools/rechercher-eleves";
import situationScolariteTool from "./tools/situation-scolarite";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "la-providence",
  title: "La Providence",
  version: "0.1.0",
  instructions:
    "Outils de lecture pour la plateforme de gestion scolaire La Providence. Utilisez `apercu_ecole` pour les chiffres clés, `lister_classes` pour les effectifs, `rechercher_eleves` pour retrouver un élève et son matricule, `situation_scolarite_eleve` pour son solde de scolarité, et `point_encaissements` pour le point de caisse sur une période. Toutes les données sont limitées à l'école et aux droits de l'utilisateur connecté.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    apercuEcoleTool,
    listerClassesTool,
    rechercherElevesTool,
    situationScolariteTool,
    pointEncaissementsTool,
  ],
});
