import { Bell, Mail, MessageSquare, Smartphone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { toast } from "sonner";

const CHANNELS = [
  { id: "email", icon: Mail, label: "Email", desc: "Via SMTP intégré", badge: "Recommandé" },
  { id: "sms", icon: Smartphone, label: "SMS", desc: "Via YellikaSMS" },
  { id: "push", icon: Bell, label: "Notifications push", desc: "Application mobile" },
  { id: "whatsapp", icon: Send, label: "WhatsApp", desc: "Via WhatsApp Business API", badge: "Bientôt" },
  { id: "inapp", icon: MessageSquare, label: "Messagerie interne", desc: "Tableau de bord parents/élèves" },
];

const EVENTS = [
  { id: "inscription", label: "Inscription d'un nouvel élève" },
  { id: "paiement", label: "Paiement reçu" },
  { id: "rappel_paiement", label: "Rappel de paiement (J-3)" },
  { id: "absence", label: "Absence de l'élève" },
  { id: "bulletin", label: "Bulletin disponible" },
  { id: "convocation", label: "Convocation parents" },
  { id: "note", label: "Note publiée" },
  { id: "annonce", label: "Annonce générale" },
];

const DEFAULTS = {
  canaux: { email: true, sms: true, push: false, whatsapp: false, inapp: true } as Record<string, boolean>,
  evenements: Object.fromEntries(EVENTS.map(e => [e.id, true])) as Record<string, boolean>,
  smtp_from_email: "no-reply@laprovidence.ci",
  smtp_from_name: "Groupe Scolaire La Providence",
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  silence_de: "21:00",
  silence_a: "07:00",
};

export default function NotificationSettings() {
  const { ecoleId, loading: loadingId } = useEcoleId();
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoleId) { if (!loadingId) setLoading(false); return; }
    supabase.from("parametres_notifications").select("*").eq("ecole_id", ecoleId).maybeSingle()
      .then(({ data: row }) => {
        if (row) setData({
          canaux: { ...DEFAULTS.canaux, ...(row.canaux as Record<string, boolean>) },
          evenements: { ...DEFAULTS.evenements, ...(row.evenements as Record<string, boolean>) },
          smtp_from_email: row.smtp_from_email ?? "",
          smtp_from_name: row.smtp_from_name ?? "",
          smtp_host: row.smtp_host ?? "",
          smtp_port: row.smtp_port ?? 587,
          smtp_user: row.smtp_user ?? "",
          silence_de: (row.silence_de ?? "21:00").slice(0, 5),
          silence_a: (row.silence_a ?? "07:00").slice(0, 5),
        });
        setLoading(false);
      });
  }, [ecoleId, loadingId]);

  const update = (patch: Partial<typeof DEFAULTS>) => setData(d => ({ ...d, ...patch }));

  const handleSave = async () => {
    if (!ecoleId) return;
    const { error } = await supabase.from("parametres_notifications")
      .upsert({ ecole_id: ecoleId, ...data }, { onConflict: "ecole_id" });
    if (error) toast.error(error.message);
    else toast.success("Préférences de notifications enregistrées");
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Canaux de communication"
        description="Activez les canaux pour communiquer avec parents et élèves."
        icon={<Bell className="h-5 w-5" />}
        onSave={handleSave}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNELS.map((c) => (
            <Card key={c.id} className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-primary">{c.label}</h3>
                    {c.badge && <Badge variant="secondary" className="text-[10px]">{c.badge}</Badge>}
                  </div>
                  <Switch
                    checked={data.canaux[c.id] ?? false}
                    onCheckedChange={v => update({ canaux: { ...data.canaux, [c.id]: v } })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Configuration SMTP"
        description="Serveur d'envoi des emails."
        icon={<Mail className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="Adresse expéditeur"><Input value={data.smtp_from_email} onChange={e => update({ smtp_from_email: e.target.value })} /></FieldRow>
        <FieldRow label="Nom expéditeur"><Input value={data.smtp_from_name} onChange={e => update({ smtp_from_name: e.target.value })} /></FieldRow>
        <FieldRow label="Serveur SMTP"><Input value={data.smtp_host} onChange={e => update({ smtp_host: e.target.value })} placeholder="smtp.gmail.com" /></FieldRow>
        <FieldRow label="Port"><Input type="number" value={data.smtp_port} onChange={e => update({ smtp_port: parseInt(e.target.value) || 587 })} className="w-32" /></FieldRow>
        <FieldRow label="Utilisateur SMTP"><Input value={data.smtp_user} onChange={e => update({ smtp_user: e.target.value })} /></FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Événements & déclencheurs"
        description="Choisissez quels événements génèrent une notification automatique."
        icon={<Bell className="h-5 w-5" />}
        onSave={handleSave}
      >
        <div className="border rounded-lg divide-y">
          {EVENTS.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3">
              <div className="font-medium text-sm">{e.label}</div>
              <Switch
                checked={data.evenements[e.id] ?? false}
                onCheckedChange={v => update({ evenements: { ...data.evenements, [e.id]: v } })}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Heures de silence"
        description="Aucune notification SMS/Push ne sera envoyée pendant ces plages."
        icon={<Bell className="h-5 w-5" />}
        onSave={handleSave}
      >
        <FieldRow label="De"><Input type="time" value={data.silence_de} onChange={e => update({ silence_de: e.target.value })} className="w-40" /></FieldRow>
        <FieldRow label="À"><Input type="time" value={data.silence_a} onChange={e => update({ silence_a: e.target.value })} className="w-40" /></FieldRow>
      </SettingsSection>
    </div>
  );
}
