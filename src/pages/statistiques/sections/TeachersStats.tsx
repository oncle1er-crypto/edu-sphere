import { SettingsSection } from "@/components/settings/SettingsSection";
import { Users, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useEnseignants } from "@/hooks/useEnseignants";

export default function TeachersStats() {
  const { enseignants, loading } = useEnseignants();

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const actifs = enseignants.filter((e) => e.statut === "actif").length;
  const hommes = enseignants.filter((e) => e.sexe === "M").length;
  const femmes = enseignants.filter((e) => e.sexe === "F").length;

  const parContrat: Record<string, number> = {};
  enseignants.forEach((e) => {
    const c = e.type_contrat ?? "Non défini";
    parContrat[c] = (parContrat[c] ?? 0) + 1;
  });

  return (
    <SettingsSection title="Statistiques — Enseignants" description="Effectifs et répartition du personnel." icon={<Users className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total enseignants" value={enseignants.length} icon={Users} />
        <KpiCard label="Actifs" value={actifs} icon={Users} color="text-primary" />
        <KpiCard label="Hommes" value={hommes} icon={Users} />
        <KpiCard label="Femmes" value={femmes} icon={Users} color="text-primary" />
      </div>
      {Object.keys(parContrat).length > 0 && (
        <BarChart title="Répartition par type de contrat" data={Object.entries(parContrat).map(([label, value]) => ({ label, value }))} />
      )}
    </SettingsSection>
  );
}
