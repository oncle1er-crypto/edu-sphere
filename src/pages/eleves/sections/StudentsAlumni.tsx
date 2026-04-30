import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Search, Download } from "lucide-react";
import { useState } from "react";

const alumni = [
  { id: "ALU-2024-001", nom: "Sissoko Aboubacar", promo: "2023-2024", derniereClasse: "Tle S1", devenir: "Université Bamako - Médecine" },
  { id: "ALU-2024-002", nom: "Diakité Hawa", promo: "2023-2024", derniereClasse: "Tle L", devenir: "ESJ - Journalisme" },
  { id: "ALU-2023-014", nom: "Coulibaly Bakary", promo: "2022-2023", derniereClasse: "Tle ES", devenir: "École de Commerce" },
  { id: "ALU-2023-022", nom: "Touré Aïssata", promo: "2022-2023", derniereClasse: "3ème A", devenir: "Lycée privé Avicenne" },
];

export default function StudentsAlumni() {
  const [q, setQ] = useState("");
  const filtered = alumni.filter(a => a.nom.toLowerCase().includes(q.toLowerCase()) || a.promo.includes(q));

  return (
    <SettingsSection
      icon={<Archive className="h-5 w-5" />}
      title="Anciens élèves"
      description="Archives des promotions et suivi du devenir."
      hideSave
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom ou année..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4" />Exporter</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifiant</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Promotion</TableHead>
              <TableHead>Dernière classe</TableHead>
              <TableHead>Devenir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{a.id}</TableCell>
                <TableCell className="font-medium">{a.nom}</TableCell>
                <TableCell><Badge>{a.promo}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{a.derniereClasse}</Badge></TableCell>
                <TableCell className="text-sm">{a.devenir}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
