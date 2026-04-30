import { SettingsSection } from "@/components/settings/SettingsSection";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const lignes = [
  { code: "A", nom: "Nord — Médina", arrets: 8, distance: "14 km", depart: "07h00", retour: "17h30", inscrits: 42, places: 50 },
  { code: "B", nom: "Sud — Yoff", arrets: 7, distance: "11 km", depart: "06h45", retour: "17h30", inscrits: 38, places: 45 },
  { code: "C", nom: "Est — Pikine", arrets: 10, distance: "18 km", depart: "07h00", retour: "17h45", inscrits: 47, places: 50 },
  { code: "D", nom: "Ouest — Almadies", arrets: 6, distance: "9 km", depart: "06h30", retour: "17h30", inscrits: 35, places: 40 },
  { code: "E", nom: "Centre — Plateau", arrets: 5, distance: "7 km", depart: "07h15", retour: "17h15", inscrits: 28, places: 35 },
];

export default function TransportLines() {
  return (
    <SettingsSection
      title="Lignes & circuits"
      description="Trajets desservis et points d'arrêt."
      icon={<MapPin className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nouvelle ligne</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead className="text-center">Arrêts</TableHead>
            <TableHead className="text-center">Distance</TableHead>
            <TableHead>Départ</TableHead>
            <TableHead>Retour</TableHead>
            <TableHead className="text-center">Inscrits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.code}>
              <TableCell><Badge>{l.code}</Badge></TableCell>
              <TableCell className="font-medium">{l.nom}</TableCell>
              <TableCell className="text-center">{l.arrets}</TableCell>
              <TableCell className="text-center">{l.distance}</TableCell>
              <TableCell>{l.depart}</TableCell>
              <TableCell>{l.retour}</TableCell>
              <TableCell className="text-center">{l.inscrits} / {l.places}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
