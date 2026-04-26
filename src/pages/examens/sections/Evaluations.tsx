import { SettingsSection } from "@/components/settings/SettingsSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";

const rows = [
  { id: "EV-101", titre: "Devoir n°3 — Algèbre", classe: "3ème A", matiere: "Maths", coef: 2, date: "12 avril", statut: "Notée" },
  { id: "EV-102", titre: "Interro grammaire", classe: "6ème B", matiere: "Français", coef: 1, date: "15 avril", statut: "Notée" },
  { id: "EV-103", titre: "TP Optique", classe: "1ère D", matiere: "Physique", coef: 2, date: "18 avril", statut: "En saisie" },
  { id: "EV-104", titre: "DM Géométrie", classe: "5ème C", matiere: "Maths", coef: 1, date: "20 avril", statut: "Planifiée" },
  { id: "EV-105", titre: "Compréhension écrite", classe: "Tle A", matiere: "Anglais", coef: 2, date: "22 avril", statut: "Planifiée" },
];

const tone: Record<string, string> = {
  "Notée": "bg-accent/15 text-accent",
  "En saisie": "bg-orange-500/15 text-orange-600",
  "Planifiée": "bg-primary/15 text-primary",
};

export default function Evaluations() {
  return (
    <SettingsSection
      icon={<ClipboardList className='h-5 w-5' />}
      title="Évaluations & devoirs"
      description="Gérez tous les devoirs surveillés, interrogations et travaux pratiques."
      >
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf.</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Matière</TableHead>
              <TableHead>Coef.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium">{r.titre}</TableCell>
                <TableCell>{r.classe}</TableCell>
                <TableCell>{r.matiere}</TableCell>
                <TableCell>{r.coef}</TableCell>
                <TableCell className="text-muted-foreground">{r.date}</TableCell>
                <TableCell><Badge className={tone[r.statut]} variant="secondary">{r.statut}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
