import type { EcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";
import { LateNoticeCard } from "./LateNoticeCard";
import type { AvisTextOptions, CategorieAvis, EleveAvisData } from "../lateNotices";

export interface PrintableNotice {
  eleveId: string;
  row: EleveAvisData;
  /** Texte personnalisé pour cet élève, s'il a été édité — cf. LateNotices.tsx. */
  overrideTexte?: string;
}

interface Props {
  ecole: EcoleInfo | null;
  notices: PrintableNotice[];
  categoriesActives: CategorieAvis[];
  options: AvisTextOptions;
}

/**
 * Feuille d'impression — un avis par section, pleine largeur, texte en
 * corps lisible (~13px), en-tête établissement + logo répétés sur chaque
 * avis, séparés par un trait pointillé (ligne de découpe aux ciseaux).
 *
 * Remplace l'ancien format "carte" compacte en grille 2 colonnes (changement
 * demandé le 2026-09-07 — l'ancien format était jugé peu lisible). On garde
 * le même mécanisme d'impression que `CardsPrintQueue.tsx`
 * (`#print-area` + `@media print` masquant le reste de l'UI, `@page A4`),
 * mais la pagination n'est plus calculée manuellement en "planches" : chaque
 * avis a `break-inside: avoid` pour ne jamais être coupé entre deux pages, et
 * le navigateur enchaîne naturellement autant d'avis que la place le permet
 * sur chaque feuille A4 (généralement 2 à 4, selon la longueur du texte).
 */
export function LateNoticesPrintSheet({ ecole, notices, categoriesActives, options }: Props) {
  return (
    <>
      <div id="print-area" className="bg-white mx-auto shadow-md print:shadow-none" style={{ width: "210mm", padding: "15mm" }}>
        {notices.map((n) => (
          <div
            key={n.eleveId}
            className="pb-6 mb-6 border-b border-dashed border-slate-400 last:border-b-0"
            style={{ breakInside: "avoid" }}
          >
            <LateNoticeCard
              ecole={ecole}
              row={n.row}
              categoriesActives={categoriesActives}
              options={options}
              overrideTexte={n.overrideTexte}
            />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
