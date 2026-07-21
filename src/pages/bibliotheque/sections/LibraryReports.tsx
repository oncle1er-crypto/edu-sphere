import { SettingsSection } from "@/components/settings/SettingsSection";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLivres } from "@/hooks/useLivres";
import { useEmprunts } from "@/hooks/useEmprunts";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

export default function LibraryReports() {
  const { livres } = useLivres();
  const { emprunts } = useEmprunts();
  const ecole = useEcoleInfo();

  const today = new Date();

  const items = [
    {
      key: "catalogue", title: "Catalogue complet", desc: "Tous les ouvrages référencés.", filename: "catalogue-bibliotheque",
      columns: ["Titre", "Auteur", "Catégorie", "Éditeur", "Année", "ISBN", "Exemplaires", "Disponibles"],
      getRows: () => livres.map((l: any) => [l.titre, l.auteur ?? "", l.categorie ?? "", l.editeur ?? "", l.annee_publication ?? "", l.isbn ?? "", l.nombre_exemplaires ?? "", l.exemplaires_disponibles ?? ""]),
    },
    {
      key: "encours", title: "Emprunts en cours", desc: "Sorties non rendues.", filename: "emprunts-en-cours",
      columns: ["Titre", "Emprunteur", "Date emprunt", "Retour prévu", "Statut"],
      getRows: () => emprunts.filter((e: any) => !e.date_retour_effectif).map((e: any) => [
        e.livre_titre ?? "", e.eleve_nom || e.enseignant_nom || "",
        e.date_emprunt, e.date_retour_prevu, e.statut ?? "en_cours",
      ]),
    },
    {
      key: "retards", title: "Retards", desc: "Lecteurs en retard.", filename: "retards-bibliotheque",
      columns: ["Titre", "Emprunteur", "Retour prévu", "Jours de retard"],
      getRows: () => emprunts.filter((e: any) => {
        if (e.date_retour_effectif) return false;
        if (!e.date_retour_prevu) return false;
        return new Date(e.date_retour_prevu) < today;
      }).map((e: any) => {
        const jours = Math.ceil((today.getTime() - new Date(e.date_retour_prevu).getTime()) / 86400000);
        return [e.livre_titre ?? "", e.eleve_nom || e.enseignant_nom || "", e.date_retour_prevu, jours];
      }),
    },
    {
      key: "top", title: "Top emprunts", desc: "Classement des ouvrages les plus empruntés.", filename: "top-emprunts",
      columns: ["Titre", "Nombre d'emprunts"],
      getRows: () => {
        const map = new Map<string, number>();
        emprunts.forEach((e: any) => {
          const t = e.livre_titre || "—";
          map.set(t, (map.get(t) ?? 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([t, n]) => [t, n]);
      },
    },
    {
      key: "inventaire", title: "Inventaire physique", desc: "Fiche pour l'inventaire annuel.", filename: "inventaire-bibliotheque",
      columns: ["Titre", "Auteur", "Catégorie", "Exemplaires", "Disponibles", "Localisation"],
      getRows: () => livres.map((l: any) => [l.titre, l.auteur ?? "", l.categorie ?? "", l.nombre_exemplaires ?? 0, l.exemplaires_disponibles ?? 0, l.emplacement ?? ""]),
    },
  ];

  return (
    <SettingsSection title="Rapports & exports" description="CSV · Excel · PDF." icon={<FileText className="h-5 w-5" />} hideSave>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((r) => (
          <Card key={r.key} className="border shadow-[var(--shadow-card)]">
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-sm">{r.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              </div>
              <ReportExportButtons
                title={r.title}
                filename={r.filename}
                columns={r.columns}
                getRows={r.getRows}
                ecole={ecole}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
