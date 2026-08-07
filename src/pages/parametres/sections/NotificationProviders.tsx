import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Send, MessageSquare, Smartphone, Mail, AlertTriangle, ExternalLink,
  ShieldCheck, Trash2, Plus, Lock, Loader2, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useSmsConfig } from "@/hooks/useSmsConfig";
import { useZinduaConfig, ZINDUA_INTERVALLE_MIN } from "@/hooks/useZinduaConfig";
import { useNotificationProviders } from "@/hooks/useNotificationProviders";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useEcoleId } from "@/hooks/useEcoleId";
import { envoyerWhatsAppZindua, premierEchec } from "@/lib/sendWhatsAppZindua";
import { SettingsSection } from "@/components/settings/SettingsSection";


function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

export default function NotificationProviders() {
  const { config: smsConfig, loading: smsLoading } = useSmsConfig();
  const {
    config: zindua, loading: zinduaLoading,
    updateConfig, addTestDestinataire, removeTestDestinataire,
  } = useZinduaConfig();
  const { get, volumeMoisTotal, loading: statsLoading } = useNotificationProviders();
  const { isAdmin } = useIsAdmin();

  const [newNumero, setNewNumero] = useState("");
  const [templateOtp, setTemplateOtp] = useState<string | null>(null);

  const yellika = get("yellikasms");
  const zin = get("zindua");

  const yellikaActive = !!smsConfig?.is_active;
  const zinduaChannels = !!zindua?.whatsapp_enabled || !!zindua?.email_enabled;
  const zinduaActive = !!zindua?.enabled && zinduaChannels;
  const zinduaTest = !!zindua?.enabled && !!zindua?.test_mode;
  const activeCount = (yellikaActive ? 1 : 0) + (zinduaActive || zinduaTest ? 1 : 0);

  const yTotal = yellika?.total ?? 0;
  const yFailRate = yTotal > 0 ? ((yellika?.echecs ?? 0) / yTotal) * 100 : 0;

  const quota = zindua?.quota_mensuel ?? 0;
  const used = zin?.moisCourantDecompte ?? 0;
  const quotaPct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const quotaColor =
    quotaPct >= 100 ? "bg-destructive" : quotaPct >= 80 ? "bg-orange-500" : "bg-primary";

  const readOnly = !isAdmin;
  const loading = smsLoading || zinduaLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Bandeau récapitulatif */}
      <Card className="border shadow-[var(--shadow-card)]">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Fournisseurs actifs
            </div>
            <div className="text-2xl font-extrabold font-display text-primary">
              {activeCount} / 2
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Volume du mois (tous fournisseurs)
            </div>
            <div className="text-2xl font-extrabold font-display text-primary">
              {volumeMoisTotal}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Send className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              SMS : YellikaSMS · WhatsApp et e-mail : Zindua
            </p>
          </div>
        </CardContent>
      </Card>

      {readOnly && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Lecture seule</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs peuvent modifier la configuration des fournisseurs.
          </AlertDescription>
        </Alert>
      )}

      {/* ---------------- YellikaSMS ---------------- */}
      <SettingsSection
        title="YellikaSMS"
        description="SMS"
        icon={<MessageSquare className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={yellikaActive ? "default" : "secondary"}>
            {yellikaActive ? "Actif" : "Inactif"}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Smartphone className="h-3 w-3" /> SMS
          </Badge>
          {smsConfig?.whatsapp_enabled && (
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Identifiant expéditeur :{" "}
          <span className="font-mono font-semibold text-foreground">
            {smsConfig?.sender_id || "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCell label="Total" value={yTotal} />
          <StatCell label="Envoyés" value={yellika?.envoyes ?? 0} />
          <StatCell label="Échecs" value={yellika?.echecs ?? 0} />
          <StatCell label="Ce mois" value={yellika?.moisCourant ?? 0} />
        </div>

        {yFailRate > 20 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Taux d'échec élevé ({yFailRate.toFixed(0)} %)</AlertTitle>
            <AlertDescription className="space-y-1">
              {yellika?.derniereErreur && (
                <div className="font-mono text-xs break-all">{yellika.derniereErreur}</div>
              )}
              <div>Vérifiez l'identifiant expéditeur auprès de votre fournisseur</div>
            </AlertDescription>
          </Alert>
        )}

        <Button asChild variant="outline" size="sm">
          <Link to="/parametres/sms">
            Configuration SMS détaillée
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </SettingsSection>

      {/* ---------------- Zindua ---------------- */}
      <SettingsSection
        title="Zindua"
        description="WhatsApp et e-mail"
        icon={<Send className="h-5 w-5" />}
        hideSave
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={zinduaTest ? "outline" : zinduaActive ? "default" : "secondary"}
          >
            {zinduaTest ? "Mode test" : zinduaActive ? "Actif" : "Inactif"}
          </Badge>
          {zindua?.whatsapp_enabled && (
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </Badge>
          )}
          {zindua?.email_enabled && (
            <Badge variant="outline" className="gap-1">
              <Mail className="h-3 w-3" /> E-mail
            </Badge>
          )}
        </div>

        {!zindua && !loading && (
          <p className="text-sm text-muted-foreground">
            Aucune configuration Zindua pour cette école.
          </p>
        )}

        {zindua && (
          <>
            <div className="space-y-3">
              {[
                { key: "enabled" as const, label: "Activation globale", hint: undefined },
                { key: "whatsapp_enabled" as const, label: "WhatsApp", hint: undefined },
                {
                  key: "email_enabled" as const,
                  label: "E-mail",
                  hint: "Nécessite un abonnement Zindua payant",
                },
                { key: "auto_send_enabled" as const, label: "Envoi automatique", hint: undefined },
                { key: "test_mode" as const, label: "Mode test", hint: undefined },
              ].map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold">{row.label}</div>
                    {row.hint && (
                      <div className="text-xs text-muted-foreground">{row.hint}</div>
                    )}
                  </div>
                  <Switch
                    checked={!!zindua[row.key]}
                    disabled={readOnly}
                    onCheckedChange={(v) => updateConfig({ [row.key]: v })}
                  />
                </div>
              ))}
            </div>

            {/* Quota */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Quota mensuel</span>
                <span className="text-muted-foreground">
                  {used} / {quota} messages ce mois
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaColor}`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-otp">Modèle OTP</Label>
                <div className="flex gap-2">
                  <Input
                    id="template-otp"
                    value={templateOtp ?? zindua.template_otp}
                    disabled={readOnly}
                    onChange={(e) => setTemplateOtp(e.target.value)}
                  />
                  {!readOnly && templateOtp !== null && templateOtp !== zindua.template_otp && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await updateConfig({ template_otp: templateOtp.trim() });
                        setTemplateOtp(null);
                      }}
                    >
                      Enregistrer
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cadence">Cadence minimale</Label>
                <Input
                  id="cadence"
                  readOnly
                  value={`${Math.max(zindua.intervalle_min_secondes, ZINDUA_INTERVALLE_MIN)} s`}
                />
                <p className="text-xs text-muted-foreground">
                  15 secondes minimum, imposé par Zindua pour éviter le bannissement WhatsApp
                </p>
              </div>
            </div>

            {/* Liste blanche de test */}
            {zindua.test_mode && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                <div>
                  <div className="text-sm font-semibold">Destinataires de test</div>
                  <p className="text-xs text-muted-foreground">
                    En mode test, seuls ces numéros peuvent recevoir un message.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(zindua.test_destinataires ?? []).length === 0 && (
                    <span className="text-sm text-muted-foreground">Aucun numéro.</span>
                  )}
                  {(zindua.test_destinataires ?? []).map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm font-mono"
                    >
                      {n}
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`Supprimer ${n}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeTestDestinataire(n)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {!readOnly && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="+225 07 07 07 07 07"
                      value={newNumero}
                      onChange={(e) => setNewNumero(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await addTestDestinataire(newNumero);
                        setNewNumero("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCell label="Total" value={zin?.total ?? 0} />
              <StatCell label="Envoyés" value={zin?.envoyes ?? 0} />
              <StatCell label="Échecs" value={zin?.echecs ?? 0} />
              <StatCell label="Ce mois" value={zin?.moisCourant ?? 0} />
            </div>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                La clé API est stockée dans les secrets Supabase (<code>ZINDUA_API_KEY</code>)
                et n'est jamais affichée.
              </AlertDescription>
            </Alert>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
