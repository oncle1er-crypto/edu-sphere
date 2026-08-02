import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveContext } from "../supabase";

export default defineTool({
  name: "lister_classes",
  title: "Lister les classes",
  description:
    "Liste les classes de l'année scolaire active avec leur effectif et leur capacité.",
  inputSchema: {
    recherche: z.string().describe("Filtre optionnel sur le nom de la classe.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ recherche }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { supabase, ecoleId, anneeId, anneeLibelle } = await resolveContext(ctx);

    let q = supabase
      .from("classes")
      .select("id, nom, capacite, cycles(nom)")
      .eq("ecole_id", ecoleId)
      .order("nom");
    if (anneeId) q = q.eq("annee_id", anneeId);
    if (recherche?.trim()) q = q.ilike("nom", `%${recherche.trim().replace(/[%,]/g, " ")}%`);

    const { data: classes, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    let elevesQuery = supabase.from("eleves").select("classe_id").eq("ecole_id", ecoleId);
    if (anneeId) elevesQuery = elevesQuery.eq("annee_id", anneeId);
    const { data: eleves } = await elevesQuery;
    const counts = new Map<string, number>();
    for (const e of (eleves ?? []) as any[]) {
      if (e.classe_id) counts.set(e.classe_id, (counts.get(e.classe_id) ?? 0) + 1);
    }

    const rows = (classes ?? []).map((c: any) => ({
      classe: c.nom,
      cycle: c.cycles?.nom ?? null,
      effectif: counts.get(c.id) ?? 0,
      capacite: c.capacite ?? null,
    }));

    const text = rows.length
      ? `Année ${anneeLibelle ?? "active"}\n` +
        rows
          .map((r) => `${r.classe} (${r.cycle ?? "—"}) : ${r.effectif} élèves${r.capacite ? ` / ${r.capacite}` : ""}`)
          .join("\n")
      : "Aucune classe trouvée.";
    return { content: [{ type: "text", text }], structuredContent: { classes: rows } };
  },
});
