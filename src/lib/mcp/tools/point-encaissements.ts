import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fcfa, resolveContext } from "../supabase";

export default defineTool({
  name: "point_encaissements",
  title: "Point des encaissements",
  description:
    "Total des encaissements de scolarité (paiements non annulés) sur une période, avec la répartition par mode de paiement.",
  inputSchema: {
    date_debut: z.string().describe("Date de début incluse, format AAAA-MM-JJ."),
    date_fin: z.string().describe("Date de fin incluse, format AAAA-MM-JJ."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date_debut, date_fin }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(date_debut) || !iso.test(date_fin)) {
      return { content: [{ type: "text", text: "Dates attendues au format AAAA-MM-JJ." }], isError: true };
    }
    const { supabase, ecoleId } = await resolveContext(ctx);

    const { data, error } = await supabase
      .from("paiements")
      .select("montant, mode, date_paiement, annule_le")
      .eq("ecole_id", ecoleId)
      .gte("date_paiement", date_debut)
      .lte("date_paiement", date_fin)
      .is("annule_le", null)
      .limit(5000);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []) as any[];
    const total = rows.reduce((s, p) => s + Number(p.montant || 0), 0);
    const parMode: Record<string, number> = {};
    for (const p of rows) parMode[p.mode] = (parMode[p.mode] ?? 0) + Number(p.montant || 0);

    const text = [
      `Encaissements du ${date_debut} au ${date_fin}`,
      `Nombre de paiements : ${rows.length}`,
      `Total : ${fcfa(total)}`,
      ...Object.entries(parMode).map(([m, v]) => `· ${m} : ${fcfa(v)}`),
    ].join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: { periode: { date_debut, date_fin }, nombre: rows.length, total, par_mode: parMode },
    };
  },
});
