import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileWarning, Printer, Eye, Pencil, RotateCcw, Loader2, CheckSquare, Square, ArrowLeft,
} from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { HelpBanner } from "@/components/help";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAcademicPeriod } from "@/context/AcademicPeriodContext";
import { useClasses } from "@/hooks/useClasses";
import { useEleves } from "@/hooks/useEleves";
import { isStatutActif } from "@/lib/eleveStatus";
import { useEcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { useFinanceData } from "../useFinanceData";
import { useServiceArrears } from "../hooks/useServiceArrears";
import {
  CATEGORIES_AVIS, CATEGORIE_LABEL_COURT, type CategorieAvis, type EleveAvisData,
  type StatutAvis, buildAvisText, fcfa, statutAvisEleve, totalDu,
} from "../lateNotices";
import { LateNoticesPrintSheet, type PrintableNotice } from "../components/LateNoticesPrintSheet";

const STATUT_BADGE: Record<StatutAvis, { label: string; className: string }> = {
  retard: { label: "En retard", className: "bg-destructive/15 text-destructive border-destructive/30" },
  ajour: { label: "À jour", className: "bg-accent/15 text-primary border-accent/30" },
  non_concerne: { label: "Non concerné", className: "bg-muted text-muted-foreground border-border" },
};

function CategorieCell({ row, categorie, active }: { row: EleveAvisData; categorie: CategorieAvis; active: boolean }) {
  if (!active) return <span className="text-muted-foreground text-xs">—</span>;
  if (!row.concerne[categorie]) {
    const b = STATUT_BADGE.non_concerne;
    return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
  }
  const detail = row.retards[categorie];
  if (detail) {
    return (
      <div>
        <Badge variant="outline" className={STATUT_BADGE.retard.className}>En retard</Badge>
        <p className="text-[11px] text-muted-foreground mt-1">{fcfa(detail.montantDu)} FCFA</p>
      </div>
    );
  }
  return <Badge variant="outline" className={STATUT_BADGE.ajour.className}>À jour</Badge>;
}

export default function LateNotices() {
  const { activeAnnee, loading: periodLoading } = useAcademicPeriod();
  const scopedAnneeId = periodLoading ? "" : (activeAnnee?.id ?? "");
  const { classes, loading: classesLoading } = useClasses(scopedAnneeId);
  const { eleves, loading: elevesLoading } = useEleves(scopedAnneeId);
  const { data: scolariteData, loading: finLoading, ecoleId } = useFinanceData(scopedAnneeId);
  const ecole = useEcoleInfo();

  const [classeId, setClasseId] = useState<string>("");
  const [categories, setCategories] = useState<Set<CategorieAvis>>(new Set(CATEGORIES_AVIS));
  const [includeMontant, setIncludeMontant] = useState(false); // désactivé par défaut — confidentialité
  const [includeEcheance, setIncludeEcheance] = useState(true);
  const [showOnlyLate, setShowOnlyLate] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<EleveAvisData | null>(null);
  const [draftText, setDraftText] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const categoriesActives = useMemo(() => CATEGORIES_AVIS.filter((c) => categories.has(c)), [categories]);
  const serviceCategories = useMemo(
    () => categoriesActives.filter((c): c is "cantine" | "transport" => c === "cantine" || c === "transport"),
    [categoriesActives],
  );
  const { concerne: serviceConcerne, retards: serviceRetards, loading: servicesLoading } =
    useServiceArrears(ecoleId, classeId || null, serviceCategories);

  const classeNom = useMemo(() => classes.find((c) => c.id === classeId)?.nom ?? "", [classes, classeId]);

  const rows: EleveAvisData[] = useMemo(() => {
    if (!classeId) return [];
    const scolariteById = new Map(scolariteData.map((e) => [e.id, e]));

    return eleves
      .filter((e) => e.classe_id === classeId && isStatutActif(e.statut))
      .map((e) => {
        const sco = scolariteById.get(e.id);
        const concerne: EleveAvisData["concerne"] = {};
        const retards: EleveAvisData["retards"] = {};

        if (categories.has("scolarite") && sco && sco.tranches.length > 0) {
          concerne.scolarite = true;
          const retardTranches = sco.tranches.filter((t) => t.statut === "retard");
          if (retardTranches.length > 0) {
            retards.scolarite = {
              montantDu: retardTranches.reduce((s, t) => s + (t.montant - t.paye), 0),
              echeance: retardTranches.reduce(
                (min, t) => (t.echeance < min ? t.echeance : min),
                retardTranches[0].echeance,
              ),
            };
          }
        }
        (["cantine", "transport"] as const).forEach((cat) => {
          if (!categories.has(cat)) return;
          if (serviceConcerne[e.id]?.[cat]) concerne[cat] = true;
          if (serviceRetards[e.id]?.[cat]) retards[cat] = serviceRetards[e.id]![cat];
        });

        return {
          eleveId: e.id,
          matricule: e.matricule ?? "",
          nom: e.nom,
          prenom: e.prenom,
          classe: e.classe_nom ?? classeNom,
          concerne,
          retards,
        } satisfies EleveAvisData;
      });
  }, [classeId, eleves, scolariteData, serviceConcerne, serviceRetards, categories, classeNom]);

  const lateRows = useMemo(
    () => rows.filter((r) => statutAvisEleve(r, categoriesActives) === "retard"),
    [rows, categoriesActives],
  );
  const visibleRows = useMemo(
    () => (showOnlyLate ? lateRows : rows),
    [rows, lateRows, showOnlyLate],
  );

  // Réinitialise sélection/personnalisations quand on change de classe.
  const prevClasseId = useRef(classeId);
  useEffect(() => {
    if (prevClasseId.current !== classeId) {
      prevClasseId.current = classeId;
      setSelected({});
      setTextOverrides({});
      setPreviewOpen(false);
    }
  }, [classeId]);

  // Sélectionne par défaut tout élève en retard nouvellement détecté, sans
  // écraser une désélection manuelle déjà faite pour un élève déjà connu.
  const lateIdsKey = useMemo(() => lateRows.map((r) => r.eleveId).join(","), [lateRows]);
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      let changed = false;
      lateRows.forEach((r) => {
        if (!(r.eleveId in next)) { next[r.eleveId] = true; changed = true; }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lateIdsKey]);

  const selectedCount = useMemo(
    () => lateRows.filter((r) => selected[r.eleveId]).length,
    [lateRows, selected],
  );

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    lateRows.forEach((r) => { next[r.eleveId] = checked; });
    setSelected(next);
  };

  const textFor = (row: EleveAvisData) =>
    textOverrides[row.eleveId] ?? buildAvisText(row, categoriesActives, { includeMontant, includeEcheance });

  const openEditor = (row: EleveAvisData) => {
    setEditing(row);
    setDraftText(textFor(row));
  };
  const saveDraft = () => {
    if (!editing) return;
    setTextOverrides((o) => ({ ...o, [editing.eleveId]: draftText }));
    setEditing(null);
  };
  const resetDraft = () => {
    if (!editing) return;
    setTextOverrides((o) => {
      const next = { ...o };
      delete next[editing.eleveId];
      return next;
    });
    setDraftText(buildAvisText(editing, categoriesActives, { includeMontant, includeEcheance }));
  };

  const notices: PrintableNotice[] = useMemo(
    () =>
      lateRows
        .filter((r) => selected[r.eleveId])
        .map((r) => ({
          eleveId: r.eleveId,
          nomEleve: `${r.prenom} ${r.nom}`,
          classe: r.classe,
          texte: textFor(r),
        })),
    // textFor dépend de textOverrides/categoriesActives/includeMontant/includeEcheance — inclus explicitement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lateRows, selected, textOverrides, categoriesActives, includeMontant, includeEcheance],
  );

  const loading = periodLoading || classesLoading || elevesLoading || finLoading;
  const dataLoading = servicesLoading;

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Avis de retard de paiement"
        description="Générez et imprimez les avis individuels destinés aux parents, pour la scolarité, la cantine et le transport."
        icon={<FileWarning className="h-5 w-5" />}
        hideSave
      >
        <HelpBanner storageKey="finances-avis-retard" title="À quoi sert cette page ?">
          Choisissez une classe : l'application identifie automatiquement les élèves ayant un retard de paiement
          réel (échéance dépassée, solde non couvert par un paiement ou une remise/bourse). Sélectionnez les avis à
          imprimer, puis imprimez plusieurs avis découpables sur une même feuille A4. Aucune donnée de paiement
          n'est modifiée depuis cette page.
        </HelpBanner>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 print:hidden">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Classe</label>
            <Select value={classeId} onValueChange={setClasseId} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeAnnee?.libelle && (
              <p className="text-[11px] text-muted-foreground">Année {activeAnnee.libelle}</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Catégories à contrôler</p>
              <div className="flex flex-wrap gap-4">
                {CATEGORIES_AVIS.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={categories.has(cat)}
                      onCheckedChange={(v) => setCategories((s) => {
                        const next = new Set(s);
                        if (v === true) next.add(cat); else next.delete(cat);
                        return next;
                      })}
                    />
                    {CATEGORIE_LABEL_COURT[cat]}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeMontant} onCheckedChange={(v) => setIncludeMontant(v === true)} />
                Inclure le montant restant
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeEcheance} onCheckedChange={(v) => setIncludeEcheance(v === true)} />
                Inclure la date limite / échéance
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={showOnlyLate} onCheckedChange={(v) => setShowOnlyLate(v === true)} />
                N'afficher que les élèves en retard
              </label>
            </div>
            {includeMontant && (
              <p className="text-[11px] text-amber-600">
                Les avis sont remis aux élèves : le montant apparaîtra sur le papier. Vérifiez que cela respecte les
                règles de confidentialité de votre établissement.
              </p>
            )}
          </div>
        </div>

        {!classeId ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Choisissez une classe pour commencer.</p>
        ) : loading || dataLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
              <p className="text-sm font-semibold">
                {selectedCount} élève{selectedCount !== 1 ? "s" : ""} en retard sélectionné{selectedCount !== 1 ? "s" : ""}
                {" — "}{selectedCount} avis {selectedCount !== 1 ? "seront" : "sera"} imprimé{selectedCount !== 1 ? "s" : ""}
                {lateRows.length !== selectedCount ? ` (sur ${lateRows.length} en retard dans cette classe)` : ""}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>
                  <CheckSquare className="h-4 w-4" />Tout sélectionner
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>
                  <Square className="h-4 w-4" />Tout désélectionner
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto print:hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Scolarité</TableHead>
                    <TableHead>Cantine</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead className="text-right">Total éventuel</TableHead>
                    <TableHead className="text-right">Sélection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => {
                    const statut = statutAvisEleve(row, categoriesActives);
                    return (
                      <TableRow key={row.eleveId}>
                        <TableCell className="font-medium">{row.nom} {row.prenom}</TableCell>
                        <TableCell>{row.classe}</TableCell>
                        <TableCell><CategorieCell row={row} categorie="scolarite" active={categories.has("scolarite")} /></TableCell>
                        <TableCell><CategorieCell row={row} categorie="cantine" active={categories.has("cantine")} /></TableCell>
                        <TableCell><CategorieCell row={row} categorie="transport" active={categories.has("transport")} /></TableCell>
                        <TableCell className="text-right font-semibold">
                          {statut === "retard" ? `${fcfa(totalDu(row, categoriesActives))} FCFA` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {statut === "retard" ? (
                            <Checkbox
                              checked={!!selected[row.eleveId]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [row.eleveId]: v === true }))}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        Aucun élève {showOnlyLate ? "en retard" : ""} dans cette classe pour les catégories sélectionnées 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedCount > 0 && !previewOpen && (
              <div className="flex justify-end print:hidden">
                <Button onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4" />Générer les avis ({selectedCount})
                </Button>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      {previewOpen && (
        <SettingsSection
          title="Aperçu avant impression"
          description={`${notices.length} avis — feuille(s) A4 découpable(s).`}
          icon={<Printer className="h-5 w-5" />}
          hideSave
        >
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              <ArrowLeft className="h-4 w-4" />Retour à la sélection
            </Button>
            <div className="flex gap-2">
              {lateRows.filter((r) => selected[r.eleveId]).map((r) => (
                <Button key={r.eleveId} variant="ghost" size="sm" onClick={() => openEditor(r)} title={`Personnaliser l'avis de ${r.nom}`}>
                  <Pencil className="h-3.5 w-3.5" />{r.nom}
                </Button>
              ))}
            </div>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />Imprimer
            </Button>
          </div>

          <LateNoticesPrintSheet ecole={ecole} notices={notices} parPage={6} />
        </SettingsSection>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personnaliser l'avis — {editing?.nom} {editing?.prenom}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Modification temporaire pour cette impression uniquement — le modèle général n'est pas modifié.
          </p>
          <Textarea rows={10} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetDraft}><RotateCcw className="h-4 w-4" />Réinitialiser au modèle</Button>
            <Button onClick={saveDraft}>Enregistrer pour l'impression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
