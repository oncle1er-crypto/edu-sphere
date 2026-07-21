import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useSpTestSessions, type SpTestSession } from "../hooks/useSpTestSessions";

export default function SpTestSessionsConfig() {
  const { sessions, loading, save, remove } = useSpTestSessions();
  const [editing, setEditing] = useState<Partial<SpTestSession> | null>(null);

  const upd = (k: keyof SpTestSession, v: any) => setEditing((f) => ({ ...(f ?? {}), [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Sessions de tests d'entrée</CardTitle>
        <Button size="sm" onClick={() => setEditing({ actif: true, date_test: new Date().toISOString().slice(0, 16) })}>
          <Plus className="h-4 w-4 mr-1" />Nouvelle session
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <p>Chargement…</p> : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session planifiée. Créez-en pour permettre à la secrétaire de rattacher les candidats à une date préconfigurée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & heure</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{new Date(s.date_test).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{s.libelle ?? "—"}</TableCell>
                  <TableCell>{s.capacite ?? "—"}</TableCell>
                  <TableCell>{s.actif ? "Oui" : "Non"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...s, date_test: s.date_test.slice(0, 16) })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer cette session ?")) remove(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier la session" : "Nouvelle session"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date & heure *</Label>
              <Input type="datetime-local" value={editing?.date_test ?? ""} onChange={(e) => upd("date_test", e.target.value)} />
            </div>
            <div>
              <Label>Libellé</Label>
              <Input placeholder="Ex. Session Samedi 12/09" value={editing?.libelle ?? ""} onChange={(e) => upd("libelle", e.target.value)} />
            </div>
            <div>
              <Label>Capacité (nb candidats)</Label>
              <Input type="number" value={editing?.capacite ?? ""} onChange={(e) => upd("capacite", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={editing?.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.actif ?? true} onCheckedChange={(v) => upd("actif", v)} />
              <Label>Actif (proposé dans le formulaire candidat)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button
              disabled={!editing?.date_test}
              onClick={async () => {
                const payload: any = { ...editing };
                if (payload.date_test) payload.date_test = new Date(payload.date_test).toISOString();
                await save(payload);
                setEditing(null);
              }}
            >Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
