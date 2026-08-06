import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useAnneeId } from "@/hooks/useAnneeId";
import { useSpStockTenues, type SpGenre } from "../hooks/useSpStockTenues";

interface Draft { stock: string; seuil: string; prix: string }

export default function SpStockTenuesConfig() {
  const { anneeId } = useAnneeId();
  const { classes, loading: lc } = useClasses(anneeId ?? undefined);
  const { loading: ls, upsert, findFor } = useSpStockTenues();
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  const key = (c: string, g: SpGenre) => `${c}::${g}`;

  const getVal = (classe_id: string, g: SpGenre): Draft => {
    const k = key(classe_id, g);
    if (draft[k]) return draft[k];
    const r = findFor(classe_id, g);
    return {
      stock: String(r?.stock_actuel ?? 0),
      seuil: String(r?.seuil_alerte ?? 5),
      prix: r?.prix_unitaire != null ? String(r.prix_unitaire) : "",
    };
  };

  const setVal = (classe_id: string, g: SpGenre, patch: Partial<Draft>) => {
    const k = key(classe_id, g);
    setDraft((d) => ({ ...d, [k]: { ...getVal(classe_id, g), ...patch } }));
  };

  const save = async (classe_id: string, g: SpGenre) => {
    const v = getVal(classe_id, g);
    await upsert({
      classe_id, genre: g,
      stock_actuel: Number(v.stock) || 0,
      seuil_alerte: Number(v.seuil) || 0,
      prix_unitaire: v.prix ? Number(v.prix) : null,
    });
    setDraft((d) => { const n = { ...d }; delete n[key(classe_id, g)]; return n; });
  };

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.nom || "").localeCompare(b.nom || "")),
    [classes],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock de tenues par classe</CardTitle>
        <p className="text-xs text-muted-foreground">
          Renseignez le stock disponible pour chaque classe et chaque genre. Le stock est décrémenté automatiquement à chaque vente.
        </p>
      </CardHeader>
      <CardContent>
        {lc || ls ? <p>Chargement…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead className="w-40">Stock</TableHead>
                <TableHead className="w-28">Seuil alerte</TableHead>
                <TableHead className="w-36">Prix (optionnel)</TableHead>
                <TableHead className="w-24 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.flatMap((c) => (["F", "G"] as SpGenre[]).map((g) => {
                const v = getVal(c.id, g);
                const stock = Number(v.stock) || 0;
                const seuil = Number(v.seuil) || 0;
                const dirty = !!draft[key(c.id, g)];
                return (
                  <TableRow key={key(c.id, g)}>
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    <TableCell>
                      <Badge variant={g === "F" ? "secondary" : "outline"}>{g === "F" ? "Fille" : "Garçon"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} value={v.stock} onChange={(e) => setVal(c.id, g, { stock: e.target.value })} />
                        {stock > 0 && stock <= seuil && <Badge className="bg-orange-500">Faible</Badge>}
                        {stock === 0 && <Badge className="bg-destructive">Rupture</Badge>}
                      </div>
                    </TableCell>
                    <TableCell><Input type="number" min={0} value={v.seuil} onChange={(e) => setVal(c.id, g, { seuil: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" min={0} placeholder="—" value={v.prix} onChange={(e) => setVal(c.id, g, { prix: e.target.value })} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={dirty ? "default" : "ghost"} onClick={() => save(c.id, g)}>
                        <Save className="h-4 w-4 mr-1" /> {dirty ? "Enreg." : "Ok"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
