/**
 * useFinanceData — fetches real finance data from DB and builds
 * an EleveScolarite-compatible array for the existing UI components.
 *
 * Falls back to mock data from scolarite-data.ts when DB is empty.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useNiveau } from "@/context/NiveauContext";
import type {
  EleveScolarite, Tranche, TrancheStatut, Cycle, PaiementHistorique,
} from "./scolarite-data";
import { ELEVES_SCOLARITE, fcfa, modeMeta } from "./scolarite-data";
import { sortEleves } from "@/lib/sortEleves";

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

export function useFinanceData(scopedAnneeId?: string) {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { isGlobal, classeIds } = useNiveau();
  const [data, setData] = useState<EleveScolarite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const hasLoadedRef = useRef(false);
  const scopedProvided = scopedAnneeId !== undefined;

  const fetchData = useCallback(async () => {
    if (!ecoleId) return;
    if (scopedProvided && !scopedAnneeId) {
      setData([]);
      setUsingMock(false);
      setLoading(false);
      return;
    }
    setRefetching(true);
    // On ne bascule `loading` que lors du premier chargement pour éviter un flash
    // (skeleton complet de la page) lors des refetch en arrière-plan (ex. ouverture drawer).
    if (!hasLoadedRef.current) setLoading(true);



    // Fetch tranches with student info — filtrées par année via frais_scolarite si scope fourni
    let tranchesQuery = supabase
      .from("tranches")
      .select(scopedAnneeId
        ? "*, frais_scolarite!inner(annee_id), eleves(id, matricule, nom, prenom, sexe, photo_url, classe_id, classes(nom, cycles(nom)))"
        : "*, eleves(id, matricule, nom, prenom, sexe, photo_url, classe_id, classes(nom, cycles(nom)))")
      .eq("ecole_id", ecoleId)
      .order("numero");

    if (scopedAnneeId) {
      tranchesQuery = tranchesQuery.eq("frais_scolarite.annee_id", scopedAnneeId);
    }

    const { data: tranchesData, error: trErr } = await tranchesQuery;

    if (trErr || !tranchesData || tranchesData.length === 0) {
      setData([]);
      setUsingMock(false);
      hasLoadedRef.current = true;
      setLoading(false);
      setRefetching(false);
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
    // NB : on ne peut PAS envoyer un `.in("eleve_id", [...])` ou `.in("tranche_id", [...])`
    // avec plusieurs centaines d'IDs — l'URL dépasse la limite PostgREST (414 / 400).
    // On récupère tous les paiements de l'école, puis on filtre côté client via
    // le set des tranche_ids déjà scopé à l'année active.
    const trancheNumByTrancheId = new Map<string, number>();
    (tranchesData as any[]).forEach((t) => trancheNumByTrancheId.set(t.id, t.numero));
    const trancheIdsSet = new Set<string>((tranchesData as any[]).map((t) => t.id));

    // Pagination pour dépasser la limite PostgREST de 1000 lignes.
    const paiementsAll: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    // Sécurité : plafond à 20 pages (20000 paiements) pour éviter une boucle infinie.
    for (let i = 0; i < 20; i++) {
      const { data: page, error: pErr } = await supabase
        .from("paiements")
        .select("id, eleve_id, tranche_id, montant, mode, reference, motif, date_paiement, annule_le, motif_annulation")
        .eq("ecole_id", ecoleId)
        .order("date_paiement", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (pErr || !page || page.length === 0) break;
      paiementsAll.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const paiementsData = paiementsAll;


    const paiementsByEleve = new Map<string, PaiementHistorique[]>();
    (paiementsData ?? []).forEach((p: any) => {
      // Si on est en mode scopé année : ne conserver que les paiements rattachés
      // à une tranche de l'année active. Les paiements sans tranche_id (remises,
      // bourses, imports historiques) ne peuvent pas être attribués à une année
      // en particulier et sont donc exclus du scope année pour éviter de gonfler
      // les totaux du dossier scolarité courant.
      if (scopedAnneeId && (!p.tranche_id || !trancheIdsSet.has(p.tranche_id))) return;
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
        annuleLe: p.annule_le ?? null,
        motifAnnulation: p.motif_annulation ?? null,
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
      const joursRetard = computeJoursRetard(entry.tranches);
      const parent = parentMap[eleveId];
      const paiements = paiementsByEleve.get(eleveId) ?? [];
      // Les paiements annulés restent visibles dans l'historique mais ne sont
      // jamais comptés dans les totaux (encaissé, remises, reste dû).
      const actifs = paiements.filter((p) => !p.annuleLe);
      const totalEncaisse = actifs.filter((p) => p.kind === "encaissement").reduce((s, p) => s + p.montant, 0);
      const totalRemises  = actifs.filter((p) => p.kind === "remise").reduce((s, p) => s + p.montant, 0);

      // `totalPaye` = trésorerie réellement encaissée (hors remises/bourses).
      // Le dû couvert (encaissé + remises) sert uniquement au calcul du reste à payer.
      const totalPaye = totalEncaisse;
      const totalCouvert = totalEncaisse + totalRemises;

      result.push({
        id: eleveId,
        matricule: e.matricule ?? "",
        nom: e.nom,
        prenom: e.prenom,
        classe: e.classes?.nom ?? "Non affecté",
        classeId: e.classe_id ?? null,
        cycle: (e.classes?.cycles?.nom ?? "Primaire") as Cycle,
        parent: parent?.nom ?? "—",
        telephone: parent?.telephone ?? "—",
        fraisAnnuel: entry.fraisAnnuel,
        totalPaye,
        resteDu: Math.max(0, entry.fraisAnnuel - totalCouvert),
        tranches: entry.tranches.sort((a, b) => a.num - b.num),
        joursRetard,
        derniereRelance: derniereRelanceMap[eleveId],
        totalEncaisse,
        totalRemises,
        paiements,
      });
    }


    setData(sortEleves(result));
    setUsingMock(false);
    hasLoadedRef.current = true;
    setLoading(false);
    setRefetching(false);
  }, [ecoleId, scopedAnneeId, scopedProvided]);

  useEffect(() => {
    if (!ecoleLoading && ecoleId) fetchData();
    if (!ecoleLoading && !ecoleId) {
      setData([]);
      setUsingMock(false);
      setLoading(false);
      setRefetching(false);
    }
  }, [ecoleLoading, ecoleId, fetchData]);

  // Filtrage par niveau (Primaire = Maternelle + Primaire / Secondaire)
  const scopedData = useMemo(() => {
    if (isGlobal || !classeIds) return data;
    const set = new Set(classeIds);
    return data.filter((d) => d.classeId && set.has(d.classeId));
  }, [data, isGlobal, classeIds]);

  return { data: scopedData, loading: loading || ecoleLoading, refetching, usingMock, refetch: fetchData, ecoleId };
}


