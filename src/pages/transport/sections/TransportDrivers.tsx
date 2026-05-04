import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { UserCog, Plus, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const drivers = [
  { nom: "Keita Bakary", permis: "D — valide", expiration: "03/2028", ligne: "A", anciennete: "6 ans", statut: "Actif" },
  { nom: "Sissoko Drissa", permis: "D — valide", expiration: "11/2027", ligne: "B", anciennete: "9 ans", statut: "Actif" },
  { nom: "Dembélé Moussa", permis: "D — valide", expiration: "07/2026", ligne: "C", anciennete: "4 ans", statut: "Actif" },
  { nom: "Diakité Amadou", permis: "D — valide", expiration: "12/2026", ligne: "D", anciennete: "7 ans", statut: "Congé" },
  { nom: "Ndour Cheikh", permis: "D — valide", expiration: "02/2028", ligne: "E", anciennete: "2 ans", statut: "Actif" },
];

const getInitials = (nom: string) => {
  const parts = nom.split(" ");
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
};

type ViewMode = "list" | "grid";

export default function TransportDrivers() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [viewDriver, setViewDriver] = useState<typeof drivers[0] | null>(null);

  return (
    <SettingsSection
      title="Chauffeurs"
      description="Personnel de conduite et validité des permis."
      icon={<UserCog className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-between items-center">
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter un chauffeur</Button>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {drivers.map((d, i) => (
            <Card
              key={i}
              className="p-3 flex flex-col items-center text-center gap-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewDriver(d)}
            >
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">{getInitials(d.nom)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm truncate w-full">{d.nom}</p>
              <p className="text-xs text-muted-foreground">Ligne {d.ligne}</p>
              <Badge variant={d.statut === "Actif" ? "default" : "secondary"} className="text-[10px]">{d.statut}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Permis</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-center">Ligne</TableHead>
              <TableHead>Ancienneté</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d, i) => (
              <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewDriver(d)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{getInitials(d.nom)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{d.nom}</span>
                  </div>
                </TableCell>
                <TableCell>{d.permis}</TableCell>
                <TableCell className="text-muted-foreground">{d.expiration}</TableCell>
                <TableCell className="text-center">{d.ligne}</TableCell>
                <TableCell>{d.anciennete}</TableCell>
                <TableCell><Badge variant={d.statut === "Actif" ? "default" : "secondary"}>{d.statut}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!viewDriver} onOpenChange={(o) => !o && setViewDriver(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Fiche chauffeur</DialogTitle></DialogHeader>
          {viewDriver && (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{getInitials(viewDriver.nom)}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{viewDriver.nom}</h3>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Permis</span><span>{viewDriver.permis}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expiration</span><span>{viewDriver.expiration}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ligne</span><span>{viewDriver.ligne}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ancienneté</span><span>{viewDriver.anciennete}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Statut</span><Badge variant={viewDriver.statut === "Actif" ? "default" : "secondary"}>{viewDriver.statut}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
