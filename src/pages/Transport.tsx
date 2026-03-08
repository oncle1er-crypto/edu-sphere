import { useState } from "react";
import { Plus, Search, Bus, MapPin, Clock, Users, MoreHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const lignes = [
  { id: 1, nom: "Ligne A - Nord", chauffeur: "Keita Bakary", immatriculation: "ML-1234-AB", places: 50, inscrits: 42, depart: "07h00", retour: "17h30" },
  { id: 2, nom: "Ligne B - Sud", chauffeur: "Sissoko Drissa", immatriculation: "ML-5678-CD", places: 45, inscrits: 38, depart: "06h45", retour: "17h30" },
  { id: 3, nom: "Ligne C - Est", chauffeur: "Dembélé Moussa", immatriculation: "ML-9012-EF", places: 50, inscrits: 47, depart: "07h00", retour: "17h45" },
  { id: 4, nom: "Ligne D - Ouest", chauffeur: "Diakité Amadou", immatriculation: "ML-3456-GH", places: 40, inscrits: 35, depart: "06h30", retour: "17h30" },
];

const passagers = [
  { id: 1, nom: "Diallo Aminata", classe: "3ème A", ligne: "Ligne A - Nord", arret: "Marché Central", statut: "Actif" },
  { id: 2, nom: "Traoré Moussa", classe: "6ème B", ligne: "Ligne B - Sud", arret: "Rond-point Sud", statut: "Actif" },
  { id: 3, nom: "Koné Fatou", classe: "Tle S1", ligne: "Ligne C - Est", arret: "Gare routière", statut: "Actif" },
  { id: 4, nom: "Camara Ibrahim", classe: "2nde C", ligne: "Ligne A - Nord", arret: "Pharmacie Nord", statut: "Suspendu" },
  { id: 5, nom: "Bamba Aïcha", classe: "4ème A", ligne: "Ligne D - Ouest", arret: "École primaire", statut: "Actif" },
  { id: 6, nom: "Sangaré Mariam", classe: "1ère L", ligne: "Ligne B - Sud", arret: "Mairie", statut: "Actif" },
  { id: 7, nom: "Coulibaly Seydou", classe: "5ème C", ligne: "Ligne C - Est", arret: "Stade Municipal", statut: "Actif" },
];

export default function Transport() {
  const [search, setSearch] = useState("");

  const filteredPassagers = passagers.filter(
    (p) =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.ligne.toLowerCase().includes(search.toLowerCase()) ||
      p.arret.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Transport Scolaire</h1>
          <p className="text-sm text-muted-foreground">Gestion des lignes de car et des passagers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle Ligne
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Inscrire Élève
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Lignes actives" value="4" icon={MapPin} color="primary" />
        <StatCard title="Élèves transportés" value="162" change="+12 ce mois" changeType="up" icon={Users} color="accent" />
        <StatCard title="Véhicules" value="4" icon={Bus} color="warning" />
        <StatCard title="Prochain départ" value="07h00" icon={Clock} color="success" />
      </div>

      <Tabs defaultValue="lignes">
        <TabsList>
          <TabsTrigger value="lignes">Lignes & Véhicules</TabsTrigger>
          <TabsTrigger value="passagers">Passagers</TabsTrigger>
        </TabsList>

        <TabsContent value="lignes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lignes.map((l, i) => (
              <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-display">{l.nom}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{l.immatriculation} • {l.chauffeur}</p>
                    </div>
                    <Badge variant="secondary">{l.inscrits}/{l.places} places</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Départ: <span className="font-medium text-foreground">{l.depart}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Retour: <span className="font-medium text-foreground">{l.retour}</span></span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(l.inscrits / l.places) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="passagers" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <CardTitle className="text-base font-display">Passagers ({filteredPassagers.length})</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Rechercher..." className="pl-9 h-9 w-56 bg-muted border-0" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-3.5 w-3.5" /> Filtrer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Ligne</TableHead>
                      <TableHead className="hidden md:table-cell">Arrêt</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPassagers.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{p.nom}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal">{p.classe}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{p.ligne}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.arret}</TableCell>
                        <TableCell>
                          <Badge variant={p.statut === "Actif" ? "default" : "destructive"} className="text-xs">{p.statut}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Changer de ligne</DropdownMenuItem>
                              <DropdownMenuItem>Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Désinscrire</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
