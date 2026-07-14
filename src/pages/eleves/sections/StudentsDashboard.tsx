import { useEffect, useState } from "react";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/KpiCard";
import { LayoutDashboard, Users, UserPlus, GraduationCap, Loader2, CalendarCheck, AlertTriangle, UserCheck, UserCog } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";
import { useClasses } from "@/hooks/useClasses";
import { useCycles } from "@/hooks/useCycles";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

export default function StudentsDashboard() {
  const { activeAnnee } = useAcademicPeriod();
  const { eleves, loading: loadingE } = useEleves(activeAnnee.id);
  const { classes, loading: loadingC } = useClasses(activeAnnee.id);
  const { cycles, loading: loadingCy } = useCycles();
  const { ecoleId } = useEcoleId();

  const [tauxPresence, setTauxPresence] = useState<number | null>(null);
  const [retardPaiement, setRetardPaiement] = useState(0);
  const [elevesAvecVersement, setElevesAvecVersement] = useState<Set<string>>(new Set());

  const loading = loadingE || loadingC || loadingCy;

  useEffect(() => {
    if (!ecoleId) return;

    // Calcul taux de présence (30 derniers jours)
    const fetchPresence = async () => {
      const il30j = new Date();
      il30j.setDate(il30j.getDate() - 30);
      const { data } = await supabase
        .from("presences")
        .select("statut")
        .eq("ecole_id", ecoleId)
        .gte("date_presence", il30j.toISOString().slice(0, 10));
      if (data && data.length > 0) {
        const presents = data.filter((p: any) => p.statut === "present").length;
        setTauxPresence(Math.round((presents / data.length) * 100));
      }
    };

    // Élèves en retard de paiement
    const fetchRetard = async () => {
      const { data } = await supabase
        .from("paiements")
        .select("eleve_id, montant")
        .eq("ecole_id", ecoleId);
      const { data: frais } = await supabase
        .from("frais_scolarite")
        .select("montant_annuel, cycle_id")
        .eq("ecole_id", ecoleId);

      if (data && frais) {
        const paiementsByEleve = new Map<string, number>();
        data.forEach((p: any) => {
          paiementsByEleve.set(p.eleve_id, (paiementsByEleve.get(p.eleve_id) ?? 0) + Number(p.montant));
        });
        const fraisByCycle = new Map<string, number>();
        frais.forEach((f: any) => fraisByCycle.set(f.cycle_id, Number(f.montant_annuel)));

        let count = 0;
        for (const e of eleves.filter((e) => (e.statut === "inscrit" || e.statut === "pre_inscrit" || e.statut === "actif") && e.classe_id)) {
          const cl = classes.find((c) => c.id === e.classe_id);
          if (!cl) continue;
          const total = fraisByCycle.get(cl.cycle_id) ?? 0;
          const paye = paiementsByEleve.get(e.id) ?? 0;
          if (total > 0 && paye < total * 0.5) count++;
        }
        setRetardPaiement(count);
      }
    };

    // Élèves ayant au moins un versement (définit Inscrit vs Pré-inscrit)
    const fetchVersements = async () => {
      const { data } = await supabase
        .from("paiements")
        .select("eleve_id, montant")
        .eq("ecole_id", ecoleId)
        .gt("montant", 0);
      setElevesAvecVersement(new Set((data ?? []).map((p: any) => p.eleve_id)));
    };

    fetchPresence();
    fetchRetard();
    fetchVersements();
  }, [ecoleId, eleves, classes]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Inscrit = élève ayant fait au moins un versement. Pré-inscrit = aucun versement.
  const total = eleves.length;
  const inscrits = eleves.filter((e) => elevesAvecVersement.has(e.id)).length;
  const preInscrits = eleves.filter((e) => !elevesAvecVersement.has(e.id)).length;
  const actifsTotal = total;
  const garcons = eleves.filter((e) => e.sexe === "M").length;
  const filles = eleves.filter((e) => e.sexe === "F").length;

  // Nouveaux inscrits ce mois
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const nouveauxCeMois = eleves.filter((e) => e.date_inscription && e.date_inscription >= debutMois).length;

  const repartition = cycles.map((cy) => {
    const classeIds = classes.filter((c) => c.cycle_id === cy.id).map((c) => c.id);
    const effectif = eleves.filter((e) => e.classe_id && classeIds.includes(e.classe_id)).length;
    const capacite = classes
      .filter((c) => c.cycle_id === cy.id)
      .reduce((sum, c) => sum + (c.capacite ?? 50), 0);
    return { cycle: cy.nom, effectif, capacite };
  });

  const kpis = [
    { label: "Total élèves", value: total.toLocaleString("fr-FR"), icon: Users, color: "text-primary" },
    { label: "Inscrits", value: inscrits.toString(), sub: "Au moins un versement", icon: UserPlus, color: "text-emerald-600" },
    { label: "Pré-inscrits", value: preInscrits.toString(), sub: "Aucun versement", icon: UserCog, color: "text-amber-600" },
    { label: "Classes", value: classes.length.toString(), icon: GraduationCap, color: "text-accent-foreground" },
    { label: "Taux de présence (30j)", value: tauxPresence !== null ? `${tauxPresence}%` : "—", icon: CalendarCheck, color: "text-blue-600" },
    { label: "Nouveaux ce mois", value: nouveauxCeMois.toString(), icon: UserCheck, color: "text-violet-600" },
    { label: "Retard de paiement", value: retardPaiement.toString(), icon: AlertTriangle, color: "text-destructive" },
  ];

  const cycleColors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];

  const pctFilles = actifsTotal > 0 ? Math.round((filles / actifsTotal) * 100) : 0;
  const pctGarcons = actifsTotal > 0 ? Math.round((garcons / actifsTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble"
        description="Indicateurs clés sur les effectifs et le suivi des élèves."
        hideSave
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} index={i} />
          ))}
        </div>
      </SettingsSection>

      {/* Répartition garçons/filles */}
      <SettingsSection
        icon={<Users className="h-5 w-5" />}
        title="Répartition par genre"
        description={`${garcons} garçons — ${filles} filles`}
        hideSave
      >
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Garçons</span>
              <span className="font-semibold">{garcons} ({pctGarcons}%)</span>
            </div>
            <Progress value={pctGarcons} className="h-2.5" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Filles</span>
              <span className="font-semibold">{filles} ({pctFilles}%)</span>
            </div>
            <Progress value={pctFilles} className="h-2.5" />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={<GraduationCap className="h-5 w-5" />}
        title="Répartition par cycle"
        description="Effectifs actuels et taux d'occupation."
        hideSave
      >
        <div className="space-y-4">
          {repartition.map((r, i) => {
            const pct = r.capacite > 0 ? Math.round((r.effectif / r.capacite) * 100) : 0;
            return (
              <div key={r.cycle}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${cycleColors[i % cycleColors.length]}`} />
                    <span className="text-sm font-medium">{r.cycle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.effectif}</span>
                    <span className="text-xs text-muted-foreground">/ {r.capacite}</span>
                    <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
          {repartition.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun cycle configuré.</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
