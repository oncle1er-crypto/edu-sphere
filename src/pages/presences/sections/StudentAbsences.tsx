import { SettingsSection } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX, Search, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { date: "2026-04-29", name: "Awa Diallo", classe: "6ème A", motif: "Maladie", duree: "1 jour", statut: "Justifiée" },
  { date: "2026-04-29", name: "Moussa Camara", classe: "5ème B", motif: "Inconnu", duree: "2h", statut: "Non justifiée" },
  { date: "2026-04-28", name: "Fatou Sow", classe: "3ème A", motif: "RDV médical", duree: "3h", statut: "Justifiée" },
  { date: "2026-04-28", name: "Ibrahima Bah", classe: "Terminale S", motif: "Inconnu", duree: "1 jour", statut: "En attente" },
  { date: "2026-04-27", name: "Mariama Cissé", classe: "4ème C", motif: "Voyage famille", duree: "3 jours", statut: "Justifiée" },
];

export default function StudentAbsences() {
  return (
    <SettingsSection
      icon={<UserX className="h-5 w-5" />}
      title="Absences des élèves"
      description="Historique complet des absences avec leur statut de justification."
    >
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un élève, une classe..." className="pl-9" />
        </div>
        <Button variant="outline"><Filter className="h-4 w-4" /> Filtrer</Button>
        <Button>Nouvelle absence</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{r.date}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.classe}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.motif}</TableCell>
                <TableCell>{r.duree}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      r.statut === "Justifiée"
                        ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                        : r.statut === "Non justifiée"
                        ? "bg-red-500/15 text-red-700 hover:bg-red-500/15"
                        : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"
                    }
                  >
                    {r.statut}
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
