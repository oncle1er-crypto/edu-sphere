import { SettingsSection } from "@/components/settings/SettingsSection";
import { UtensilsCrossed, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

interface Menu { id: string; date_menu: string; repas: string; description: string | null; }

export default function CanteenMenus() {
  const { ecoleId, loading: ecoleLoading } = useEcoleId();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date_menu: new Date().toISOString().slice(0, 10), repas: "dejeuner", description: "" });

  const fetch = useCallback(async () => {
    if (!ecoleId) return;
    const { data } = await supabase.from("menus_cantine").select("*").eq("ecole_id", ecoleId).order("date_menu", { ascending: false }).limit(30);
    if (data) setMenus(data);
    setLoading(false);
  }, [ecoleId]);

  useEffect(() => { if (!ecoleLoading && ecoleId) fetch(); if (!ecoleLoading && !ecoleId) setLoading(false); }, [ecoleLoading, ecoleId, fetch]);

  const handleSubmit = async () => {
    if (!ecoleId || !form.description) return;
    const { error } = await supabase.from("menus_cantine").insert({ ecole_id: ecoleId, date_menu: form.date_menu, repas: form.repas, description: form.description });
    if (error) { toast.error(error.message); return; }
    toast.success("Menu ajouté");
    setForm({ date_menu: new Date().toISOString().slice(0, 10), repas: "dejeuner", description: "" });
    setOpen(false);
    fetch();
  };

  if (loading || ecoleLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 sm:h-8 sm:w-8 animate-spin text-primary" /></div>;

  const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return (
    <SettingsSection title={`Menus (${menus.length})`} description="Composez et publiez les repas servis." icon={<UtensilsCrossed className="h-5 w-5" />} hideSave>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nouveau menu</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un menu</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.date_menu} onChange={(e) => setForm({ ...form, date_menu: e.target.value })} /></div>
                <div><Label>Repas</Label><Input value={form.repas} onChange={(e) => setForm({ ...form, repas: e.target.value })} placeholder="dejeuner" /></div>
              </div>
              <div><Label>Description (entrée, plat, dessert...)</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <Button onClick={handleSubmit} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {menus.map((m) => (
          <Card key={m.id} className="border shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base font-display">{JOURS[new Date(m.date_menu).getDay()]} {new Date(m.date_menu).toLocaleDateString("fr-FR")}</CardTitle>
              <Badge variant="secondary">{m.repas}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground whitespace-pre-line">{m.description ?? "—"}</CardContent>
          </Card>
        ))}
        {menus.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Aucun menu enregistré.</p>}
      </div>
    </SettingsSection>
  );
}
