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
  /** bornes de période (utilisées pour le badge En cours / À venir / Terminé) */
  debut?: string;
  fin?: string;
}

/** Ligne générique affichée dans le dialogue d'une alerte */
export interface AlertRow {
  id: string;
  titre: string;
  sub: string;
  montant?: number;
}

export interface HomeOverview {
  totalEleves: number;
  totalInscrits: number;
  totalEnseignants: number;
  encaisseJour: number;
  tauxPresence: number | null;
  presencesSaisies: number;
  alertes: {
    impayes: AlertRow[];
    impayesCantine: AlertRow[];
    impayesTransport: AlertRow[];
    dossiersIncomplets: AlertRow[];
    tenuesReservees: AlertRow[];
    stocksBas: AlertRow[];
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
const nomOf = (e: any) => `${e?.prenom ?? ""} ${e?.nom ?? ""}`.trim();

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
        .select("id, nom, prenom, statut, classes(nom)")
        .eq("ecole_id", ecoleId);
      if (anneeId) elevesQ.eq("annee_id", anneeId);

      const presencesQ = supabase
        .from("presences")
        .select("statut")
        .eq("ecole_id", ecoleId)
        .eq("date_presence", todayDate);

      const facturesQ = supabase
        .from("factures")
        .select("id, numero, libelle, montant, montant_paye, date_echeance, categorie, eleves(nom, prenom)")
        .eq("ecole_id", ecoleId)
        .neq("statut", "payee")
        .order("date_echeance", { ascending: true })
        .limit(200);
      if (anneeId) facturesQ.eq("annee_id", anneeId);

      const [
        elevesRes,
        ensRes,
        paiementsJourRes,
        spJourRes,
        servJourRes,
        presencesRes,
        tranchesRes,
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
        supabase
          .from("tranches")
          .select("eleve_id, montant, paye, statut, label, echeance, eleves(nom, prenom, classes(nom))")
          .eq("ecole_id", ecoleId)
          .in("statut", ["due", "retard"])
          .limit(1000),
        facturesQ,
        supabase.from("documents_eleves").select("eleve_id").eq("ecole_id", ecoleId),
        supabase
          .from("sp_ventes_tenues")
          .select("id, numero, acheteur_libre, montant_total, created_at, eleves(nom, prenom), classes(nom)")
          .eq("ecole_id", ecoleId)
          .eq("statut", "reservation")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("sp_stock_tenues").select("id, genre, stock_actuel, seuil_alerte, classes(nom)").eq("ecole_id", ecoleId),
        supabase.from("paiements").select("montant, date_paiement, eleves(nom, prenom)").eq("ecole_id", ecoleId).is("annule_le", null).order("date_paiement", { ascending: false }).limit(6),
        supabase.from("eleves").select("nom, prenom, created_at, classes(nom)").eq("ecole_id", ecoleId).order("created_at", { ascending: false }).limit(6),
        supabase.from("incidents_discipline").select("type, motif, date_incident, eleves(nom, prenom)").eq("ecole_id", ecoleId).order("date_incident", { ascending: false }).limit(6),
        supabase.from("annonces").select("titre, contenu, publie_le, created_at").eq("ecole_id", ecoleId).eq("publie", true).order("created_at", { ascending: false }).limit(6),
      ]);

      if (cancelled) return;

      const eleves = (elevesRes.data ?? []) as any[];
      const withDoc = new Set(((docsRes.data ?? []) as any[]).map((d) => d.eleve_id));
      const dossiersIncomplets: AlertRow[] = eleves
        .filter((e) => !withDoc.has(e.id))
        .map((e) => ({ id: e.id, titre: nomOf(e), sub: e.classes?.nom ?? "Sans classe" }));

      const encaisseJour =
        ((paiementsJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant), 0) +
        ((spJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant_paye), 0) +
        ((servJourRes.data ?? []) as any[]).reduce((s, p) => s + num(p.montant), 0);

      const presences = (presencesRes.data ?? []) as any[];
      const presentsCount = presences.filter((p) => p.statut === "present" || p.statut === "retard").length;
      const tauxPresence = presences.length > 0 ? Math.round((presentsCount / presences.length) * 100) : null;

