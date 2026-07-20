import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSpServices, type SpService } from "../hooks/useSpServices";

export default function SpCatalogue() {
  const { services, loading, save, remove } = useSpServices();
  const [editing, setEditing] = useState<Partial<SpService> | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Catalogue des services</CardTitle>
          <Button size="sm" onClick={() => setEditing({ nom: "", slug: "", prix: 0, actif: true, couleur: "#6E1A2C", icone: "Ticket" })}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau service
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? <p>Chargement…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Partiel</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Restant</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: s.couleur }} />
                        <span className="font-medium">{s.nom}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </TableCell>
                    <TableCell>{Number(s.prix).toLocaleString("fr-FR")} FCFA</TableCell>
                    <TableCell>{s.accepte_partiel ? <Badge>Oui</Badge> : "—"}</TableCell>
                    <TableCell>{s.gere_stock ? <Badge>Oui</Badge> : "—"}</TableCell>
                    <TableCell>{s.gere_stock ? (
                      <Badge variant={s.stock_actuel != null && s.stock_actuel <= 5 ? "destructive" : "secondary"}>
                        {s.stock_actuel ?? 0}
                      </Badge>
                    ) : "—"}</TableCell>
                    <TableCell>{s.actif ? <Badge className="bg-emerald-600">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ce service ?")) remove(s.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier" : "Nouveau"} service</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nom *</Label><Input value={editing.nom ?? ""} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} /></div>
              <div><Label>Slug (identifiant technique) *</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} disabled={!!editing.id} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Prix</Label><Input type="number" value={editing.prix ?? 0} onChange={(e) => setEditing({ ...editing, prix: +e.target.value })} /></div>
                <div><Label>Couleur</Label><Input type="color" value={editing.couleur ?? "#6E1A2C"} onChange={(e) => setEditing({ ...editing, couleur: e.target.value })} /></div>
                <div><Label>Icône (lucide)</Label><Input value={editing.icone ?? "Ticket"} onChange={(e) => setEditing({ ...editing, icone: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded border p-2"><Label>Accepte paiement partiel</Label><Switch checked={editing.accepte_partiel ?? false} onCheckedChange={(v) => setEditing({ ...editing, accepte_partiel: v })} /></div>
              <div className="flex items-center justify-between rounded border p-2"><Label>Gère un stock</Label><Switch checked={editing.gere_stock ?? false} onCheckedChange={(v) => setEditing({ ...editing, gere_stock: v })} /></div>
              {editing.gere_stock && (
                <div><Label>Stock actuel</Label><Input type="number" value={editing.stock_actuel ?? 0} onChange={(e) => setEditing({ ...editing, stock_actuel: +e.target.value })} /></div>
              )}
              <div className="flex items-center justify-between rounded border p-2"><Label>Actif</Label><Switch checked={editing.actif ?? true} onCheckedChange={(v) => setEditing({ ...editing, actif: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button
              disabled={!editing?.nom || !editing?.slug}
              onClick={async () => { if (editing) { await save(editing); setEditing(null); } }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
