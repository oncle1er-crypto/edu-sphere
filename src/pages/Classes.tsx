import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const classes = [
  { id: 1, nom: "6ème A", cycle: "Collège", effectif: 45, enseignantPrincipal: "Touré F." },
  { id: 2, nom: "6ème B", cycle: "Collège", effectif: 42, enseignantPrincipal: "Touré F." },
  { id: 3, nom: "5ème A", cycle: "Collège", effectif: 38, enseignantPrincipal: "Cissé K." },
  { id: 4, nom: "5ème B", cycle: "Collège", effectif: 40, enseignantPrincipal: "Cissé K." },
  { id: 5, nom: "4ème A", cycle: "Collège", effectif: 36, enseignantPrincipal: "Sanogo A." },
  { id: 6, nom: "3ème A", cycle: "Collège", effectif: 44, enseignantPrincipal: "Sidibé A." },
  { id: 7, nom: "3ème B", cycle: "Collège", effectif: 43, enseignantPrincipal: "Sidibé A." },
  { id: 8, nom: "2nde A", cycle: "Lycée", effectif: 50, enseignantPrincipal: "Diarra M." },
  { id: 9, nom: "2nde C", cycle: "Lycée", effectif: 35, enseignantPrincipal: "Diarra M." },
  { id: 10, nom: "1ère S", cycle: "Lycée", effectif: 32, enseignantPrincipal: "Diarra M." },
  { id: 11, nom: "1ère L", cycle: "Lycée", effectif: 28, enseignantPrincipal: "Kouyaté B." },
  { id: 12, nom: "Tle S1", cycle: "Lycée", effectif: 30, enseignantPrincipal: "Sidibé A." },
];

export default function Classes() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Classes</h1>
          <p className="text-sm text-muted-foreground">Gestion des classes et cycles</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Classe
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">{c.nom}</CardTitle>
                  <Badge variant={c.cycle === "Lycée" ? "default" : "secondary"}>
                    {c.cycle}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{c.effectif} élèves</span>
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Responsable: <span className="font-medium text-foreground">{c.enseignantPrincipal}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