      // Impayés scolarité : agrégés par élève
      const byEleve = new Map<string, AlertRow>();
      for (const t of (tranchesRes.data ?? []) as any[]) {
        const reste = Math.max(0, num(t.montant) - num(t.paye));
        if (reste <= 0) continue;
        const prev = byEleve.get(t.eleve_id);
        if (prev) {
          prev.montant = (prev.montant ?? 0) + reste;
        } else {
          byEleve.set(t.eleve_id, {
            id: t.eleve_id,
            titre: nomOf(t.eleves) || "Élève",
            sub: t.eleves?.classes?.nom ?? "Scolarité",
            montant: reste,
          });
        }
      }
      const impayes = [...byEleve.values()].sort((a, b) => (b.montant ?? 0) - (a.montant ?? 0));

      const facturesRows = ((facturesRes.data ?? []) as any[]).map((f) => ({
        categorie: (f.categorie ?? "").toLowerCase(),
        row: {
          id: f.id,
          titre: nomOf(f.eleves) || f.numero,
          sub: `${f.libelle ?? ""}${f.date_echeance ? ` · éch. ${new Date(f.date_echeance).toLocaleDateString("fr-FR")}` : ""}`,
          montant: Math.max(0, num(f.montant) - num(f.montant_paye)),
        } as AlertRow,
      }));
      const impayesCantine = facturesRows.filter((f) => f.categorie === "cantine").map((f) => f.row);
      const impayesTransport = facturesRows.filter((f) => f.categorie === "transport").map((f) => f.row);

      const tenuesReservees: AlertRow[] = ((reservationsRes.data ?? []) as any[]).map((v) => ({
        id: v.id,
        titre: nomOf(v.eleves) || v.acheteur_libre || v.numero,
        sub: `${v.classes?.nom ?? ""} · réservation`,
        montant: num(v.montant_total),
      }));

      const stocksBas: AlertRow[] = ((stocksRes.data ?? []) as any[])
        .filter((s) => num(s.stock_actuel) <= num(s.seuil_alerte))
        .map((s) => ({
          id: s.id,
          titre: `${s.classes?.nom ?? "Classe"} · ${s.genre === "F" ? "Fille" : s.genre === "M" ? "Garçon" : "—"}`,
          sub: `Stock ${num(s.stock_actuel)} / seuil ${num(s.seuil_alerte)}`,
        }));

      const activite: HomeActivityItem[] = [
        ...((recentPaiementsRes.data ?? []) as any[]).map((p) => ({
          kind: "paiement" as const,
          label: nomOf(p.eleves) || "Paiement",
          sub: `${num(p.montant).toLocaleString("fr-FR")} FCFA`,
          at: p.date_paiement,
        })),
        ...((recentElevesRes.data ?? []) as any[]).map((e) => ({
          kind: "inscription" as const,
          label: nomOf(e),
          sub: e.classes?.nom ?? "Nouvelle inscription",
          at: e.created_at,
        })),
        ...((recentIncidentsRes.data ?? []) as any[]).map((i) => ({
          kind: "incident" as const,
          label: nomOf(i.eleves) || "Incident",
          sub: i.motif || i.type || "Incident",
          at: i.date_incident,
        })),
      ]
        .filter((a) => !!a.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 6);

      const periodes = (activeAnnee?.periodes ?? [])
        .filter((p) => p.statut !== "verrouillee")
        .map((p) => ({
          kind: "periode" as const,
          titre: p.nom,
          sub: `${new Date(p.debut).toLocaleDateString("fr-FR")} → ${new Date(p.fin).toLocaleDateString("fr-FR")}`,
          at: p.debut,
          debut: p.debut,
          fin: p.fin,
        }));

      const agenda: HomeAgendaItem[] = [
        ...((annoncesRes.data ?? []) as any[]).map((a) => ({
          kind: "annonce" as const,
          titre: a.titre,
          sub: (a.contenu ?? "").slice(0, 90),
          at: a.publie_le ?? a.created_at,
        })),
        ...periodes,
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 5);

      setData({
        totalEleves: eleves.length,
        totalInscrits: eleves.filter((e) => e.statut === "inscrit").length,
        totalEnseignants: ensRes.count ?? 0,
        encaisseJour,
        tauxPresence,
        presencesSaisies: presences.length,
        alertes: {
          impayes,
          impayesCantine,
          impayesTransport,
          dossiersIncomplets,
          tenuesReservees,
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
