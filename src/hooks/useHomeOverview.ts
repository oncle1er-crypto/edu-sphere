import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";

export interface HomeActivityItem {
  kind: "paiement" | "inscription" | "incident";
  label: string;
  sub: string;
  at: string;
}

export interface HomeAgendaItem {
  kind: "annonce" | "periode";
  titre: string;
  sub: string;
  at: string;
}

export interface HomeOverview {
  totalEleves: number;
  totalEnseignants: number;
  encaisseJour: number;
  tauxPresence: number | null;
  presencesSaisies: number;
  alertes: {
    impayes: number;
    facturesEchues: number;
    dossiersIncomplets: number;
    tenuesReservees: number;
    stocksBas: number;
  };
  activite: HomeActivityItem[];
  agenda: HomeAgendaItem[];
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

export function useHomeOverview() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const [data, setData] = useState<HomeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const anneeId = activeAnnee?.id ?? null;

  useEffect(() => {
    if (ecoleLoading || periodLoading) return;
    if (!ecoleId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const today = startOfToday();
      const todayIso = today.toISOString();
      const todayDate = todayIso.slice(0, 10);

      const elevesQ = supabase
        .from("eleves")
        .select("id", { count: "exact", head: true })
        .eq("ecole_id", ecoleId);
      if (anneeId) elevesQ.eq("annee_id", anneeId);

      const presencesQ = supabase
        .from("presences")
        .select("statut")
        .eq("ecole_id", ecoleId)
        .eq("date_presence", todayDate);

      const [
        elevesRes,
        ensRes,
        paiementsJourRes,
        spJourRes,
        servJourRes,
        presencesRes,
        impayesRes,
        facturesRes,
        docsRes,
        reservationsRes,
        stocksRes,
        recentPaiementsRes,
        recentElevesRes,
        recentIncidentsRes,
        annoncesRes,
      ] = await Promise.all([
        elevesQ,
        supabase.from("enseignants").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
        supabase.from("paiements").select("montant").eq("ecole_id", ecoleId).is("annule_le", null).gte("date_paiement", todayIso),
        supabase.from("sp_paiements").select("montant_paye").eq("ecole_id", ecoleId).is("annule_le", null).gte("date_paiement", todayIso),
        supabase.from("paiements_services").select("montant").eq("ecole_id", ecoleId).gte("created_at", todayIso),
        presencesQ,
        supabase.from("tranches").select("eleve_id").eq("ecole_id", ecoleId).in("statut", ["due", "retard"]),
        supabase.from("factures").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).neq("statut", "payee").lt("date_echeance", todayDate),
        supabase.from("eleves").select("id").eq("ecole_id", ecoleId).eq(anneeId ? "annee_id" : "ecole_id", anneeId ?? ecoleId),
        supabase.from("sp_ventes_tenues").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "reservation"),
        supabase.from("sp_stock_tenues").select("stock_actuel, seuil_alerte").eq("ecole_id", ecoleId),
        supabase.from("paiements").select("montant, date_paiement, eleves(nom, prenom)").eq("ecole_id", ecoleId).is("annule_le", null).order("date_paiement", { ascending: false }).limit(5),
        supabase.from("eleves").select("nom, prenom, created_at, classes(nom)").eq("ecole_id", ecoleId).order("created_at", { ascending: false }).limit(5),
        supabase.from("incidents_discipline").select("type, motif, date_incident, eleves(nom, prenom)").eq("ecole_id", ecoleId).order("date_incident", { ascending: false }).limit(5),
        supabase.from("annonces").select("titre, contenu, publie_le, created_at").eq("ecole_id", ecoleId).eq("publie", true).order("created_at", { ascending: false }).limit(4),
      ]);

      if (cancelled) return;

      // Documents : nb d'élèves sans aucun document
      const eleveIds = ((docsRes.data ?? []) as any[]).map((e) => e.id);
      let dossiersIncomplets = 0;
      if (eleveIds.length > 0) {
        const { data: docs } = await supabase
          .from("documents_eleves")
          .select("eleve_id")
          .eq("ecole_id", ecoleId);
        if (cancelled) return;
        const withDoc = new Set(((docs ?? []) as any[]).map((d) => d.eleve_id));
        dossiersIncomplets = eleveIds.filter((id) => !withDoc.has(id)).length;
      }

      const encaisseJour =
        ((paiementsJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant), 0) +
        ((spJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant_paye), 0) +
        ((servJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant), 0);

      const presences = (presencesRes.data ?? []) as any[];
      const presentsCount = presences.filter((p) => p.statut === "present" || p.statut === "retard").length;
      const tauxPresence = presences.length > 0 ? Math.round((presentsCount / presences.length) * 100) : null;

      const impayes = new Set(((impayesRes.data ?? []) as any[]).map((t) => t.eleve_id)).size;
      const stocksBas = ((stocksRes.data ?? []) as any[]).filter(
        (s) => num(s.stock_actuel) <= num(s.seuil_alerte)
      ).length;

      const activite: HomeActivityItem[] = [
        ...((recentPaiementsRes.data ?? []) as any[]).map((p) => ({
          kind: "paiement" as const,
          label: `${p.eleves?.prenom ?? ""} ${p.eleves?.nom ?? ""}`.trim() || "Paiement",
          sub: `${num(p.montant).toLocaleString("fr-FR")} FCFA`,
          at: p.date_paiement,
        })),
        ...((recentElevesRes.data ?? []) as any[]).map((e) => ({
          kind: "inscription" as const,
          label: `${e.prenom ?? ""} ${e.nom ?? ""}`.trim(),
          sub: e.classes?.nom ?? "Nouvelle inscription",
          at: e.created_at,
        })),
        ...((recentIncidentsRes.data ?? []) as any[]).map((i) => ({
          kind: "incident" as const,
          label: `${i.eleves?.prenom ?? ""} ${i.eleves?.nom ?? ""}`.trim() || "Incident",
          sub: i.motif || i.type || "Incident",
          at: i.date_incident,
        })),
      ]
        .filter((a) => !!a.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 5);

      const periodes = (activeAnnee?.periodes ?? [])
        .filter((p) => p.statut !== "verrouillee")
        .map((p) => ({
          kind: "periode" as const,
          titre: p.nom,
          sub: `${new Date(p.debut).toLocaleDateString("fr-FR")} → ${new Date(p.fin).toLocaleDateString("fr-FR")}`,
          at: p.debut,
        }));

      const agenda: HomeAgendaItem[] = [
        ...((annoncesRes.data ?? []) as any[]).map((a) => ({
          kind: "annonce" as const,
          titre: a.titre,
          sub: (a.contenu ?? "").slice(0, 80),
          at: a.publie_le ?? a.created_at,
        })),
        ...periodes,
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 4);

      setData({
        totalEleves: elevesRes.count ?? 0,
        totalEnseignants: ensRes.count ?? 0,
        encaisseJour,
        tauxPresence,
        presencesSaisies: presences.length,
        alertes: {
          impayes,
          facturesEchues: facturesRes.count ?? 0,
          dossiersIncomplets,
          tenuesReservees: reservationsRes.count ?? 0,
          stocksBas,
        },
        activite,
        agenda,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [ecoleId, ecoleLoading, periodLoading, anneeId]);

  return { data, loading: loading || ecoleLoading || periodLoading };
}
