import { SettingsSection } from "@/components/settings/SettingsSection";
import { LayoutDashboard, GraduationCap, Users, BookOpen, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { STATUTS_ACTIFS } from "@/lib/eleveStatus";

export default function GlobalDashboard() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const { activeAnnee } = useAcademicPeriod();
  const [stats, setStats] = useState({ eleves: 0, enseignants: 0, classes: 0, garcons: 0, filles: 0, totalAttendu: 0, totalPaye: 0 });
  const [classeData, setClasseData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    // Récupérer les frais_scolarite de l'année active, puis les tranches qui en découlent
    const anneeId = activeAnnee?.id;
    const fraisPromise = anneeId
      ? supabase.from("frais_scolarite").select("id").eq("ecole_id", ecoleId).eq("annee_id", anneeId)
      : Promise.resolve({ data: [] as any[] });

    Promise.all([
      supabase.from("eleves").select("id, sexe", { count: "exact", head: false }).eq("ecole_id", ecoleId).in("statut", STATUTS_ACTIFS as unknown as string[]),
      supabase.from("enseignants").select("id", { count: "exact", head: true }).eq("ecole_id", ecoleId).eq("statut", "actif"),
      supabase.from("classes").select("id, nom", { count: "exact", head: false }).eq("ecole_id", ecoleId),
      fraisPromise,
    ]).then(async ([eRes, ensRes, cRes, fRes]) => {
      const fraisIds = (fRes.data ?? []).map((f: any) => f.id);
      let tranchesData: any[] = [];
      if (fraisIds.length > 0) {
        const { data } = await supabase.from("tranches").select("montant, paye").eq("ecole_id", ecoleId).in("frais_id", fraisIds);
        tranchesData = data ?? [];
      } else {
        // Fallback : toutes les tranches (aucune année active configurée)
        const { data } = await supabase.from("tranches").select("montant, paye").eq("ecole_id", ecoleId);
        tranchesData = data ?? [];
      }
      const elevesData = eRes.data ?? [];
      const garcons = elevesData.filter((e: any) => e.sexe === "M").length;
      const filles = elevesData.filter((e: any) => e.sexe === "F").length;
      const totalAttendu = tranchesData.reduce((s: number, t: any) => s + Number(t.montant), 0);
      const totalPaye = tranchesData.reduce((s: number, t: any) => s + Number(t.paye), 0);

      setStats({
        eleves: eRes.count ?? elevesData.length,
        enseignants: ensRes.count ?? 0,
        classes: cRes.count ?? 0,
        garcons, filles, totalAttendu, totalPaye,
      });

      // Effectifs par classe
      if (cRes.data && elevesData.length > 0) {
        const classeCount: Record<string, number> = {};
        // We need classe_id from eleves - refetch light
        supabase.from("eleves").select("classe_id, classes(nom)").eq("ecole_id", ecoleId).in("statut", STATUTS_ACTIFS as unknown as string[]).then(({ data: ed }) => {
          (ed ?? []).forEach((e: any) => {
            const nom = e.classes?.nom ?? "Non affecté";
            classeCount[nom] = (classeCount[nom] ?? 0) + 1;
          });
          setClasseData(Object.entries(classeCount).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value));
        });
      }
      setLoading(false);
    });
  }, [ecoleId]);

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const ratio = stats.enseignants > 0 ? Math.round(stats.eleves / stats.enseignants) : 0;
  const tauxRecouvrement = stats.totalAttendu > 0 ? Math.round((stats.totalPaye / stats.totalAttendu) * 100) : 0;

  return (
    <SettingsSection title="Vue d'ensemble" description="Indicateurs clés de l'établissement." icon={<LayoutDashboard className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Élèves inscrits" value={stats.eleves.toLocaleString("fr-FR")} icon={GraduationCap} />
        <KpiCard label="Enseignants actifs" value={stats.enseignants.toLocaleString("fr-FR")} icon={Users} color="text-primary" />
        <KpiCard label="Classes" value={stats.classes} icon={BookOpen} />
        <KpiCard label="Taux recouvrement" value={`${tauxRecouvrement}%`} icon={DollarSign} />
        <KpiCard label="Ratio élèves/prof" value={ratio} icon={TrendingUp} color="text-primary" />
        <KpiCard label="Garçons / Filles" value={`${stats.garcons} / ${stats.filles}`} icon={GraduationCap} />
      </div>

      {classeData.length > 0 && (
        <BarChart title="Effectifs par classe" data={classeData.slice(0, 15)} />
      )}
    </SettingsSection>
  );
}
