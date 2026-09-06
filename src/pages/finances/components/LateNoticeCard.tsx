import type { EcoleInfo } from "@/pages/services-ponctuels/hooks/useEcoleInfo";

interface Props {
  ecole: EcoleInfo | null;
  nomEleve: string;
  classe: string;
  texte: string;
  className?: string;
}

/**
 * Un avis individuel — utilisé à la fois pour l'aperçu à l'écran (une
 * carte) et pour la grille d'impression A4 (plusieurs cartes/page, cf.
 * LateNoticesPrintSheet.tsx qui reprend le pattern de CardsPrintQueue.tsx).
 *
 * Confidentialité : ne jamais ajouter ici de téléphone, d'historique de
 * paiement ou de données d'un autre élève — uniquement nom/prénom, classe
 * et le texte de l'avis déjà filtré en amont.
 */
export function LateNoticeCard({ ecole, nomEleve, classe, texte, className }: Props) {
  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-white p-[3mm] text-slate-800 ${className ?? ""}`}>
      <div className="flex items-center gap-[2mm] border-b border-slate-300 pb-[1.5mm]">
        {ecole?.logo_url && (
          <img src={ecole.logo_url} alt="" className="h-[7mm] w-[7mm] shrink-0 object-contain" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[7px] font-bold uppercase tracking-wide text-slate-600">
            {ecole?.nom ?? "Établissement"}
          </p>
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-primary">Avis aux parents</p>
        </div>
      </div>

      <div className="mt-[1.5mm]">
        <p className="text-[9px] font-bold leading-tight">{nomEleve}</p>
        <p className="text-[7.5px] text-slate-500">Classe : {classe}</p>
      </div>

      <p className="mt-[1.5mm] flex-1 whitespace-pre-line text-[7.5px] leading-[1.35] text-slate-700">
        {texte}
      </p>
    </div>
  );
}
