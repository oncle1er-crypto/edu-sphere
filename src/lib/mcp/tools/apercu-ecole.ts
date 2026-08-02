import { defineTool } from "@lovable.dev/mcp-js";
import { resolveContext } from "../supabase";

export default defineTool({
  name: "apercu_ecole",
  title: "Aperçu de l'école",
  description:
    "Chiffres clés de l'école de l'utilisateur : année active, effectifs élèves (dont nouveaux), nombre de classes et d'enseignants.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { supabase, ecoleId, anneeId, anneeLibelle } = await resolveContext(ctx);

    const { data: ecole } = await supabase
      .from("ecoles")
      .select("nom")
      .eq("id", ecoleId)
      .maybeSingle();

    const eleves = supabase
      .from("eleves")
      .select("id", { count: "exact", head: true })
      .eq("ecole_id", ecoleId);
    const nouveaux = supabase
      .from("eleves")
      .select("id", { count: "exact", head: true })
      .eq("ecole_id", ecoleId)
      .eq("est_nouveau", true);
    const classes = supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("ecole_id", ecoleId);

    const [r1, r2, r3, r4] = await Promise.all([
      anneeId ? eleves.eq("annee_id", anneeId) : eleves,
      anneeId ? nouveaux.eq("annee_id", anneeId) : nouveaux,
      anneeId ? classes.eq("annee_id", anneeId) : classes,
      supabase.from("enseignants").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId),
    ]);

    const stats = {
      ecole: (ecole as any)?.nom ?? null,
      annee: anneeLibelle,
      eleves: r1.count ?? 0,
      nouveaux: r2.count ?? 0,
      classes: r3.count ?? 0,
      enseignants: r4.count ?? 0,
    };

    const text = [
      `${stats.ecole ?? "École"} — année ${stats.annee ?? "non définie"}`,
      `Élèves inscrits : ${stats.eleves} (dont ${stats.nouveaux} nouveaux)`,
      `Classes : ${stats.classes}`,
      `Enseignants : ${stats.enseignants}`,
    ].join("\n");

    return { content: [{ type: "text", text }], structuredContent: stats };
  },
});
