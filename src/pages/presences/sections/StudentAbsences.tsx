import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner, StatusLegend, STATUTS_PRESENCE } from "@/components/help";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserX, Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

interface AbsenceRow {
  id: string;
  date_presence: string;
  eleve_nom: string;
  classe_nom: string;
  motif_absence: string | null;
  justifie: boolean | null;
}

export default function StudentAbsences() {
  const { ecoleId } = useEcoleId();
  const [rows, setRows] = useState<AbsenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!ecoleId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("presences")
        .select("id, date_presence, motif_absence, justifie, eleves(nom, prenom), classes(nom)")
        .eq("ecole_id", ecoleId)
        .eq("statut", "absent")
        .order("date_presence", { ascending: false })
        .limit(100);

      if (error) { console.error(error); setLoading(false); return; }
      setRows((data ?? []).map((r: any) => ({
        id: r.id,
        date_presence: r.date_presence,
        eleve_nom: r.eleves ? `${r.eleves.nom} ${r.eleves.prenom}` : "?",
        classe_nom: r.classes?.nom ?? "?",
        motif_absence: r.motif_absence,
        justifie: r.justifie,
      })));
      setLoading(false);
    })();
  }, [ecoleId]);

  const filtered = rows.filter((r) =>
    r.eleve_nom.toLowerCase().includes(search.toLowerCase()) ||
    r.classe_nom.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<UserX className="h-5 w-5" />}
      title="Absences des élèves"
      description="Historique complet des absences avec leur statut de justification."
      hideSave
    >
      <HelpBanner storageKey="presences-absences" title="Suivi des absences">
        Toutes les absences enregistrées. Une absence <strong>justifiée</strong> ne pénalise pas l'élève ; une absence <strong>non justifiée</strong> peut déclencher des sanctions selon le règlement.
      </HelpBanner>
      <StatusLegend items={STATUTS_PRESENCE} />
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un élève, une classe..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{new Date(r.date_presence).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="font-medium">{r.eleve_nom}</TableCell>
                <TableCell>{r.classe_nom}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.motif_absence ?? "Inconnu"}</TableCell>
                <TableCell>
                  <Badge className={
                    r.justifie ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                    : "bg-red-500/15 text-red-700 hover:bg-red-500/15"
                  }>
                    {r.justifie ? "Justifiée" : "Non justifiée"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune absence enregistrée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
