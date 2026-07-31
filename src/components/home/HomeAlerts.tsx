import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AlertRow, HomeOverview } from "@/hooks/useHomeOverview";

interface AlertGroup {
  key: string;
  label: string;
  rows: AlertRow[];
  to: string;
  mod: string;
  actionLabel: string;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;

export function HomeAlerts({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState<AlertGroup | null>(null);
  const a = data.alertes;

  const groups: AlertGroup[] = [
    { key: "impayes", label: "élèves avec impayés (scolarité)", rows: a.impayes, to: "/finances/scolarite", mod: "finances", actionLabel: "Encaisser" },
    { key: "cantine", label: "factures cantine impayées", rows: a.impayesCantine, to: "/cantine/facturation", mod: "cantine", actionLabel: "Encaisser" },
    { key: "transport", label: "factures transport impayées", rows: a.impayesTransport, to: "/transport/facturation", mod: "transport", actionLabel: "Encaisser" },
    { key: "docs", label: "dossiers sans document", rows: a.dossiersIncomplets, to: "/eleves/documents", mod: "eleves", actionLabel: "Compléter" },
    { key: "reservations", label: "tenues réservées à retirer", rows: a.tenuesReservees, to: "/services-ponctuels/ventes-tenues", mod: "services_ponctuels", actionLabel: "Retirer" },
    { key: "stocks", label: "stocks de tenues bas", rows: a.stocksBas, to: "/services-ponctuels/stocks", mod: "services_ponctuels", actionLabel: "Réapprovisionner" },
  ].filter((g) => g.rows.length > 0 && can(g.mod, "view"));

  return (
    <div className="rounded-xl border bg-card/70 backdrop-blur-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Alertes &amp; tâches</h3>
      </div>

      {groups.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-1">
          <CheckCircle2 className="h-4 w-4 text-success" /> Tout est à jour.
        </p>
      ) : (
        <ul className="divide-y">
          {groups.slice(0, 6).map((g) => (
            <li key={g.key}>
              <button
                type="button"
                onClick={() => setOpen(g)}
                className="w-full flex items-center justify-between gap-2 py-2 text-sm text-left hover:text-primary transition-colors"
              >
                <span className="truncate">
                  <span className="font-bold text-primary">{g.rows.length}</span> {g.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                          onClick={() => { navigate(open.to); setOpen(null); }}
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
