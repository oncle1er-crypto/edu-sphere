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

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const modeLabel = (m: string) =>
  ({ especes: "Espèces", mobile_money: "Mobile money", virement: "Virement", autre: "Autre" }[m] ?? m);

/**
 * Génère un reçu A5 paysage (210x148 mm) avec :
 *  - Moitié gauche  = SOUCHE (à conserver par l'école)
 *  - Moitié droite  = REÇU  (à remettre à la famille)
 * Séparateur pointillé au centre pour découpe.
 */
export async function generateVacancesRecuA5(data: VacancesRecuData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
  const W = 210;
  const H = 148;
  const half = W / 2;

  const logo = data.ecole.logoUrl ? await loadImage(data.ecole.logoUrl) : null;

  const drawHalf = (xOffset: number, kind: "souche" | "recu") => {
    const pad = 6;
    const x0 = xOffset + pad;
    const innerW = half - pad * 2;

    // Bandeau titre
    pdf.setFillColor(110, 26, 44); // bordeaux
    pdf.rect(xOffset, 0, half, 18, "F");
    pdf.setFillColor(252, 227, 77); // accent jaune
    pdf.rect(xOffset, 18, half, 2, "F");

    // Logo
    if (logo) {
      try {
        const ratio = logo.w / logo.h;
        const h = 12;
        const w = h * ratio;
        pdf.addImage(logo.data, "PNG", x0, 3, w, h);
      } catch { /* noop */ }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(data.ecole.nom.toUpperCase(), xOffset + half / 2, 8, { align: "center", maxWidth: innerW - 20 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    if (data.ecole.devise) pdf.text(data.ecole.devise, xOffset + half / 2, 12, { align: "center" });
    pdf.setFontSize(6.5);
    const contact = [data.ecole.adresse, data.ecole.telephone].filter(Boolean).join(" • ");
    if (contact) pdf.text(contact, xOffset + half / 2, 16, { align: "center", maxWidth: innerW });

    // Titre document
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("REÇU — COURS DE VACANCES", xOffset + half / 2, 27, { align: "center" });
    pdf.setFontSize(8);
    pdf.setTextColor(110, 26, 44);
    pdf.text(kind === "souche" ? "◆ SOUCHE ÉCOLE ◆" : "◆ EXEMPLAIRE FAMILLE ◆", xOffset + half / 2, 32, { align: "center" });

    // Bloc infos
    let y = 40;
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`N° ${data.reference}`, x0, y);
    pdf.text(
      `Date : ${new Date(data.date_paiement).toLocaleDateString("fr-FR")}`,
      xOffset + half - pad, y, { align: "right" }
    );
    y += 6;

    // Cadre élève
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x0, y, innerW, 26, 1.5, 1.5);
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(6.5);
    pdf.text("ÉLÈVE", x0 + 2, y + 4);
    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${data.eleve.nom} ${data.eleve.prenom}`, x0 + 2, y + 10, { maxWidth: innerW - 4 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Classe : ${data.classe}`, x0 + 2, y + 16);
    if (data.eleve.contact_parent) {
      pdf.text(`Contact : ${data.eleve.contact_parent}`, x0 + 2, y + 22);
    }
    y += 30;

    // Bloc paiement
    pdf.setFillColor(248, 244, 236);
    pdf.roundedRect(x0, y, innerW, 32, 1.5, 1.5, "F");
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(6.5);
    pdf.text("PAIEMENT", x0 + 2, y + 4);

    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(8);
    pdf.text("Frais dus :", x0 + 3, y + 10);
    pdf.text(fmt(data.montant_attendu), xOffset + half - pad - 2, y + 10, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(110, 26, 44);
    pdf.setFontSize(10);
    pdf.text("Montant payé :", x0 + 3, y + 17);
    pdf.text(fmt(data.montant_paye), xOffset + half - pad - 2, y + 17, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(8);
    pdf.text("Reste à payer :", x0 + 3, y + 23);
    const restColor: [number, number, number] = data.reste > 0 ? [200, 50, 50] : [20, 130, 60];
    pdf.setTextColor(...restColor);
    pdf.setFont("helvetica", "bold");
    pdf.text(fmt(data.reste), xOffset + half - pad - 2, y + 23, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(7.5);
    pdf.text(`Mode : ${modeLabel(data.mode)}`, x0 + 3, y + 29);
    y += 36;

    if (data.observation) {
      pdf.setFontSize(7);
      pdf.setTextColor(90, 90, 90);
      pdf.text("Obs. : " + data.observation, x0, y, { maxWidth: innerW });
      y += 6;
    }

    // Signature
    const sigY = H - 14;
    pdf.setDrawColor(150, 150, 150);
    pdf.line(x0, sigY, x0 + 35, sigY);
    pdf.line(xOffset + half - pad - 35, sigY, xOffset + half - pad, sigY);
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("Caissier / Cachet", x0, sigY + 3);
    pdf.text(kind === "souche" ? "Signature élève/parent" : "Cachet école", xOffset + half - pad, sigY + 3, { align: "right" });
  };

  drawHalf(0, "souche");
  drawHalf(half, "recu");

  // Séparateur pointillé central
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.setLineWidth(0.3);
  pdf.line(half, 4, half, H - 4);
  pdf.setLineDashPattern([], 0);

  // Petits ciseaux (symbole)
  pdf.setFontSize(6);
  pdf.setTextColor(120, 120, 120);
  pdf.text("✂", half, 3, { align: "center" });
  pdf.text("✂", half, H - 1, { align: "center" });

  return pdf;
}
