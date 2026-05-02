import { SettingsSection } from "@/components/settings/SettingsSection";
import { Package, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

interface Stock { id: string; produit: string; quantite: number; unite: string | null; seuil_alerte: number; }

export default function CanteenStock() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ produit: "", quantite: "", unite: "kg", seuil_alerte: "10" });

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("stocks_cantine").select("*").eq("ecole_id", ecoleId).order("produit");
    if (data) setStocks(data.map((s: any) => ({ ...s, quantite: Number(s.quantite), seuil_alerte: Number(s.seuil_alerte) })));
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const handleSubmit = async () => {
    if (!ecoleId || !form.produit) return;
    const { error } = await supabase.from("stocks_cantine").insert({ ecole_id: ecoleId, produit: form.produit, quantite: Number(form.quantite) || 0, unite: form.unite, seuil_alerte: Number(form.seuil_alerte) || 10 });
    if (error) { toast.error(error.message); return; }
    toast.success("Stock ajouté");
    setForm({ produit: "", quantite: "", unite: "kg", seuil_alerte: "10" });
    setOpen(false);
    fetch();
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const getStatut = (s: Stock) => {
    if (s.quantite <= s.seuil_alerte * 0.5) return "Critique";
    if (s.quantite <= s.seuil_alerte) return "Bas";
    return "OK";
  };

  return (
    <SettingsSection title={`Stock (${stocks.length} produits)`} description="Suivi des denrées et alertes de réapprovisionnement." icon={<Package className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Ajouter un produit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau produit en stock</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Produit *</Label><Input value={form.produit} onChange={(e) => setForm({ ...form, produit: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Quantité</Label><Input type="number" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} /></div>
                <div><Label>Unité</Label><Input value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} /></div>
                <div><Label>Seuil alerte</Label><Input type="number" value={form.seuil_alerte} onChange={(e) => setForm({ ...form, seuil_alerte: e.target.value })} /></div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead className="text-center">Quantité</TableHead>
            <TableHead className="text-center">Seuil mini</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((s) => {
            const statut = getStatut(s);
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.produit}</TableCell>
                <TableCell className="text-center">{s.quantite} {s.unite}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.seuil_alerte} {s.unite}</TableCell>
                <TableCell>
                  <Badge variant={statut === "Critique" ? "destructive" : statut === "Bas" ? "secondary" : "default"}>{statut}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {stocks.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucun stock enregistré.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
