import { ScrollText, Search, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";

type Log = {
  id: string; created_at: string; user_label: string | null;
  action: string; cible: string | null; niveau: string;
};

const levelStyles: Record<string, string> = {
  info: "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};
const levelLabels: Record<string, string> = {
  info: "Info", success: "Succès", warning: "Attention", danger: "Critique",
};

export default function ActivityLogs() {
  const { ecoleId, loading: loadingId } = useEcoleId();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  useEffect(() => {
    if (!ecoleId) { if (!loadingId) setLoading(false); return; }
    supabase.from("audit_logs")
      .select("id, created_at, user_label, action, cible, niveau")
      .eq("ecole_id", ecoleId)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!error && data) setLogs(data as Log[]);
        setLoading(false);
      });
  }, [ecoleId, loadingId]);

  const filtered = useMemo(() => logs.filter(l => {
    if (filterLevel !== "all" && l.niveau !== filterLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.action + " " + (l.cible ?? "") + " " + (l.user_label ?? "")).toLowerCase().includes(q);
    }
    return true;
  }), [logs, search, filterLevel]);

  const exportCSV = () => {
    const rows = [["Date", "Utilisateur", "Action", "Cible", "Niveau"]];
    filtered.forEach(l => rows.push([
      new Date(l.created_at).toLocaleString("fr-FR"),
      l.user_label ?? "", l.action, l.cible ?? "", l.niveau,
    ]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `journal-activite-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <SettingsSection
      title="Journal d'activité"
      description="Historique des actions effectuées sur la plateforme."
      icon={<ScrollText className="h-5 w-5" />}
      hideSave
    >
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher dans les logs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="warning">Attention</SelectItem>
            <SelectItem value="danger">Critique</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="h-4 w-4" />Exporter
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Niveau</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">Aucune activité enregistrée pour le moment.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.user_label ?? "—"}</TableCell>
                  <TableCell className="text-sm">{l.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.cible ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={levelStyles[l.niveau] ?? levelStyles.info}>
                      {levelLabels[l.niveau] ?? l.niveau}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsSection>
  );
}
