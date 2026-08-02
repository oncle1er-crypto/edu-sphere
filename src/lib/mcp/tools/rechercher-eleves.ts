import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveContext } from "../supabase";

export default defineTool({
  name: "rechercher_eleves",
  title: "Rechercher des élèves",
  description:
    "Recherche les élèves de l'école de l'utilisateur par nom, prénom ou matricule. Retourne matricule, nom, classe et statut.",
  inputSchema: {
    recherche: z.string().describe("Nom, prénom ou matricule (partiel accepté)."),
    limite: z.number().int().describe("Nombre maximum de résultats (défaut 20, max 100).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ recherche, limite }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { supabase, ecoleId, anneeId } = await resolveContext(ctx);
    const max = Math.min(Math.max(limite ?? 20, 1), 100);
    const term = recherche.trim().replace(/[%,]/g, " ");

    let query = supabase
      .from("eleves")
      .select("matricule, nom, prenom, statut, est_nouveau, sexe, classes(nom)")
      .eq("ecole_id", ecoleId)
      .or(`nom.ilike.%${term}%,prenom.ilike.%${term}%,matricule.ilike.%${term}%`)
      .order("nom")
      .limit(max);
    if (anneeId) query = query.eq("annee_id", anneeId);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((e: any) => ({
      matricule: e.matricule,
      nom: `${e.nom} ${e.prenom}`.trim(),
      classe: e.classes?.nom ?? null,
      statut: e.statut,
      nouveau: e.est_nouveau,
      sexe: e.sexe,
    }));

    const text = rows.length
      ? rows.map((r) => `${r.matricule} — ${r.nom} — ${r.classe ?? "sans classe"} — ${r.statut}`).join("\n")
      : "Aucun élève trouvé.";
    return { content: [{ type: "text", text }], structuredContent: { eleves: rows } };
  },
});
