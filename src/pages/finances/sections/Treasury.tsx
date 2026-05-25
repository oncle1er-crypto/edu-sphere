import { Landmark, Plus, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTresorerie } from "@/hooks/useTresorerie";
import { useState } from "react";

export default function Treasury() {
  const { comptes, mouvements, loading, addCompte, addMouvement } = useTresorerie();
  const [openCompte, setOpenCompte] = useState(false);
  const [openMvt, setOpenMvt] = useState(false);
  const [formC, setFormC] = useState({ nom: "", numero: "", type: "banque", solde: "" });
  const [formM, setFormM] = useState({ compte_id: "", libelle: "", montant: "", type: "entree", date_mouvement: new Date().toISOString().slice(0, 10) });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const soldeTotal = comptes.reduce((s, c) => s + c.solde, 0);

  return (
    <div className="space-y-6">
      <SettingsSection title={`Comptes & soldes (${comptes.length})`} description={`Solde consolidé : ${soldeTotal.toLocaleString("fr-FR")} FCFA`} icon={<Landmark className="h-5 w-5" />} hideSave>
        <div className="flex justify-end">
          <Dialog open={openCompte} onOpenChange={setOpenCompte}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Ajouter un compte</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau compte</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nom *</Label><Input value={formC.nom} onChange={(e) => setFormC({ ...formC, nom: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Numéro</Label><Input value={formC.numero} onChange={(e) => setFormC({ ...formC, numero: e.target.value })} /></div>
                  <div><Label>Type</Label>
                    <Select value={formC.type} onValueChange={(v) => setFormC({ ...formC, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banque">Banque</SelectItem>
                        <SelectItem value="caisse">Caisse</SelectItem>
                        <SelectItem value="mobile">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Solde initial (FCFA)</Label><Input type="number" value={formC.solde} onChange={(e) => setFormC({ ...formC, solde: e.target.value })} /></div>
                <Button onClick={async () => { await addCompte({ nom: formC.nom, numero: formC.numero || null, type: formC.type, solde: Number(formC.solde) || 0 }); setFormC({ nom: "", numero: "", type: "banque", solde: "" }); setOpenCompte(false); }} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comptes.map((a) => (
            <Card key={a.id} className="border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{a.type === "banque" ? "Banque" : a.type === "caisse" ? "Caisse" : "Mobile"}</p>
                <p className="text-sm font-semibold mt-1">{a.nom}</p>
                {a.numero && <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{a.numero}</p>}
                <p className="text-xl font-bold font-display text-primary mt-3">{a.solde.toLocaleString("fr-FR")} FCFA</p>
              </CardContent>
            </Card>
          ))}
          {comptes.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucun compte configuré.</p>}
        </div>
      </SettingsSection>

      <SettingsSection title="Mouvements de trésorerie" description="Journal chronologique des entrées et sorties." icon={<Landmark className="h-5 w-5" />} hideSave>
        {comptes.length > 0 && (
          <div className="flex justify-end">
            <Dialog open={openMvt} onOpenChange={setOpenMvt}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" />Nouveau mouvement</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer un mouvement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Compte *</Label>
                    <Select value={formM.compte_id} onValueChange={(v) => setFormM({ ...formM, compte_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>{comptes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Libellé *</Label><Input value={formM.libelle} onChange={(e) => setFormM({ ...formM, libelle: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Montant *</Label><Input type="number" value={formM.montant} onChange={(e) => setFormM({ ...formM, montant: e.target.value })} /></div>
                    <div><Label>Type</Label>
                      <Select value={formM.type} onValueChange={(v) => setFormM({ ...formM, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="entree">Entrée</SelectItem><SelectItem value="sortie">Sortie</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Date</Label><Input type="date" value={formM.date_mouvement} onChange={(e) => setFormM({ ...formM, date_mouvement: e.target.value })} /></div>
                  </div>
                  <Button onClick={async () => { if (!formM.compte_id || !formM.libelle || !formM.montant) return; await addMouvement({ compte_id: formM.compte_id, libelle: formM.libelle, montant: Number(formM.montant), type: formM.type, date_mouvement: formM.date_mouvement }); setFormM({ compte_id: "", libelle: "", montant: "", type: "entree", date_mouvement: new Date().toISOString().slice(0, 10) }); setOpenMvt(false); }} className="w-full">Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead className="text-right">Entrée</TableHead>
                <TableHead className="text-right">Sortie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mouvements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground text-xs">{new Date(m.date_mouvement).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{m.libelle}</TableCell>
                  <TableCell className="text-muted-foreground">{m.compte_nom ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {m.type === "entree" && <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" />{m.montant.toLocaleString("fr-FR")}</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {m.type === "sortie" && <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{m.montant.toLocaleString("fr-FR")}</span>}
                  </TableCell>
                </TableRow>
              ))}
              {mouvements.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun mouvement enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsSection>
    </div>
  );
}
