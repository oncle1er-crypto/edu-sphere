import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BellRing, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotificationsParents } from "@/hooks/useNotificationsParents";

export default function ParentNotifications() {
  const { notifications, loading, fetchNotifications } = useNotificationsParents();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const canalBadge = (canal: string) => {
    if (canal === "sms") return <Badge className="bg-primary/15 text-primary hover:bg-primary/15">SMS</Badge>;
    if (canal === "email") return <Badge className="bg-accent/15 text-primary hover:bg-accent/15">Email</Badge>;
    return <Badge variant="outline">{canal}</Badge>;
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<BellRing className="h-5 w-5" />}
        title="Configuration des notifications"
        description="Définir les canaux et messages envoyés en cas d'absence ou retard."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div><p className="font-medium">SMS automatique en cas d'absence</p><p className="text-xs text-muted-foreground">Envoyé après 30 min sans présence</p></div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div><p className="font-medium">Email de récapitulatif hebdomadaire</p><p className="text-xs text-muted-foreground">Tous les vendredis à 18h</p></div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div><p className="font-medium">Notification push (app mobile)</p><p className="text-xs text-muted-foreground">Temps réel pour les parents connectés</p></div>
            <Switch />
          </div>
        </div>

        <FieldRow label="Délai avant envoi (min)"><Input type="number" defaultValue={30} className="w-32" /></FieldRow>
        <FieldRow label="Modèle SMS absence" hint="Variables : {nom}, {classe}, {date}">
          <Textarea rows={3} defaultValue="Bonjour, votre enfant {nom} ({classe}) est absent ce {date}. Merci de justifier l'absence." />
        </FieldRow>
        <FieldRow label="Modèle SMS retard">
          <Textarea rows={3} defaultValue="Votre enfant {nom} ({classe}) est arrivé en retard ce {date}." />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        icon={<Send className="h-5 w-5" />}
        title="Historique des notifications envoyées"
        description="Liste des dernières notifications envoyées aux parents."
        hideSave
      >
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune notification envoyée.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.slice(0, 50).map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(n.date_envoi).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                    <TableCell>{canalBadge(n.canal)}</TableCell>
                    <TableCell className="text-sm">{n.destinataire ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{n.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
