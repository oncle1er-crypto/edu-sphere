import { useState } from "react";
import { Plus, Search, MoreHorizontal, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const teachers = [
  { id: 1, nom: "Sidibé Amadou", matiere: "Mathématiques", classes: ["3ème A", "3ème B", "Tle S1"], tel: "+223 76 00 11 22", email: "a.sidibe@edu.ml" },
  { id: 2, nom: "Touré Fatoumata", matiere: "Français", classes: ["6ème A", "6ème B", "5ème A"], tel: "+223 66 33 44 55", email: "f.toure@edu.ml" },
  { id: 3, nom: "Diarra Mamadou", matiere: "Physique-Chimie", classes: ["2nde A", "1ère S"], tel: "+223 70 66 77 88", email: "m.diarra@edu.ml" },
  { id: 4, nom: "Sanogo Aïssata", matiere: "Anglais", classes: ["4ème A", "4ème B"], tel: "+223 65 99 00 11", email: "a.sanogo@edu.ml" },
  { id: 5, nom: "Kouyaté Boubacar", matiere: "Histoire-Géo", classes: ["Tle L", "1ère L", "2nde B"], tel: "+223 78 22 33 44", email: "b.kouyate@edu.ml" },
  { id: 6, nom: "Cissé Kadiatou", matiere: "SVT", classes: ["6ème C", "5ème B", "4ème C"], tel: "+223 69 55 66 77", email: "k.cisse@edu.ml" },
];

export default function Enseignants() {
  const [search, setSearch] = useState("");

  const filtered = teachers.filter(
    (t) =>
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.matiere.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Enseignants</h1>
          <p className="text-sm text-muted-foreground">Gérer le corps enseignant</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel Enseignant
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un enseignant..."
          className="pl-9 bg-muted border-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {t.nom.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">{t.nom}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs font-normal">{t.matiere}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Voir profil</DropdownMenuItem>
                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {t.classes.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs font-normal">{c}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{t.tel}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{t.email}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
