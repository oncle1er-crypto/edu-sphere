import type { EcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import {
  CATEGORIE_LABEL_COURT, categoriesEnRetard, categoriesPhrase, earliestEcheance, fcfa, formatDateFr, totalDu,
  type AvisTextOptions, type CategorieAvis, type EleveAvisData,
} from "../lateNotices";

interface Props {
  ecole: EcoleInfo | null;
  row: EleveAvisData;
  categoriesActives: CategorieAvis[];
  options: AvisTextOptions;
  /**
   * Texte personnalisé (cf. "Personnaliser l'avis" dans LateNotices.tsx).
   * S'il est fourni, il remplace entièrement le rendu structuré ci-dessous
   * — on ne peut pas deviner quoi mettre en gras dans un texte librement
   * édité par l'utilisateur.
   */
  overrideTexte?: string;
  className?: string;
}

/**
 * Un avis individuel — format "plein format" en corps de texte lisible
 * (remplace l'ancien format carte compacte en grille 2 colonnes, changement
 * demandé le 2026-09-07). En-tête établissement + logo répétés sur chaque
 * avis. Le nom, la classe et les catégories concernées sont mis en gras
 * dans le corps du texte par défaut (non personnalisé).
 *
 * Confidentialité inchangée : ne jamais ajouter ici de téléphone,
 * d'historique de paiement ou de données d'un autre élève — uniquement
 * nom/prénom, classe et les informations déjà filtrées en amont.
 */
export function LateNoticeCard({ ecole, row, categoriesActives, options, overrideTexte, className }: Props) {
  const nomComplet = `${row.prenom} ${row.nom}`.trim();
  const enRetard = categoriesEnRetard(row, categoriesActives);

  return (
    <div className={`text-slate-900 ${className ?? ""}`}>
      {/*
        En-tête identique à celui des reçus de paiement (cf. `drawCopy` dans
        src/lib/generateDocumentsPDF.ts) : logo à gauche (~16mm de haut),
        nom en gras/majuscules bordeaux, devise en italique entre guillemets,
        puis adresse • téléphone • email — même hiérarchie et mêmes couleurs
        (#6E1A2C / #787880), reprises ici en HTML/CSS. Changement demandé le
        2026-09-07 pour unifier l'en-tête des documents imprimés.
      */}
      <div className="flex items-start gap-3 mb-3">
        {ecole?.logo_url && (
          <img src={ecole.logo_url} alt="" style={{ height: "16mm", width: "auto" }} className="shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <p className="font-serif font-bold uppercase leading-tight" style={{ fontSize: "15px", color: "#6E1A2C" }}>
            {ecole?.nom ?? "Établissement"}
          </p>
          {ecole?.devise && (
            <p className="font-serif italic leading-tight" style={{ fontSize: "11px", color: "#787880" }}>
              « {ecole.devise} »
            </p>
          )}
          {(ecole?.adresse || ecole?.telephone || ecole?.email) && (
            <p className="leading-tight" style={{ fontSize: "10px", color: "#787880" }}>
              {[ecole?.adresse, ecole?.telephone && `Tél : ${ecole.telephone}`, ecole?.email]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-300 mb-4" />

      <h3 className="text-center text-lg font-bold uppercase tracking-wide mb-4">Avis aux parents</h3>

      {overrideTexte ? (
        <p className="whitespace-pre-line text-[13px] leading-relaxed">{overrideTexte}</p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed mb-3">
            Madame, Monsieur, nous vous informons que la situation de paiement de votre enfant{" "}
            <strong>{nomComplet}</strong>, en classe de <strong>{row.classe}</strong>, présente un retard
            concernant : <strong>{categoriesPhrase(row, categoriesActives)}</strong>.
          </p>
          <p className="text-[13px] leading-relaxed">
            Nous vous prions de bien vouloir vous rapprocher de l'administration afin de régulariser la situation
            dans les meilleurs délais. Merci de votre compréhension et de votre collaboration.
          </p>

          {options.includeMontant && enRetard.length > 0 && (
            <div className="mt-3 text-[13px] leading-relaxed">
              {enRetard.map((c) => (
                <p key={c}>
                  {CATEGORIE_LABEL_COURT[c]} : {fcfa(row.retards[c]!.montantDu)} F CFA
                </p>
              ))}
              {enRetard.length > 1 && (
                <p className="font-semibold">Total restant : {fcfa(totalDu(row, categoriesActives))} F CFA</p>
              )}
            </div>
          )}

          {options.includeEcheance && earliestEcheance(row, categoriesActives) && (
            <p className="mt-3 text-[13px] leading-relaxed">
              Échéance dépassée depuis le <strong>{formatDateFr(earliestEcheance(row, categoriesActives)!)}</strong>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
