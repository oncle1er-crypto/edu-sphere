import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { ReportFilters, ALL_CLASSES, type ReportFiltersValue, formatPeriodeLabel } from "@/components/reports/ReportFilters";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

export default function AttendanceReports() {
  const { ecoleId } = useEcoleId();
  const ecole = useEcoleInfo();
  const [filters, setFilters] = useState<ReportFiltersValue>({ from: "", to: "", classe: ALL_CLASSES });
  const [classesList, setClassesList] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    if (!ecoleId) return;
    supabase.from("classes").select("id, nom").eq("ecole_id", ecoleId).order("nom")
      .then(({ data }) => setClassesList((data ?? []) as any[]));
  }, [ecoleId]);

  const classeFilter = filters.classe && filters.classe !== ALL_CLASSES ? filters.classe : null;
  const defaultFrom = useMemo(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);
  const dateFrom = filters.from || defaultFrom;
  const dateTo = filters.to || null;
  const periodeLabel = formatPeriodeLabel(filters.from, filters.to, `Depuis le ${new Date(defaultFrom).toLocaleDateString("fr-FR")}`);
  const sousTitre = `Période : ${periodeLabel}${classeFilter ? ` · Classe : ${classeFilter}` : ""}`;

  const fetchPresences = async () => {
    let q = supabase.from("presences")
      .select("date_presence, statut, eleves(nom, prenom, matricule), classes(nom)")
      .eq("ecole_id", ecoleId!)
      .gte("date_presence", dateFrom);
    if (dateTo) q = q.lte("date_presence", dateTo);
    const { data } = await q;
    let rows = ((data ?? []) as any[]);
    if (classeFilter) rows = rows.filter((r) => r.classes?.nom === classeFilter);
    return rows;
  };

  const items = [
    {
      key: "registre", title: "Registre mensuel des absences", desc: "Détail jour par jour.",
      filename: "registre-absences",
      columns: ["Date", "Élève", "Matricule", "Classe", "Statut"],
      getRows: async () => {
        const rows = await fetchPresences();
        return rows.filter((r) => r.statut !== "present").map((r: any) => [
          r.date_presence,
          `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
          r.eleves?.matricule ?? "",
          r.classes?.nom ?? "",
          r.statut,
        ]);
      },
    },
    {
      key: "syntheseClasse", title: "Rapport par classe", desc: "Synthèse par classe sur la période.",
      filename: "syntheses-classes",
      columns: ["Classe", "Présents", "Absents", "Retards", "Total pointages"],
      getRows: async () => {
        const rows = await fetchPresences();
        const map = new Map<string, { p: number; a: number; r: number; total: number }>();
        rows.forEach((r: any) => {
          const c = r.classes?.nom ?? "—";
          if (!map.has(c)) map.set(c, { p: 0, a: 0, r: 0, total: 0 });
          const e = map.get(c)!;
          e.total++;
          if (r.statut === "present") e.p++;
          else if (r.statut === "retard") e.r++;
          else e.a++;
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
          .map(([c, v]) => [c, v.p, v.a, v.r, v.total]);
      },
    },
    {
      key: "risque", title: "Liste des élèves à risque", desc: "Élèves > 5 absences non justifiées.",
      filename: "eleves-a-risque",
      columns: ["Matricule", "Élève", "Classe", "Absences"],
      getRows: async () => {
        const rows = await fetchPresences();
        const map = new Map<string, { mat: string; nom: string; classe: string; n: number }>();
        rows.filter((r) => r.statut === "absent").forEach((r: any) => {
          const key = `${r.eleves?.matricule ?? ""}|${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`;
          if (!map.has(key)) map.set(key, {
            mat: r.eleves?.matricule ?? "",
            nom: `${r.eleves?.nom ?? ""} ${r.eleves?.prenom ?? ""}`.trim(),
            classe: r.classes?.nom ?? "",
            n: 0,
          });
          map.get(key)!.n++;
        });
        return Array.from(map.values()).filter((e) => e.n > 5).sort((a, b) => b.n - a.n)
          .map((e) => [e.mat, e.nom, e.classe, e.n]);
      },
    },
    {
      key: "pointage", title: "Pointage personnel enseignants", desc: "Présence du personnel sur la période.",
      filename: "pointage-personnel",
      columns: ["Date", "Enseignant", "Statut", "Heure arrivée", "Heure départ"],
      getRows: async () => {
        let q = supabase.from("presences_personnel" as any)
          .select("date_presence, statut, heure_arrivee, heure_depart, enseignants(nom, prenom)")
          .eq("ecole_id", ecoleId!).gte("date_presence", dateFrom);
        if (dateTo) q = q.lte("date_presence", dateTo);
        const { data, error } = await q;
        if (error) return [];
        return ((data as any) ?? []).map((r: any) => [
          r.date_presence,
          `${r.enseignants?.nom ?? ""} ${r.enseignants?.prenom ?? ""}`.trim(),
          r.statut, r.heure_arrivee ?? "", r.heure_depart ?? "",
        ]);
      },
    },
  ];

  return (
    <SettingsSection
      icon={<ShieldCheck className="h-5 w-5" />}
      title="Rapports & exports"
      description="Documents officiels (CSV · Excel · PDF)."
      hideSave
    >
      <div className="space-y-4">
        <ReportFilters
          value={filters}
          onChange={setFilters}
          classes={classesList.map((c) => c.nom)}
          periodeLabel={periodeLabel}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => (
            <Card key={r.key} className="border">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </div>
                <ReportExportButtons
                  title={r.title}
                  filename={r.filename}
                  columns={r.columns}
                  getRows={r.getRows}
                  ecole={ecole}
                  sousTitre={sousTitre}
                  disabled={!ecoleId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
