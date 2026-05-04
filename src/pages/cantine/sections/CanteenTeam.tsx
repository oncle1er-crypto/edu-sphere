import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ChefHat, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const team = [
  { nom: "Mariama Sy", poste: "Chef cuisinier", contrat: "CDI", anciennete: "8 ans", statut: "Actif" },
  { nom: "Ousmane Diatta", poste: "Aide cuisinier", contrat: "CDI", anciennete: "3 ans", statut: "Actif" },
  { nom: "Awa Diop", poste: "Plongeuse", contrat: "CDD", anciennete: "1 an", statut: "Actif" },
  { nom: "Pape Ndiaye", poste: "Magasinier", contrat: "CDI", anciennete: "5 ans", statut: "Congé" },
];

const getInitials = (nom: string) => {
  const parts = nom.split(" ");
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
};

type ViewMode = "list" | "grid";

export default function CanteenTeam() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [viewMember, setViewMember] = useState<typeof team[0] | null>(null);

  return (
    <SettingsSection
      title="Équipe cuisine"
      description="Personnel affecté à la restauration."
      icon={<ChefHat className="h-5 w-5" />}
      hideSave
    >
      <div className="flex justify-end">
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {team.map((t, i) => (
            <Card
              key={i}
              className="p-3 flex flex-col items-center text-center gap-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewMember(t)}
            >
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">{getInitials(t.nom)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm truncate w-full">{t.nom}</p>
              <p className="text-xs text-muted-foreground">{t.poste}</p>
              <Badge variant={t.statut === "Actif" ? "default" : "secondary"} className="text-[10px]">{t.statut}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Ancienneté</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((t, i) => (
              <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewMember(t)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-accent/20 text-accent-foreground">{getInitials(t.nom)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{t.nom}</span>
                  </div>
                </TableCell>
                <TableCell>{t.poste}</TableCell>
                <TableCell>{t.contrat}</TableCell>
                <TableCell>{t.anciennete}</TableCell>
                <TableCell><Badge variant={t.statut === "Actif" ? "default" : "secondary"}>{t.statut}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!viewMember} onOpenChange={(o) => !o && setViewMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Fiche membre</DialogTitle></DialogHeader>
          {viewMember && (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{getInitials(viewMember.nom)}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{viewMember.nom}</h3>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Poste</span><span>{viewMember.poste}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contrat</span><span>{viewMember.contrat}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ancienneté</span><span>{viewMember.anciennete}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Statut</span><Badge variant={viewMember.statut === "Actif" ? "default" : "secondary"}>{viewMember.statut}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
