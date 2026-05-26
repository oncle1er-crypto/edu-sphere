import type { StudentCardData } from "@/pages/cartes/components/StudentIdCard";
import { CARD_W_MM, CARD_H_MM } from "@/pages/cartes/components/StudentIdCard";

/**
 * Capture chaque carte (recto + verso) déjà rendue dans le DOM
 * et assemble un PDF multi-pages au format CR80 portrait.
 *
 * Chaque carte doit avoir 2 noeuds dans le container :
 *   data-card-id="<id>" data-card-side="recto" / "verso"
 */
export async function generateClassCardsPDF(
  container: HTMLElement,
  students: StudentCardData[],
  fileName = "cartes-scolaires.pdf",
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [CARD_W_MM, CARD_H_MM],
  });

  const opts = { scale: 4, backgroundColor: null, useCORS: true, logging: false } as const;
  let first = true;

  for (const s of students) {
    const rectoEl = container.querySelector<HTMLElement>(
      `[data-card-id="${s.id}"][data-card-side="recto"]`,
    );
    const versoEl = container.querySelector<HTMLElement>(
      `[data-card-id="${s.id}"][data-card-side="verso"]`,
    );
    if (!rectoEl || !versoEl) continue;

    const rectoCanvas = await html2canvas(rectoEl, opts);
    const versoCanvas = await html2canvas(versoEl, opts);

    if (!first) pdf.addPage([CARD_W_MM, CARD_H_MM], "portrait");
    first = false;
    pdf.addImage(rectoCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM, undefined, "FAST");
    pdf.addPage([CARD_W_MM, CARD_H_MM], "portrait");
    pdf.addImage(versoCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W_MM, CARD_H_MM, undefined, "FAST");
  }

  pdf.save(fileName);
}
