import { SettingsSection } from "@/components/settings/SettingsSection";
import { DollarSign, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useFinanceData, fcfa } from "@/pages/finances/useFinanceData";

export default function FinanceStats() {
  const { data: ELEVES, loading } = useFinanceData();

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalAttendu = ELEVES.reduce((s, e) => s + e.fraisAnnuel, 0);
  const totalPaye = ELEVES.reduce((s, e) => s + e.totalPaye, 0);
  const totalDu = totalAttendu - totalPaye;
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalPaye / totalAttendu) * 100) : 0;

  const retards = ELEVES.filter((e) => e.tranches.some((t) => t.statut === "retard")).length;

  // Par cycle
  const cycleNames = Array.from(new Set(ELEVES.map((e) => e.cycle)));
  const parCycle = cycleNames.map((c) => {
    const list = ELEVES.filter((e) => e.cycle === c);
    const att = list.reduce((s, e) => s + e.fraisAnnuel, 0);
    const pay = list.reduce((s, e) => s + e.totalPaye, 0);
    return { label: `${c} (${att > 0 ? Math.round((pay / att) * 100) : 0}%)`, value: pay };
  });

  return (
    <SettingsSection title="Statistiques — Finances" description="Revenus, impayés et recouvrement." icon={<DollarSign className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Frais attendus" value={`${fcfa(totalAttendu)} F`} icon={DollarSign} />
        <KpiCard label="Encaissé" value={`${fcfa(totalPaye)} F`} icon={DollarSign} color="text-accent" />
        <KpiCard label="Impayés" value={`${fcfa(totalDu)} F`} icon={DollarSign} color="text-destructive" />
        <KpiCard label="Taux recouvrement" value={`${tauxRecouvrement}%`} icon={DollarSign} color="text-accent" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Familles en retard" value={retards} icon={DollarSign} color="text-destructive" />
        <KpiCard label="Familles à jour" value={ELEVES.length - retards} icon={DollarSign} color="text-accent" />
      </div>
      {parCycle.length > 0 && <BarChart title="Encaissements par cycle (FCFA)" data={parCycle} format={(v) => fcfa(v)} />}
    </SettingsSection>
  );
}
