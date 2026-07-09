import { SettingsSection } from "@/components/settings/SettingsSection";
import { Library, Loader2 } from "lucide-react";
import { KpiCard, BarChart } from "../components/StatsPrimitives";
import { useLivres } from "@/hooks/useLivres";
import { useEmprunts } from "@/hooks/useEmprunts";

export default function LibraryStats() {
  const { livres, loading: lLoading } = useLivres();
  const { emprunts, loading: eLoading } = useEmprunts();

  if (lLoading || eLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const totalLivres = livres.reduce((s, l) => s + l.quantite, 0);
  const enCours = emprunts.filter((e) => e.statut === "en_cours").length;
  const retards = emprunts.filter((e) => e.statut === "en_cours" && new Date(e.date_retour_prevue) < new Date()).length;

  const parCategorie: Record<string, number> = {};
  livres.forEach((l) => { const c = l.categorie ?? "Non classé"; parCategorie[c] = (parCategorie[c] ?? 0) + l.quantite; });

  return (
    <SettingsSection title="Statistiques — Bibliothèque" description="Fonds documentaire, emprunts et retards." icon={<Library className="h-5 w-5" />} hideSave>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Ouvrages" value={totalLivres.toLocaleString("fr-FR")} icon={Library} />
        <KpiCard label="Emprunts en cours" value={enCours} icon={Library} color="text-primary" />
        <KpiCard label="Titres" value={livres.length} icon={Library} />
        <KpiCard label="Retards" value={retards} icon={Library} color="text-destructive" />
      </div>
      {Object.keys(parCategorie).length > 0 && (
        <BarChart title="Ouvrages par catégorie" data={Object.entries(parCategorie).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
      )}
    </SettingsSection>
  );
}
