import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fcfa, resolveContext } from "../supabase";

export default defineTool({
  name: "situation_scolarite_eleve",
  title: "Situation de scolarité d'un élève",
  description:
    "Retourne la situation financière de scolarité d'un élève (total dû, encaissé, reste à payer) et le détail de ses tranches.",
  inputSchema: {
    matricule: z.string().describe("Matricule exact de l'élève."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ matricule }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { supabase, ecoleId } = await resolveContext(ctx);

    const { data: eleve, error } = await supabase
      .from("eleves")
      .select("id, matricule, nom, prenom, statut, classes(nom)")
      .eq("ecole_id", ecoleId)
      .eq("matricule", matricule.trim())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!eleve) {
      return { content: [{ type: "text", text: `Aucun élève avec le matricule ${matricule}.` }], isError: true };
    }

    const { data: tranches } = await supabase
      .from("tranches")
      .select("numero, label, montant, paye, statut, echeance")
      .eq("ecole_id", ecoleId)
      .eq("eleve_id", (eleve as any).id)
      .order("numero");

    const list = (tranches ?? []) as any[];
    const total = list.reduce((s, t) => s + Number(t.montant || 0), 0);
    const paye = list.reduce((s, t) => s + Number(t.paye || 0), 0);
    const reste = Math.max(total - paye, 0);

    const nom = `${(eleve as any).nom} ${(eleve as any).prenom}`.trim();
    const text = [
      `${nom} (${(eleve as any).matricule}) — ${(eleve as any).classes?.nom ?? "sans classe"}`,
      `Total dû : ${fcfa(total)} · Encaissé : ${fcfa(paye)} · Reste : ${fcfa(reste)}`,
      ...list.map(
        (t) => `Tranche ${t.numero} ${t.label} — ${fcfa(Number(t.paye))}/${fcfa(Number(t.montant))} (${t.statut}, échéance ${t.echeance})`,
      ),
    ].join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        eleve: { matricule: (eleve as any).matricule, nom, classe: (eleve as any).classes?.nom ?? null },
        total_du: total,
        total_encaisse: paye,
        reste_a_payer: reste,
        tranches: list,
      },
    };
  },
});
