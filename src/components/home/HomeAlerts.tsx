import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, ChevronRight, ExternalLink,
  ReceiptText, UtensilsCrossed, Bus, FolderOpen, Shirt, PackageSearch,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AlertRow, HomeOverview } from "@/hooks/useHomeOverview";
import type { LucideIcon } from "lucide-react";

interface AlertGroup {
  key: string;
  label: string;
  rows: AlertRow[];
  to: string;
  mod: string;
  actionLabel: string;
  /** paramètre d'URL utilisé pour ouvrir directement la ligne concernée */
  param?: string;
  icon: LucideIcon;
  desc: string;
  priority: string;
  /** classes de teinte (icône + badge) */
  tint: string;
  badgeTint: string;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;

export function HomeAlerts({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState<AlertGroup | null>(null);
  const a = data.alertes;

  const groups: AlertGroup[] = [
    {
      key: "impayes", label: "élèves avec impayés (scolarité)", rows: a.impayes,
      to: "/finances/impayes", mod: "finances", actionLabel: "Encaisser", param: "eleve",
      icon: ReceiptText, desc: "Élèves avec factures de scolarité en attente de paiement.",
      priority: "Priorité élevée",
      tint: "bg-destructive/10 text-destructive",
      badgeTint: "bg-destructive/10 text-destructive",
    },
    {
      key: "cantine", label: "factures cantine impayées", rows: a.impayesCantine,
      to: "/cantine/facturation", mod: "cantine", actionLabel: "Encaisser", param: "facture",
      icon: UtensilsCrossed, desc: "Factures de cantine non réglées.",
      priority: "Priorité moyenne",
      tint: "bg-[hsl(28_85%_50%)]/12 text-[hsl(28_85%_38%)]",
      badgeTint: "bg-[hsl(28_85%_50%)]/12 text-[hsl(28_85%_38%)]",
    },
    {
      key: "transport", label: "factures transport impayées", rows: a.impayesTransport,
      to: "/transport/facturation", mod: "transport", actionLabel: "Encaisser", param: "facture",
      icon: Bus, desc: "Factures de transport non réglées.",
      priority: "Priorité moyenne",
      tint: "bg-[hsl(28_85%_50%)]/12 text-[hsl(28_85%_38%)]",
      badgeTint: "bg-[hsl(28_85%_50%)]/12 text-[hsl(28_85%_38%)]",
    },
    {
      key: "docs", label: "dossiers sans document", rows: a.dossiersIncomplets,
      to: "/eleves/documents", mod: "eleves", actionLabel: "Compléter", param: "eleve",
      icon: FolderOpen, desc: "Dossiers élèves incomplets (documents manquants).",
      priority: "À compléter",
      tint: "bg-[hsl(45_90%_50%)]/15 text-[hsl(40_85%_35%)]",
      badgeTint: "bg-[hsl(45_90%_50%)]/15 text-[hsl(40_85%_35%)]",
    },
    {
      key: "reservations", label: "tenues réservées à retirer", rows: a.tenuesReservees,
      to: "/services-ponctuels/ventes-tenues", mod: "services_ponctuels", actionLabel: "Retirer", param: "vente",
      icon: Shirt, desc: "Réservations de tenues en attente de retrait.",
      priority: "À surveiller",
      tint: "bg-[hsl(262_60%_55%)]/12 text-[hsl(262_50%_45%)]",
      badgeTint: "bg-[hsl(262_60%_55%)]/12 text-[hsl(262_50%_45%)]",
    },
    {
      key: "stocks", label: "stocks de tenues bas", rows: a.stocksBas,
      to: "/services-ponctuels/catalogue", mod: "services_ponctuels", actionLabel: "Réapprovisionner",
      icon: PackageSearch, desc: "Articles de tenues scolaires en stock faible.",
      priority: "À surveiller",
      tint: "bg-[hsl(205_80%_42%)]/12 text-[hsl(205_80%_36%)]",
      badgeTint: "bg-[hsl(205_80%_42%)]/12 text-[hsl(205_80%_36%)]",
    },
  ].filter((g) => g.rows.length > 0 && can(g.mod, "view"));

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm md:p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Alertes &amp; tâches prioritaires
        </h3>
      </div>

      {groups.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <CheckCircle2 className="h-4 w-4 text-success" /> Tout est à jour.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.slice(0, 6).map((g) => (
            <li key={g.key}>
              <button
                type="button"
                onClick={() => setOpen(g)}
                className="group w-full flex items-center gap-3 rounded-xl border bg-background/60 p-2.5 text-left transition-all duration-150 hover:border-primary/30 hover:bg-muted/50"
              >
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${g.tint}`}>
                  <g.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-base font-extrabold font-display text-foreground">{g.rows.length}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{g.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.badgeTint}`}>
                      {g.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{g.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display capitalize">
              {open ? `${open.rows.length} ${open.label}` : ""}
            </DialogTitle>
          </DialogHeader>

          {open && (
            <>
              <ScrollArea className="max-h-[55vh] pr-3">
                <ul className="divide-y">
                  {open.rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{r.titre}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.montant !== undefined && r.montant > 0 && (
                          <span className="text-sm font-bold text-primary">{fmt(r.montant)}</span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigate(open.param ? `${open.to}?${open.param}=${encodeURIComponent(r.id)}` : open.to);
                            setOpen(null);
                          }}
                        >
                          {open.actionLabel}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => { navigate(open.to); setOpen(null); }}>
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Ouvrir le module
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
