import { ShieldCheck, Smartphone, KeyRound, LogOut, Globe } from "lucide-react";
import { SettingsSection, FieldRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sessions = [
  { device: "MacBook Pro — Safari", location: "Yaoundé, CM", date: "Aujourd'hui à 09:42", current: true },
  { device: "iPhone 15 — App mobile", location: "Yaoundé, CM", date: "Hier à 18:15", current: false },
  { device: "Windows — Chrome", location: "Douala, CM", date: "Il y a 3 jours", current: false },
];

export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Mot de passe"
        description="Modifiez votre mot de passe régulièrement pour plus de sécurité."
        icon={<KeyRound className="h-5 w-5" />}
      >
        <FieldRow label="Mot de passe actuel"><Input type="password" placeholder="••••••••" /></FieldRow>
        <FieldRow label="Nouveau mot de passe" hint="Min. 12 caractères, 1 majuscule, 1 chiffre, 1 symbole">
          <Input type="password" placeholder="••••••••" />
        </FieldRow>
        <FieldRow label="Confirmer"><Input type="password" placeholder="••••••••" /></FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Authentification à deux facteurs (2FA)"
        description="Ajoutez une couche de sécurité supplémentaire à votre compte."
        icon={<Smartphone className="h-5 w-5" />}
      >
        <FieldRow label="Activer la 2FA"><Switch /></FieldRow>
        <FieldRow label="2FA obligatoire pour les admins">
          <Switch defaultChecked />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Politique de mot de passe"
        description="Règles appliquées à tous les utilisateurs de la plateforme."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <FieldRow label="Longueur minimale">
          <Input type="number" defaultValue={12} className="w-32" />
        </FieldRow>
        <FieldRow label="Vérifier mots de passe compromis (HIBP)" hint="Refuse les mots de passe ayant fuité">
          <Switch defaultChecked />
        </FieldRow>
        <FieldRow label="Expiration du mot de passe">
          <Select defaultValue="never">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Jamais</SelectItem>
              <SelectItem value="90">Tous les 90 jours</SelectItem>
              <SelectItem value="180">Tous les 6 mois</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Durée de session" hint="Déconnexion automatique après inactivité">
          <Select defaultValue="60">
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="60">1 heure</SelectItem>
              <SelectItem value="480">8 heures</SelectItem>
              <SelectItem value="never">Aucune</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        title="Sessions actives"
        description="Appareils actuellement connectés à votre compte."
        icon={<Globe className="h-5 w-5" />}
        hideSave
      >
        <div className="border rounded-lg divide-y">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {s.device}
                  {s.current && <span className="text-xs text-success font-semibold">• Actuelle</span>}
                </div>
                <div className="text-xs text-muted-foreground">{s.location} • {s.date}</div>
              </div>
              {!s.current && (
                <Button size="sm" variant="ghost" className="text-destructive">
                  <LogOut className="h-4 w-4" />Déconnecter
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-3 text-destructive border-destructive/30 hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />Déconnecter toutes les autres sessions
        </Button>
      </SettingsSection>
    </div>
  );
}
