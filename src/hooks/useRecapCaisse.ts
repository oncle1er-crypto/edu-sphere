import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveauFilters } from "@/hooks/useNiveauFilters";
import { modeMeta } from "@/pages/finances/scolarite-data";

/**
 * Données du Récapitulatif de caisse (jour ou semaine), filtrées par niveau.
 *
 * Contrairement à la RPC `encaissements_du_jour` (utilisée par la tuile
 * Tableau de bord, limitée à une seule journée et sans filtre de niveau),
 * ce hook interroge directement `v_encaissements_detail` sur la plage de
 * dates demandée puis agrège côté client — ce qui permet à la fois le mode
 * "semaine" et le filtrage par niveau (keepEleve / matchesCycle), impossibles
 * à faire dans la RPC existante sans la réécrire.
 *
 * Filtrage par niveau : la vue expose eleve_id (fiable pour scolarité,
 * remises, cantine, transport, services récurrents/ponctuels rattachés à un
 * élève) et, en repli, cycle_id pour les 2 cas où eleve_id est absent :
 *  - vacances (eleve_id de la vue référence vacances_eleves, pas eleves —
 *    même quirk que dans useBilanComptable.ts, corrigé via cycle_id) ;
 *  - services ponctuels réservés par un candidat non encore élève (cycle_id
 *    dérivé de sp_candidats.classe_demandee_id).
 * Une ligne sans eleve_id NI cycle_id est traitée comme "commune" (visible
 * dans tous les niveaux), au même titre que les dépenses sans cycle_id.
 */

export type RecapCaissePeriode =
  | { mode: "jour"; date: string }
  | { mode: "semaine"; date: string };

export interface RecapCaisseOperationRow {
  beneficiaire: string;
  matricule: string | null;
  mode: string;
  reference: string | null;
  montant: number;
}

export interface RecapCaisseSourceAgg {
  source: string;
  libelle: string;
  estRemise: boolean;
  nb: number;
  total: number;
  operations: RecapCaisseOperationRow[];
}

export interface RecapCaisseDepenseRow {
  libelle: string;
  categorie: string | null;
  fournisseur: string | null;
  montant: number;
}

export interface RecapCaisseData {
  from: string;
  to: string;
  periodeLabel: string;
  totalEncaisse: number;
  totalRemises: number;
  totalDepenses: number;
  soldeNet: number;
  nbEncaissements: number;
  sources: RecapCaisseSourceAgg[];
  depenses: RecapCaisseDepenseRow[];
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function lundiDe(d: Date): Date {
  const jour = d.getDay();
  const decalage = jour === 0 ? -6 : 1 - jour;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + decalage);
}
const fmtJour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtJourLong = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

export function useRecapCaisse(periode: RecapCaissePeriode) {
  const { ecoleId } = useEcoleId();
  const { niveau, isGlobal, keepEleve, matchesCycle } = useNiveauFilters();

  let from: string;
  let to: string;
  let periodeLabel: string;
  if (periode.mode === "jour") {
    from = periode.date;
    to = periode.date;
    periodeLabel = fmtJourLong(fromIso(periode.date));
  } else {
    const lundi = lundiDe(fromIso(periode.date));
    const dimanche = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 6);
    from = toIso(lundi);
    to = toIso(dimanche);
    periodeLabel = `Semaine du ${fmtJour(lundi)} au ${fmtJour(dimanche)}`;
  }

  return useQuery<RecapCaisseData>({
    queryKey: ["recap_caisse", ecoleId, from, to, niveau],
    enabled: !!ecoleId,
    queryFn: async () => {
      const [{ data: rows, error }, spLabels] = await Promise.all([
        supabase
          .from("v_encaissements_detail")
          .select("source, libelle, est_remise, montant, mode_paiement, reference, eleve, matricule, eleve_id, cycle_id")
          .eq("ecole_id", ecoleId!)
          .gte("date_operation", from)
          .lte("date_operation", to),
        fetchSpServiceLabels(ecoleId!, from, to),
      ]);
      if (error) throw error;

      const keep = (r: { eleve_id: string | null; cycle_id: string | null }) => {
        if (isGlobal) return true;
        if (r.eleve_id) return keepEleve(r.eleve_id);
        return matchesCycle(r.cycle_id);
      };

      const map = new Map<string, RecapCaisseSourceAgg>();
      for (const r of (rows ?? []) as any[]) {
        if (!keep(r)) continue;
        // Les services ponctuels sont éclatés par type de service exact
        const service = estSourceServicePonctuel(r.source) ? libelleService(r.reference, spLabels) : null;
        const key = service ? `${r.source}:${service}` : (r.source as string);
        const agg = map.get(key) ?? {
          source: key,
          libelle: service ? `${r.libelle} — ${service}` : (r.libelle as string),
          estRemise: !!r.est_remise,
          nb: 0,
          total: 0,
          operations: [],
        };
        agg.nb += 1;
        agg.total += Number(r.montant || 0);
        agg.operations.push({
          beneficiaire: r.eleve ?? "—",
          matricule: r.matricule,
          mode: modeMeta(r.mode_paiement ?? "").label,
          reference: r.reference,
          montant: Number(r.montant || 0),
        });
        map.set(key, agg);
      }

      // Tri : plus gros montants d'abord, dans chaque source (cohérent avec l'ordre déjà utilisé par la RPC encaissements_du_jour)
      for (const agg of map.values()) agg.operations.sort((a, b) => b.montant - a.montant);
      const sources = Array.from(map.values()).sort((a, b) => Number(a.estRemise) - Number(b.estRemise) || b.total - a.total);

      const entrees = sources.filter((s) => !s.estRemise);
      const remises = sources.filter((s) => s.estRemise);
      const totalEncaisse = entrees.reduce((s, src) => s + src.total, 0);
      const totalRemises = remises.reduce((s, src) => s + src.total, 0);
      const nbEncaissements = entrees.reduce((n, src) => n + src.nb, 0);

      // ── Dépenses validées de la période, filtrées par niveau (même convention que useBilanComptable.ts / Ledger) ──
      const { data: depRows, error: depError } = await supabase
        .from("depenses")
        .select("libelle, categorie, montant, cycle_id, fournisseurs(nom)")
        .eq("ecole_id", ecoleId!)
        .eq("statut", "validee")
        .gte("date_depense", from)
        .lte("date_depense", to);
      if (depError) throw depError;

      const depenses: RecapCaisseDepenseRow[] = ((depRows ?? []) as any[])
        .filter((d) => matchesCycle(d.cycle_id))
        .map((d) => ({
          libelle: d.libelle,
          categorie: d.categorie,
          fournisseur: d.fournisseurs?.nom ?? null,
          montant: Number(d.montant || 0),
        }));
      const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);

      return {
        from,
        to,
        periodeLabel,
        totalEncaisse: Math.round(totalEncaisse),
        totalRemises: Math.round(totalRemises),
        totalDepenses: Math.round(totalDepenses),
        soldeNet: Math.round(totalEncaisse - totalDepenses),
        nbEncaissements,
        sources,
        depenses,
      };
    },
  });
}
