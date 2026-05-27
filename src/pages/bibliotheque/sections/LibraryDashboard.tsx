import { SettingsSection } from "@/components/settings/SettingsSection";
import { KpiCard } from "@/components/KpiCard";
import { LayoutDashboard, BookOpen, Repeat, AlertCircle, Loader2 } from "lucide-react";
import { useLivres } from "@/hooks/useLivres";
import { useEmprunts } from "@/hooks/useEmprunts";

export default function LibraryDashboard() {
  const { livres, loading: loadingL } = useLivres();
  const { emprunts, loading: loadingE } = useEmprunts();

  if (loadingL || loadingE) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalLivres = livres.length;
  const totalExemplaires = livres.reduce((s, l) => s + l.quantite, 0);
  const totalDisponibles = livres.reduce((s, l) => s + l.disponible, 0);
  const empruntsEnCours = emprunts.filter((e) => e.statut === "en_cours").length;
  const retards = emprunts.filter((e) => e.statut === "en_cours" && new Date(e.date_retour_prevue) < new Date()).length;

  const kpis = [
    { label: "Ouvrages", value: totalLivres.toString(), sub: `${totalExemplaires} exemplaires`, icon: BookOpen, color: "text-primary" },
    { label: "Disponibles", value: totalDisponibles.toString(), sub: "exemplaires", icon: BookOpen, color: "text-emerald-600" },
    { label: "Emprunts en cours", value: empruntsEnCours.toString(), sub: "", icon: Repeat, color: "text-blue-600" },
    { label: "Retards", value: retards.toString(), sub: "à relancer", icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <SettingsSection
      icon={<LayoutDashboard className="h-5 w-5" />}
      title="Vue d'ensemble"
      description="Indicateurs clés de la bibliothèque."
      hideSave
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} index={i} />
        ))}
      </div>
    </SettingsSection>
  );
}
