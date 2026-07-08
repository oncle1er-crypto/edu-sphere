import jsPDF from "jspdf";

export interface VacancesRecuData {
  ecole: {
    nom: string;
    sigle?: string;
    devise?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    logoUrl?: string | null;
  };
  reference: string;
  eleve: { nom: string; prenom: string; sexe?: string | null; contact_parent?: string | null };
  classe: string;
  montant_attendu: number;
  montant_paye: number;
  reste: number;
  mode: string;
  date_paiement: string;
  observation?: string | null;
  recu_par?: string;
}

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ data, w: img.width, h: img.height });
        img.onerror = () => resolve(null);
        img.src = data;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// IMPORTANT : `toLocaleString("fr-FR")` insère des espaces insécables fines (U+202F)
// et jsPDF les rend comme un caractère "/" ou une barre — on les remplace par un espace ASCII.
const fmt = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/[\u202F\u00A0]/g, " ")} FCFA`;

const modeLabel = (m: string) =>
  ({ especes: "Espèces", mobile_money: "Mobile money", virement: "Virement", autre: "Autre" }[m] ?? m);

/**
 * Génère un reçu A4 portrait (210×297 mm) avec :
 *  - Moitié haute = SOUCHE (à conserver par l'école)
 *  - Moitié basse = REÇU (à remettre à la famille)
 * Séparateur pointillé horizontal au centre pour découpe.
 */
export async function generateVacancesRecuA5(data: VacancesRecuData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const halfH = H / 2;

  const logo = data.ecole.logoUrl ? await loadImage(data.ecole.logoUrl) : null;

  const drawHalf = (yOffset: number, kind: "souche" | "recu") => {
    const pad = 12;
    const x0 = pad;
    const innerW = W - pad * 2;

    // Bandeau titre
    pdf.setFillColor(110, 26, 44); // bordeaux
    pdf.rect(0, yOffset, W, 24, "F");
    pdf.setFillColor(252, 227, 77); // accent jaune
    pdf.rect(0, yOffset + 24, W, 2.5, "F");

    // Logo à gauche
    let logoRight = pad;
    if (logo) {
      try {
        const ratio = logo.w / logo.h;
        const h = 16;
        const w = h * ratio;
        pdf.addImage(logo.data, "PNG", pad, yOffset + 4, w, h);
        logoRight = pad + w + 4;
      } catch { /* noop */ }
    }

    // Texte titre — décalé pour ne pas chevaucher le logo
    const textCenter = (W + logoRight) / 2;
    const textMaxW = W - logoRight - pad;
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(data.ecole.nom.toUpperCase(), textCenter, yOffset + 10, {
      align: "center", maxWidth: textMaxW,
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    if (data.ecole.devise) {
      pdf.text(data.ecole.devise, textCenter, yOffset + 15, { align: "center", maxWidth: textMaxW });
    }
    pdf.setFontSize(7.5);
    const contact = [data.ecole.adresse, data.ecole.telephone, data.ecole.email].filter(Boolean).join("  •  ");
    if (contact) pdf.text(contact, textCenter, yOffset + 20, { align: "center", maxWidth: textMaxW });

    // Titre document
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("REÇU — COURS DE VACANCES", W / 2, yOffset + 36, { align: "center" });
    pdf.setFontSize(10);
    pdf.setTextColor(110, 26, 44);
    pdf.text(
      kind === "souche" ? "— SOUCHE (à conserver par l'école) —" : "— EXEMPLAIRE FAMILLE —",
      W / 2, yOffset + 43, { align: "center" }
    );

    // Ligne réf / date
    let y = yOffset + 52;
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`N° ${data.reference}`, x0, y);
    pdf.text(
      `Date : ${new Date(data.date_paiement).toLocaleDateString("fr-FR")}`,
      W - pad, y, { align: "right" }
    );
    y += 5;

    // Cadre élève
    const eleveH = 24;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x0, y, innerW, eleveH, 2, 2);
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(8);
    pdf.text("ÉLÈVE", x0 + 3, y + 5);
    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`${data.eleve.nom} ${data.eleve.prenom}`, x0 + 3, y + 12, { maxWidth: innerW - 6 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Classe : ${data.classe}`, x0 + 3, y + 18);
    if (data.eleve.contact_parent) {
      pdf.text(`Contact : ${data.eleve.contact_parent}`, W - pad - 3, y + 18, { align: "right" });
    }
    y += eleveH + 4;

    // Bloc paiement
    const payH = 38;
    pdf.setFillColor(248, 244, 236);
    pdf.roundedRect(x0, y, innerW, payH, 2, 2, "F");
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(8);
    pdf.text("PAIEMENT", x0 + 3, y + 5);

    const labelX = x0 + 4;
    const valX = W - pad - 4;

    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(10);
    pdf.text("Frais dus :", labelX, y + 12);
    pdf.text(fmt(data.montant_attendu), valX, y + 12, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(110, 26, 44);
    pdf.setFontSize(12);
    pdf.text("Montant payé :", labelX, y + 20);
    pdf.text(fmt(data.montant_paye), valX, y + 20, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(10);
    pdf.text("Reste à payer :", labelX, y + 28);
    const restColor: [number, number, number] = data.reste > 0 ? [200, 50, 50] : [20, 130, 60];
    pdf.setTextColor(...restColor);
    pdf.setFont("helvetica", "bold");
    pdf.text(fmt(data.reste), valX, y + 28, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.text(`Mode de paiement : ${modeLabel(data.mode)}`, labelX, y + 34);
    y += payH + 4;

    if (data.observation) {
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      pdf.text("Observation : " + data.observation, x0, y, { maxWidth: innerW });
      y += 6;
    }

    // Signatures
    const sigY = yOffset + halfH - 18;
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.2);
    pdf.line(x0, sigY, x0 + 55, sigY);
    pdf.line(W - pad - 55, sigY, W - pad, sigY);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text("Caissier / Cachet école", x0, sigY + 4);
    pdf.text(
      kind === "souche" ? "Signature élève / parent" : "Reçu par la famille",
      W - pad, sigY + 4, { align: "right" }
    );
  };

  drawHalf(0, "souche");
  drawHalf(halfH, "recu");

  // Séparateur pointillé horizontal central
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.setLineWidth(0.4);
  pdf.line(6, halfH, W - 6, halfH);
  pdf.setLineDashPattern([], 0);

  // Repère de découpe (texte ASCII compatible helvetica)
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("- - - - -  découper ici  - - - - -", W / 2, halfH - 1, { align: "center" });

  return pdf;
}
