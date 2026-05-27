import { Monitor, Smartphone, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrustedDevices } from "@/hooks/useTrustedDevices";

function deviceIcon(ua: string | null) {
  if (!ua) return <Monitor className="h-4 w-4" />;
  return /mobile|android|iphone|ipad/i.test(ua) ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Appareil inconnu";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Navigateur";
}

export default function TrustedDevices() {
  const { devices, loading, revoke } = useTrustedDevices();

  return (
    <SettingsSection
      title="Appareils approuvés"
      description="Les navigateurs/appareils ayant accédé à votre compte. Révoquez ceux que vous ne reconnaissez pas."
      icon={<ShieldCheck className="h-5 w-5" />}
      hideSave
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucun appareil enregistré.</p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${d.revoked_at ? "opacity-50 border-border/30" : "border-border/60"}`}
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                {deviceIcon(d.user_agent)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{deviceLabel(d.user_agent)}</p>
                  {d.revoked_at && <Badge variant="outline" className="text-xs">Révoqué</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dernière activité : {new Date(d.last_seen_at).toLocaleString("fr-FR")}
                </p>
              </div>
              {!d.revoked_at && (
                <Button size="sm" variant="ghost" onClick={() => revoke(d.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" /> Révoquer
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
