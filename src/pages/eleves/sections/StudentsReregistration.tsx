import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Send, Search } from "lucide-react";
import { useState } from "react";

const data = [
  { id: "ELV-001", nom: "Diallo Aminata", classeAct: "3ème A", classeNext: "2nde C", statut: "En attente", paye: false },
  { id: "ELV-002", nom: "Traoré Moussa", classeAct: "6ème B", classeNext: "5ème B", statut: "Réinscrit", paye: true },
  { id: "ELV-005", nom: "Bamba Aïcha", classeAct: "CM2", classeNext: "6ème A", statut: "En attente", paye: false },
  { id: "ELV-007", nom: "Sangaré Mariam", classeAct: "1ère L", classeNext: "Tle L", statut: "Réinscrit", paye: true },
  { id: "ELV-008", nom: "Keita Oumar", classeAct: "GS", classeNext: "CP", statut: "Refusé", paye: false },
];

export default function StudentsReregistration() {
  const [q, setQ] = useState("");
  const filtered = data.filter(d => d.nom.toLowerCase().includes(q.toLowerCase()) || d.id.toLowerCase().includes(q.toLowerCase()));

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
          <Button variant="outline" size="sm"><Send className="h-4 w-4" />Notifier les parents</Button>
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
              <TableHead>Classe suivante</TableHead>
              <TableHead>Frais payés</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Checkbox /></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.id}</TableCell>
                <TableCell className="font-medium">{d.nom}</TableCell>
                <TableCell><Badge variant="secondary">{d.classeAct}</Badge></TableCell>
                <TableCell><Badge>{d.classeNext}</Badge></TableCell>
                <TableCell>
                  {d.paye
                    ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Payé</Badge>
                    : <Badge variant="destructive">Impayé</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={d.statut === "Réinscrit" ? "default" : d.statut === "Refusé" ? "destructive" : "secondary"}>
                    {d.statut}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
