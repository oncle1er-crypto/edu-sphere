import type jsPDF from "jspdf";

/**
 * Imprime un filigrane rouge en diagonale sur toutes les pages du document,
 * ainsi qu'un bandeau rappelant la date de l'opération. `variant` distingue
 * une simple annulation (comportement historique, inchangé) d'un
 * remboursement effectif — même mécanisme visuel, texte différent, pour que
 * le justificatif imprimé ne prête pas à confusion entre "erreur corrigée"
 * et "argent rendu à la famille".
 */
export function stampCancelled(
  doc: jsPDF,
  dateAnnulation?: string | null,
  variant: "annule" | "rembourse" = "annule",
): void {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  const dateLabel = dateAnnulation
    ? new Date(dateAnnulation).toLocaleDateString("fr-FR")
    : null;
  const label = variant === "rembourse" ? "REMBOURSÉ" : "ANNULÉ";
  const bandeau = variant === "rembourse" ? "REÇU REMBOURSÉ" : "REÇU ANNULÉ";

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Filigrane diagonal
    const gs = (doc as any).GState ? new (doc as any).GState({ opacity: 0.18 }) : null;
    if (gs) (doc as any).setGState(gs);
    doc.setTextColor(200, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(70);
    doc.text(label, W / 2, H / 2, { align: "center", angle: 30 } as any);
    if (gs && (doc as any).GState) (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

    // Bandeau haut
    doc.setFillColor(200, 30, 30);
    doc.rect(0, H / 2 - 6, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      dateLabel ? `${bandeau} — le ${dateLabel}` : bandeau,
      W / 2,
      H / 2 + 2.5,
      { align: "center" },
    );
  }

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
}
