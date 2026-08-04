import { useState } from "react";
import { GraduationCap, Users, Wallet, UserCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import type { HomeOverview } from "@/hooks/useHomeOverview";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "@/hooks/useEcoleId";
import { messageErreurBase } from "@/lib/dbErrorMessages";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const fmtMontant = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : n.toLocaleString("fr-FR");

const fcfa = (v: unknown) => `${Number(v ?? 0).toLocaleString("fr-FR")} FCFA`;

interface SpOperation {
  eleve?: string | null;
  matricule?: string | null;
  montant?: number | string | null;
  mode?: string | null;
  reference?: string | null;
}
interface SpSource {
  source: string;
  libelle: string;
  est_remise?: boolean;
  nb?: number | string | null;
  total?: number | string | null;
  operations?: SpOperation[] | null;
}
interface EncaissementsJour {
  date: string;
  total_encaisse: number | string;
  total_remises: number | string;
  sources: SpSource[];
}

export function HomeQuickStats({ data }: { data: HomeOverview }) {
  const { can } = usePermissions();
  const { ecoleId } = useEcoleId();

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<EncaissementsJour | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const totalEncaisse = Number(detail?.total_encaisse ?? data.encaisseJour);
  const totalRemises = Number(detail?.total_remises ?? data.encaisseRemisesJour ?? 0);

  const ouvrirDetail = async () => {
    setOpen(true);
    if (!ecoleId) {
      setErreur("École introuvable pour cet utilisateur.");
      return;
    }
    setLoading(true);
    setErreur(null);
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { data: res, error } = await supabase.rpc("encaissements_du_jour", {
      _ecole_id: ecoleId,
      _date: isoDate,
    });
    if (error) {
      setErreur(messageErreurBase(error, "Impossible de charger les encaissements du jour."));
      setDetail(null);
    } else {
      setDetail(res as unknown as EncaissementsJour);
    }
    setLoading(false);
  };

  const tiles = [
    {
      label: "Élèves inscrits",
      value: data.totalInscrits.toLocaleString("fr-FR"),
      icon: GraduationCap,
      ring: "bg-primary text-primary-foreground",
      bar: "bg-primary",
      sub: `${data.totalEleves.toLocaleString("fr-FR")} au total (pré-inscrits inclus)`,
    },
    {
      label: "Enseignants",
      value: data.totalEnseignants.toLocaleString("fr-FR"),
      icon: Users,
      ring: "bg-[hsl(205_80%_42%)] text-white",
      bar: "bg-[hsl(205_80%_42%)]",
      sub: "Personnel enseignant actif",
    },
    {
      label: "Encaissé aujourd'hui",
      value: `${fmtMontant(totalEncaisse)} F`,
      icon: Wallet,
      ring: "bg-[hsl(152_55%_36%)] text-white",
      bar: "bg-[hsl(152_55%_36%)]",
      sub: "Total des encaissements",
      sub2: totalRemises > 0 ? `+ ${fmtMontant(totalRemises)} F de remises` : null,
      onOpen: ouvrirDetail,
    },
    {
      label: "Présence du jour",
      value: data.tauxPresence === null ? "—" : `${data.tauxPresence}%`,
      icon: UserCheck,
      ring: "bg-[hsl(28_85%_50%)] text-white",
      bar: "bg-[hsl(28_85%_50%)]",
      sub: data.presencesSaisies === 0 ? "Non saisie" : `${data.presencesSaisies} saisies`,
      action:
        data.presencesSaisies === 0 && can("presences", "view") ? (
          <Link
            to="/presences/appel"
            className="mt-1.5 inline-flex items-center rounded-full border border-[hsl(28_85%_50%)]/40 px-2.5 py-1 text-[11px] font-semibold text-[hsl(28_85%_38%)] transition-colors duration-150 hover:bg-[hsl(28_85%_50%)]/10"
          >
            Faire l'appel
          </Link>
        ) : null,
    },
  ] as Array<{
    label: string; value: string; icon: typeof Wallet; ring: string; bar: string;
    sub?: string | null; sub2?: string | null; action?: React.ReactNode; onOpen?: () => void;
  }>;

  const sources = detail?.sources ?? [];
  const aucune = !loading && !erreur && sources.length === 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            {...(t.onOpen
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: t.onOpen,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      t.onOpen?.();
                    }
                  },
                }
              : {})}
            className={`group relative overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              t.onOpen ? "cursor-pointer hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""
            }`}
          >
            <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
            <div className="flex items-start gap-2.5 pt-1.5">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.ring} shadow-sm`}>
                <t.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground truncate">{t.label}</p>
                <p className="text-xl md:text-2xl font-extrabold font-display text-card-foreground leading-tight truncate">
                  {t.value}
                </p>
              </div>
            </div>
            {t.sub && <p className="mt-1.5 text-[10px] text-muted-foreground line-clamp-2">{t.sub}</p>}
            {t.sub2 && <p className="text-[10px] text-muted-foreground/80">{t.sub2}</p>}
            {t.action}
          </motion.div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Encaissements du jour</DialogTitle>
            <DialogDescription>
              {new Date(detail?.date ?? Date.now()).toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}

          {!loading && erreur && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {erreur}
            </p>
          )}

          {!loading && !erreur && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3">
                  <p className="text-[11px] text-muted-foreground">Total encaissé</p>
                  <p className="text-xl font-extrabold text-[hsl(152_55%_36%)]">{fcfa(totalEncaisse)}</p>
                </div>
                {totalRemises > 0 && (
                  <div className="rounded-xl border bg-muted/40 p-3">
                    <p className="text-[11px] text-muted-foreground">Remises &amp; bourses</p>
                    <p className="text-base font-bold text-muted-foreground">{fcfa(totalRemises)}</p>
                  </div>
                )}
              </div>

              {aucune ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun encaissement enregistré aujourd'hui.
                </p>
              ) : (
                <Accordion type="multiple" className="mt-2">
                  {sources.map((s) => (
                    <AccordionItem
                      key={s.source}
                      value={s.source}
                      className={s.est_remise ? "rounded-lg bg-muted/50 px-2" : ""}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full items-center justify-between gap-3 pr-2">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            {s.libelle}
                            <Badge variant="secondary" className="text-[10px]">{Number(s.nb ?? 0)}</Badge>
                            {s.est_remise && (
                              <span className="text-[10px] font-normal text-muted-foreground">hors caisse</span>
                            )}
                          </span>
                          <span className={`text-sm font-bold ${s.est_remise ? "text-muted-foreground" : "text-foreground"}`}>
                            {fcfa(s.total)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {(s.operations ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucun détail disponible.</p>
                        ) : (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full min-w-[520px] text-xs">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="py-1.5 pr-3 font-medium">Élève</th>
                                  <th className="py-1.5 pr-3 font-medium">Matricule</th>
                                  <th className="py-1.5 pr-3 font-medium">Mode</th>
                                  <th className="py-1.5 pr-3 font-medium">Référence</th>
                                  <th className="py-1.5 text-right font-medium">Montant</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(s.operations ?? []).map((o, idx) => (
                                  <tr key={`${s.source}-${idx}`} className="border-b last:border-0">
                                    <td className="py-1.5 pr-3">{o.eleve ?? "—"}</td>
                                    <td className="py-1.5 pr-3 text-muted-foreground">{o.matricule ?? "—"}</td>
                                    <td className="py-1.5 pr-3">{o.mode ?? "—"}</td>
                                    <td className="py-1.5 pr-3 text-muted-foreground">{o.reference ?? "—"}</td>
                                    <td className="py-1.5 text-right font-semibold">{fcfa(o.montant)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
