import jsPDF from "jspdf";

export interface VieScolaireEcole {
  nom: string;
  sigle?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  devise?: string | null;
  ville?: string | null;
  directeur?: string | null;
}

export interface VieScolaireSujet {
  nom: string;
  prenom: string;
  matricule?: string | null;
  classe?: string | null;
  type: "eleve" | "enseignant" | "personnel";
}

export interface BilletPDFData {
  ecole: VieScolaireEcole;
  sujet: VieScolaireSujet;
  numero: string;
  motif: string;
  date_sortie: string;
  heure_sortie: string;
  heure_retour_prevue?: string | null;
  accompagnateur?: string | null;
  destination?: string | null;
  observations?: string | null;
  delivre_par_nom?: string | null;
}

export interface CertificatPDFData {
  ecole: VieScolaireEcole;
  sujet: VieScolaireSujet;
  numero: string;
  date_debut: string;
  date_fin: string;
  motif: string;
  justifie: boolean;
  type_justificatif?: string | null;
  observations?: string | null;
  delivre_par_nom?: string | null;
}

const monthsFR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${monthsFR[d.getMonth()]} ${d.getFullYear()}`;
};

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

const PRIMARY: [number, number, number] = [110, 26, 44];
const ACCENT: [number, number, number] = [252, 227, 77];
const INK: [number, number, number] = [40, 40, 45];
const MUTED: [number, number, number] = [120, 120, 128];

async function drawHeader(doc: jsPDF, ecole: VieScolaireEcole, ref: string, label: string) {
  const W = doc.internal.pageSize.getWidth();
  const logo = ecole.logoUrl ? await loadImage(ecole.logoUrl) : null;

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 32, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 32, W, 2, "F");

  if (logo) { try { doc.addImage(logo, "PNG", 14, 5, 22, 22); } catch {} }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(ecole.nom.toUpperCase(), logo ? 40 : 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const sub = [ecole.sigle, ecole.adresse, ecole.telephone].filter(Boolean).join(" • ");
  if (sub) doc.text(sub, logo ? 40 : 14, 20);
  if (ecole.devise) {
    doc.setFont("helvetica", "italic");
    doc.text(`« ${ecole.devise} »`, logo ? 40 : 14, 25);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${ref}`, W - 14, 14, { align: "right" });
  doc.text(label, W - 14, 20, { align: "right" });
}

function drawFooter(doc: jsPDF, signataire?: string | null) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text("Document généré électroniquement — Vie scolaire", 14, H - 10);
  doc.text(`Page 1/1`, W - 14, H - 10, { align: "right" });

  // Cadre signature
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.3);
  doc.roundedRect(W - 80, H - 50, 66, 30, 2, 2);
  doc.setTextColor(...INK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Signature & cachet", W - 47, H - 44, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (signataire) doc.text(signataire, W - 47, H - 24, { align: "center" });
}

export async function generateBilletSortiePDF(data: BilletPDFData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  await drawHeader(doc, data.ecole, data.numero, "Billet de sortie");

  // Title
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("BILLET DE SORTIE", W / 2, 50, { align: "center" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 35, 53, W / 2 + 35, 53);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  let y = 70;
  const lineH = 8;
  const label = (k: string, v: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k} :`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, 70, y);
    y += lineH;
  };

  const typeLabel = data.sujet.type === "eleve" ? "Élève" : data.sujet.type === "enseignant" ? "Enseignant" : "Personnel";
  label("Bénéficiaire", `${data.sujet.prenom} ${data.sujet.nom} (${typeLabel})`);
  if (data.sujet.matricule) label("Matricule", data.sujet.matricule);
  if (data.sujet.classe) label("Classe", data.sujet.classe);
  label("Date de sortie", formatDateLong(data.date_sortie));
  label("Heure de sortie", data.heure_sortie.slice(0, 5));
  if (data.heure_retour_prevue) label("Retour prévu à", data.heure_retour_prevue.slice(0, 5));
  if (data.destination) label("Destination", data.destination);
  if (data.accompagnateur) label("Accompagnateur", data.accompagnateur);

  // Motif box
  y += 4;
  doc.setFillColor(252, 248, 235);
  doc.roundedRect(14, y, W - 28, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("Motif de la sortie :", 18, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  const motifLines = doc.splitTextToSize(data.motif, W - 36);
  doc.text(motifLines, 18, y + 14);
  y += 30;

  if (data.observations) {
    doc.setFont("helvetica", "bold");
    doc.text("Observations :", 18, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const obs = doc.splitTextToSize(data.observations, W - 36);
    doc.text(obs, 18, y);
  }

  drawFooter(doc, data.delivre_par_nom);
  return doc;
}

export async function generateCertificatAbsencePDF(data: CertificatPDFData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  await drawHeader(doc, data.ecole, data.numero, "Certificat d'absence");

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CERTIFICAT D'ABSENCE", W / 2, 50, { align: "center" });
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 40, 53, W / 2 + 40, 53);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const typeLabel = data.sujet.type === "eleve" ? "élève" : data.sujet.type === "enseignant" ? "enseignant" : "membre du personnel";
  const fullName = `${data.sujet.prenom} ${data.sujet.nom}`;
  const intro = `Je soussigné(e), ${data.ecole.directeur || "Le Responsable de la Vie scolaire"}, certifie que ${fullName}, ${typeLabel}${data.sujet.classe ? ` de la classe de ${data.sujet.classe}` : ""}${data.sujet.matricule ? ` (matricule ${data.sujet.matricule})` : ""}, s'est trouvé(e) absent(e) de l'établissement durant la période ci-dessous.`;
  const introLines = doc.splitTextToSize(intro, W - 36);
  doc.text(introLines, 18, 70);

  let y = 70 + introLines.length * 6 + 6;

  // Bloc info absence
  doc.setFillColor(252, 248, 235);
  doc.roundedRect(14, y, W - 28, 36, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10);
  doc.text("Période d'absence", 18, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  doc.text(`Du ${formatDateLong(data.date_debut)} au ${formatDateLong(data.date_fin)}`, 18, y + 13);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("Motif", 18, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  const motifLines = doc.splitTextToSize(data.motif, W - 36);
  doc.text(motifLines, 18, y + 27);

  y += 44;

  doc.setFont("helvetica", "bold");
  doc.text("Statut :", 18, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(data.justifie ? 30 : 180, data.justifie ? 130 : 40, data.justifie ? 60 : 40);
  doc.text(data.justifie ? "Absence JUSTIFIÉE" : "Absence NON JUSTIFIÉE", 45, y);
  doc.setTextColor(...INK);
  y += 7;

  if (data.type_justificatif) {
    doc.setFont("helvetica", "bold");
    doc.text("Justificatif :", 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.type_justificatif, 50, y);
    y += 7;
  }

  if (data.observations) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.text("Observations :", 18, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const obs = doc.splitTextToSize(data.observations, W - 36);
    doc.text(obs, 18, y);
    y += obs.length * 5;
  }

  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...MUTED);
  doc.text(
    `En foi de quoi le présent certificat lui est délivré pour servir et valoir ce que de droit.`,
    18, y, { maxWidth: W - 36 }
  );
  y += 10;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait à ${data.ecole.ville || "Abidjan"}, le ${formatDateLong(new Date().toISOString())}.`, 18, y);

  drawFooter(doc, data.delivre_par_nom);
  return doc;
}
