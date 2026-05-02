import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Loader2 } from "lucide-react";
import { useEleves } from "@/hooks/useEleves";

export default function StudentsReregistration() {
  const { eleves, loading } = useEleves();
  const [q, setQ] = useState("");

  const inscrits = eleves.filter((e) => e.statut === "inscrit" || e.statut === "actif");
  const filtered = inscrits.filter(
    (d) =>
      d.nom.toLowerCase().includes(q.toLowerCase()) ||
      d.prenom.toLowerCase().includes(q.toLowerCase()) ||
      d.matricule.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <SettingsSection
      icon={<FileText className="h-5 w-5" />}
      title="Campagne de réinscription"
      description="Suivi du passage à l'année scolaire suivante."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm">Valider la sélection</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe actuelle</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Checkbox /></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.matricule}</TableCell>
                <TableCell className="font-medium">{d.prenom} {d.nom}</TableCell>
                <TableCell><Badge variant="secondary">{d.classe_nom ?? "Non affecté"}</Badge></TableCell>
                <TableCell>
                  <Badge variant={d.statut === "inscrit" || d.statut === "actif" ? "default" : "secondary"}>
                    {d.statut}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun élève trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
