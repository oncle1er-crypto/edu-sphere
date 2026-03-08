import { useState } from "react";
import { Plus, Search, UtensilsCrossed, Clock, Users, MoreHorizontal, Filter } from "lucide-react";
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

const menus = [
  { id: 1, jour: "Lundi", entree: "Salade verte", plat: "Riz au poisson", dessert: "Fruit", prix: 500 },
  { id: 2, jour: "Mardi", entree: "Soupe de légumes", plat: "Poulet braisé + frites", dessert: "Yaourt", prix: 500 },
  { id: 3, jour: "Mercredi", entree: "Crudités", plat: "Couscous viande", dessert: "Fruit", prix: 500 },
  { id: 4, jour: "Jeudi", entree: "Salade composée", plat: "Spaghetti bolognaise", dessert: "Gâteau", prix: 500 },
  { id: 5, jour: "Vendredi", entree: "Soupe", plat: "Thiéboudienne", dessert: "Fruit", prix: 500 },
];

const abonnes = [
  { id: 1, nom: "Diallo Aminata", classe: "3ème A", type: "Mensuel", statut: "Actif", fin: "31/03/2026" },
  { id: 2, nom: "Traoré Moussa", classe: "6ème B", type: "Trimestriel", statut: "Actif", fin: "30/06/2026" },
  { id: 3, nom: "Koné Fatou", classe: "Tle S1", type: "Mensuel", statut: "Expiré", fin: "28/02/2026" },
  { id: 4, nom: "Camara Ibrahim", classe: "2nde C", type: "Journalier", statut: "Actif", fin: "08/03/2026" },
  { id: 5, nom: "Bamba Aïcha", classe: "4ème A", type: "Mensuel", statut: "Actif", fin: "31/03/2026" },
  { id: 6, nom: "Coulibaly Seydou", classe: "5ème C", type: "Trimestriel", statut: "Actif", fin: "30/06/2026" },
];

export default function Cantine() {
  const [search, setSearch] = useState("");

  const filteredAbonnes = abonnes.filter(
    (a) =>
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      a.classe.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Cantine</h1>
          <p className="text-sm text-muted-foreground">Gestion des repas et abonnements cantine</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel Abonnement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Abonnés actifs" value="342" change="+18 ce mois" changeType="up" icon={Users} color="primary" />
        <StatCard title="Repas servis (mois)" value="6 840" change="+5% vs Fév" changeType="up" icon={UtensilsCrossed} color="accent" />
        <StatCard title="Revenus cantine" value="1.7M FCFA" change="+8% vs Fév" changeType="up" icon={UtensilsCrossed} color="warning" />
        <StatCard title="Horaire repas" value="12h - 14h" icon={Clock} color="success" />
      </div>

      <Tabs defaultValue="menus">
        <TabsList>
          <TabsTrigger value="menus">Menus de la semaine</TabsTrigger>
          <TabsTrigger value="abonnes">Abonnés</TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {menus.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-base font-display">{m.jour}</CardTitle>
                      <Badge variant="secondary">{m.prix} FCFA</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrée</span>
                        <span className="font-medium">{m.entree}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plat</span>
                        <span className="font-medium">{m.plat}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dessert</span>
                        <span className="font-medium">{m.dessert}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="abonnes" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <CardTitle className="text-base font-display">Abonnés cantine ({filteredAbonnes.length})</CardTitle>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAbonnes.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{a.nom}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal">{a.classe}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{a.type}</TableCell>
                        <TableCell className="text-muted-foreground">{a.fin}</TableCell>
                        <TableCell>
                          <Badge variant={a.statut === "Actif" ? "default" : "destructive"} className="text-xs">{a.statut}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Renouveler</DropdownMenuItem>
                              <DropdownMenuItem>Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
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
