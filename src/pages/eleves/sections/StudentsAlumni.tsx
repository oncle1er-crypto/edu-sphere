import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Search, Download, Loader2 } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";

export default function StudentsAlumni() {
  const { eleves, loading } = useEleves();
  const [q, setQ] = useState("");

  const alumni = eleves.filter((e) => e.statut === "sorti" || e.statut === "exclu" || e.statut === "transfere");
  const filtered = alumni.filter(
    (a) =>
      a.nom.toLowerCase().includes(q.toLowerCase()) ||
      a.prenom.toLowerCase().includes(q.toLowerCase()) ||
      a.matricule.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<Archive className="h-5 w-5" />}
      title={`Anciens élèves (${filtered.length})`}
      description="Archives des élèves sortis ou transférés."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom, prénom, matricule..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Exporter</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Dernière classe</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{a.matricule}</TableCell>
                <TableCell className="font-medium">{a.prenom} {a.nom}</TableCell>
                <TableCell><Badge variant="secondary">{a.classe_nom ?? "—"}</Badge></TableCell>
                <TableCell><Badge>{a.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucun ancien élève trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
