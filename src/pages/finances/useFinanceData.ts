/**
 * useFinanceData — fetches real finance data from DB and builds
 * an EleveScolarite-compatible array for the existing UI components.
 *
 * Falls back to mock data from scolarite-data.ts when DB is empty.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import type {
  EleveScolarite, Tranche, TrancheStatut, Cycle, PaiementHistorique,
} from "./scolarite-data";
import { ELEVES_SCOLARITE, fcfa, modeMeta } from "./scolarite-data";

export { fcfa };

export type { EleveScolarite, Tranche, TrancheStatut, Cycle, PaiementHistorique };


function computeJoursRetard(tranches: Tranche[]): number {
  const today = new Date();
  let maxRetard = 0;
  for (const t of tranches) {
    if (t.statut === "retard" || t.statut === "due") {
      // echeance is stored as YYYY-MM-DD from DB
      const ech = new Date(t.echeance);
      if (today > ech) {
        const diff = Math.floor((today.getTime() - ech.getTime()) / 86400000);
        if (diff > maxRetard) maxRetard = diff;
      }
    }
  }
  return maxRetard;
}

function mapTrancheStatut(dbStatut: string, paye: number, montant: number, echeance: string): TrancheStatut {
  if (paye >= montant) return "payee";
  if (paye > 0) return "partielle";
  const today = new Date();
  const ech = new Date(echeance);
  if (today > ech) return "retard";
  return "due";
}

export function useFinanceData() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [data, setData] = useState<EleveScolarite[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const fetchData = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);

    // Fetch tranches with student info
    const { data: tranchesData, error: trErr } = await supabase
      .from("tranches")
      .select("*, eleves(id, matricule, nom, prenom, sexe, photo_url, classe_id, classes(nom, cycles(nom)))")
      .eq("ecole_id", ecoleId)
      .order("numero");

    if (trErr || !tranchesData || tranchesData.length === 0) {
      setData([]);
      setUsingMock(false);
      setLoading(false);
      return;
    }

    // Fetch parents for contact info
    const { data: parentsData } = await supabase
      .from("eleve_parents")
      .select("eleve_id, parents(nom, prenom, telephone)")
      .eq("est_contact_principal", true);

    const parentMap: Record<string, { nom: string; telephone: string }> = {};
    (parentsData ?? []).forEach((ep: any) => {
      if (ep.parents) {
        parentMap[ep.eleve_id] = {
          nom: `${ep.parents.nom} ${ep.parents.prenom}`,
          telephone: ep.parents.telephone ?? "",
        };
      }
    });

    // Fetch relances
    const { data: relancesData } = await supabase
      .from("relances")
      .select("eleve_id, date_envoi")
      .eq("ecole_id", ecoleId)
      .order("date_envoi", { ascending: false });

    const derniereRelanceMap: Record<string, string> = {};
    (relancesData ?? []).forEach((r: any) => {
      if (!derniereRelanceMap[r.eleve_id]) {
        derniereRelanceMap[r.eleve_id] = new Date(r.date_envoi).toLocaleDateString("fr-FR");
      }
    });

    // Fetch paiements pour bâtir l'historique + totaux remises/encaissements
    const eleveIdsArr = Array.from(
      new Set((tranchesData as any[]).map((t) => t.eleves?.id).filter(Boolean) as string[]),
    );
    const trancheNumByTrancheId = new Map<string, number>();
    (tranchesData as any[]).forEach((t) => trancheNumByTrancheId.set(t.id, t.numero));

    const { data: paiementsData } = await supabase
      .from("paiements")
      .select("id, eleve_id, tranche_id, montant, mode, reference, motif, date_paiement")
      .eq("ecole_id", ecoleId)
      .in("eleve_id", eleveIdsArr.length ? eleveIdsArr : ["00000000-0000-0000-0000-000000000000"])
      .order("date_paiement", { ascending: false });

    const paiementsByEleve = new Map<string, PaiementHistorique[]>();
    (paiementsData ?? []).forEach((p: any) => {
      const meta = modeMeta(p.mode);
      const item: PaiementHistorique = {
        id: p.id,
        date: p.date_paiement,
        montant: Number(p.montant),
        mode: p.mode,
        modeLabel: meta.label,
        kind: meta.kind,
        trancheNum: p.tranche_id ? trancheNumByTrancheId.get(p.tranche_id) : undefined,
        reference: p.reference ?? null,
        motif: p.motif ?? null,
      };
      const arr = paiementsByEleve.get(p.eleve_id) ?? [];
      arr.push(item);
      paiementsByEleve.set(p.eleve_id, arr);
    });

    // Group tranches by eleve
    const eleveMap = new Map<string, {
      eleve: any;
      tranches: Tranche[];
      fraisAnnuel: number;
    }>();

    for (const t of tranchesData as any[]) {
      if (!t.eleves) continue;
      const eleveId = t.eleves.id;

      if (!eleveMap.has(eleveId)) {
        eleveMap.set(eleveId, { eleve: t.eleves, tranches: [], fraisAnnuel: 0 });
      }

      const entry = eleveMap.get(eleveId)!;
      const statut = mapTrancheStatut(t.statut, Number(t.paye), Number(t.montant), t.echeance);
      entry.tranches.push({
        id: t.id,
        num: t.numero as 1 | 2 | 3,
        label: t.label,
        echeance: t.echeance,
        montant: Number(t.montant),
        paye: Number(t.paye),
        statut,
      });
      entry.fraisAnnuel += Number(t.montant);
    }

    // Build EleveScolarite array
    const result: EleveScolarite[] = [];
    for (const [eleveId, entry] of eleveMap) {
      const e = entry.eleve;
      const totalPaye = entry.tranches.reduce((s, t) => s + t.paye, 0);
      const joursRetard = computeJoursRetard(entry.tranches);
      const parent = parentMap[eleveId];
      const paiements = paiementsByEleve.get(eleveId) ?? [];
      const totalEncaisse = paiements.filter((p) => p.kind === "encaissement").reduce((s, p) => s + p.montant, 0);
      const totalRemises  = paiements.filter((p) => p.kind === "remise").reduce((s, p) => s + p.montant, 0);

      result.push({
        id: eleveId,
        matricule: e.matricule ?? "",
        nom: e.nom,
        prenom: e.prenom,
        classe: e.classes?.nom ?? "Non affecté",
        cycle: (e.classes?.cycles?.nom ?? "Primaire") as Cycle,
        parent: parent?.nom ?? "—",
        telephone: parent?.telephone ?? "—",
        fraisAnnuel: entry.fraisAnnuel,
        totalPaye,
        resteDu: entry.fraisAnnuel - totalPaye,
        tranches: entry.tranches.sort((a, b) => a.num - b.num),
        joursRetard,
        derniereRelance: derniereRelanceMap[eleveId],
        totalEncaisse,
        totalRemises,
        paiements,
      });
    }


    setData(result);
    setUsingMock(false);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchData();
    if (!ecoleLoading && !ecoleId) {
      setData([]);
      setUsingMock(false);
      setLoading(false);
    }
  }, [ecoleLoading, ecoleId, fetchData]);

  return { data, loading: loading || ecoleLoading, usingMock, refetch: fetchData, ecoleId };
}
