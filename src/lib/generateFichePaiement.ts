import jsPDF from "jspdf";
import { fetchLogo, detectFormat } from "@/lib/generateFinanceReports";
import { montantEnLettresFCFA } from "@/lib/nombreEnLettres";

// IMPORTANT: jsPDF's built-in helvetica renders U+202F (narrow no-break space)
// — emitted by Intl fr-FR locale — as "/". Same fix as generateFinanceReports.ts.
const FCFA = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ").replace(/\u00a0/g, " ")} FCFA`;

export interface FichePaiementEcole {
  nom: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  ville?: string | null;
  directeur?: string | null;
  ministere?: string | null;
  drenet?: string | null;
  ddenet?: string | null;
  devise_nationale?: string | null;
  logo_url?: string | null;
  armoiries_url?: string | null;
}

export interface FichePaiementData {
  objet: string;
  beneficiaireNom: string;
  beneficiaireFonction: string;
  periodeService: string;
  montant: number;
}

/**
 * Génère la "fiche de paiement" — attestation de réception d'argent à
 * imprimer, faire signer à la main par le bénéficiaire, puis scanner et
 * joindre à la ligne de dépense (cf. src/pages/finances/sections/Expenses.tsx).
 * Reproduit la structure du modèle papier existant de l'école (en-tête
 * ministériel + armoiries + corps + signatures), avec les informations
 * saisies une fois dans Paramètres > Profil de l'école (SchoolProfile.tsx).
 */
export async function generateFichePaiementPDF(ecole: FichePaiementEcole, data: FichePaiementData) {
  const [logoData, armoiriesData] = await Promise.all([
    fetchLogo(ecole.logo_url),
    fetchLogo(ecole.armoiries_url),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const M = 15;
  const centerX = w / 2;

  // ── En-tête : logo (gauche) / ministère-DRENET-DDENET-école (centre) / armoiries (droite) ──
  let y = 14;
  if (logoData) {
    try { doc.addImage(logoData, detectFormat(logoData), M, y - 2, 18, 18); } catch { /* image non exploitable, on continue sans */ }
  }
  if (armoiriesData) {
    try { doc.addImage(armoiriesData, detectFormat(armoiriesData), w - M - 18, y - 2, 18, 18); } catch { /* idem */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0);
  const centreW = w - 2 * M - 44; // largeur dispo entre logo et armoiries
  if (ecole.ministere) {
    const lignes = doc.splitTextToSize(ecole.ministere.toUpperCase(), centreW);
    doc.text(lignes, centerX, y, { align: "center" });
    y += lignes.length * 4;
  } else {
    y += 4;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const rattachement = [ecole.drenet, ecole.ddenet].filter(Boolean).join(" / ");
  if (rattachement) { doc.text(rattachement.toUpperCase(), centerX, y, { align: "center" }); y += 4; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(ecole.nom.toUpperCase(), centerX, y, { align: "center" });

  // Colonne gauche : coordonnées, sous le logo
  let yLeft = 14 + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80);
  if (ecole.telephone) { doc.text(`Tel : ${ecole.telephone}`, M, yLeft); yLeft += 4; }
  if (ecole.email) { doc.text(`Mail : ${ecole.email}`, M, yLeft); yLeft += 4; }

  // Colonne droite : République + devise nationale, sous les armoiries
  let yRight = 14 + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0);
  doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE", w - M, yRight, { align: "right" });
  yRight += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(ecole.devise_nationale || "Union - Discipline - Travail", w - M, yRight, { align: "right" });

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  // ── Corps du document ──
  let body = Math.max(yLeft, yRight, y) + 18;

  doc.setFontSize(10.5);
  doc.text("A", w - M, body, { align: "right" });
  body += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Monsieur le Directeur", w - M, body, { align: "right" });
  doc.setFont("helvetica", "normal");
  body += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Objet : ${data.objet}`, M, body);
  doc.setFont("helvetica", "normal");
  body += 14;

  const montantLettres = montantEnLettresFCFA(data.montant);
  const paragraphe =
    `Je soussigné(e) ${data.beneficiaireNom} exerçant en qualité de ${data.beneficiaireFonction} ` +
    `au ${ecole.nom} reconnais avoir reçu de l'administration la somme de ${FCFA(data.montant)} ` +
    `(${montantLettres}) au titre du service ${data.periodeService}.`;
  doc.setFontSize(11);
  const lignesParagraphe = doc.splitTextToSize(paragraphe, w - 2 * M);
  doc.text(lignesParagraphe, M, body, { lineHeightFactor: 1.6 });
  body += lignesParagraphe.length * 7 + 16;

  const dateAujourdhui = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  doc.setFont("helvetica", "bold");
  doc.text(`Fait à ${ecole.ville || "____________"}, le ${dateAujourdhui}`, w - M, body, { align: "right" });
  doc.setFont("helvetica", "normal");

  // ── Signatures ──
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = Math.min(body + 45, pageH - 35);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYÉ", M, sigY);
  doc.text("Le DIRECTEUR", w - M - 60, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nom : ${data.beneficiaireNom}`, M, sigY + 7);
  doc.text("Signature", M, sigY + 14);
  if (ecole.directeur) doc.text(ecole.directeur, w - M - 60, sigY + 7);

  doc.setDrawColor(180);
  doc.line(M, sigY + 28, M + 55, sigY + 28);
  doc.line(w - M - 60, sigY + 28, w - M, sigY + 28);

  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(`${ecole.nom} — Document généré, à signer manuellement puis scanner`, M, pageH - 10);

  const safeNom = data.beneficiaireNom.replace(/[\\/?*[\]:]/g, "_").slice(0, 40) || "beneficiaire";
  doc.save(`Fiche_paiement_${safeNom}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
