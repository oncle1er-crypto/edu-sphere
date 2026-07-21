import { SettingsSection } from "@/components/settings/SettingsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShieldCheck, Lock, Unlock, FileCheck2, CalendarClock } from "lucide-react";
import { usePeriodesAvecBulletins } from "@/hooks/useBulletinsAudit";

const statutLabel = (s: string) =>
  s === "verrouillee"
    ? { text: "Verrouillée", variant: "default" as const }
    : s === "en_cours"
    ? { text: "En cours", variant: "secondary" as const }
    : { text: "À venir", variant: "outline" as const };

export default function Validation() {
  const {
    items,
    loading,
    setPeriodeStatut,
    verrouillerBulletinsDePeriode,
    hasAnnee,
  } = usePeriodesAvecBulletins();

  return (
    <SettingsSection
      icon={<ShieldCheck className="h-5 w-5" />}
      title="Validation & verrouillage"
      description="Verrouillez les périodes de saisie pour empêcher toute modification des notes et bulletins."
    >
      <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
        <strong>Verrouillage strict actif :</strong> une fois une période verrouillée, la base de données rejette toute création, modification ou suppression de notes, d'évaluations et de bulletins de cette période. Seul un administrateur peut rouvrir la période pour effectuer une correction exceptionnelle.
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : !hasAnnee ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune année scolaire active. Activez une année dans les paramètres.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune période définie pour cette année scolaire.
          </p>
        ) : (
          items.map(({ periode: p, totalBulletins, lockedBulletins }) => {
            const verrouillee = p.statut === "verrouillee";
            const badge = statutLabel(p.statut);
            return (
              <Card key={p.id} className="border">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        verrouillee
                          ? "bg-accent/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {verrouillee ? <Lock className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{p.nom}</p>
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.debut).toLocaleDateString("fr-FR")} –{" "}
                        {new Date(p.fin).toLocaleDateString("fr-FR")}
                        {" · "}
                        <FileCheck2 className="inline h-3 w-3 mr-1" />
                        {lockedBulletins}/{totalBulletins} bulletin(s) verrouillé(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {totalBulletins > lockedBulletins && (
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        tone="warning"
                        confirmTitle={`Verrouiller ${totalBulletins - lockedBulletins} bulletin(s) ?`}
                        confirmDescription="Les bulletins verrouillés ne pourront plus être modifiés. Un hash PDF pourra être ajouté ultérieurement."
                        confirmLabel="Verrouiller les bulletins"
                        onConfirm={async () => { await verrouillerBulletinsDePeriode(p.id); }}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        Verrouiller bulletins
                      </ConfirmButton>
                    )}
                    <ConfirmButton
                      size="sm"
                      variant="outline"
                      tone={verrouillee ? "warning" : "danger"}
                      confirmTitle={
                        verrouillee
                          ? `Rouvrir la période « ${p.nom} » ?`
                          : `Verrouiller la période « ${p.nom} » ?`
                      }
                      confirmDescription={
                        verrouillee
                          ? "Les enseignants pourront à nouveau saisir des notes dans cette période. Cette action est tracée."
                          : "Plus aucune note ne pourra être saisie sur cette période. Les bulletins déjà émis restent valides."
                      }
                      confirmLabel={verrouillee ? "Rouvrir" : "Verrouiller"}
                      onConfirm={async () => {
                        await setPeriodeStatut(p.id, verrouillee ? "en_cours" : "verrouillee");
                      }}
                    >
                      {verrouillee ? (
                        <>
                          <Unlock className="h-3.5 w-3.5" />
                          Rouvrir
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Verrouiller
                        </>
                      )}
                    </ConfirmButton>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </SettingsSection>
  );
}
