import jsPDF from "jspdf";

export interface RecuData {
  ecole: {
    nom: string;
    sigle?: string;
    devise: string;
    adresse: string;
    telephone: string;
    email?: string;
    logoUrl?: string | null;
  };
  reference: string;
  eleve: { nom: string; prenom: string; matricule: string; classe: string; photo_url?: string | null };
  montant: number;
  mode: string;
  date_paiement: string;
  total_du?: number;
  total_paye?: number;
  /** Total encaissé (caisse/mobile money/virement) — si fourni avec total_remises, affiche la ventilation. */
  total_encaisse?: number;
  /** Total remises accordées (remise/bourse/prise en charge) — si > 0, affiche une ligne dédiée. */
  total_remises?: number;
  recu_par?: string;
  /** Type d'opération — détermine le titre du document et l'affichage du motif. */
  type?: "encaissement" | "remise" | "bourse" | "prise_en_charge" | "annulation";
  /** Motif obligatoire pour remise/bourse/prise en charge. */
  motif?: string | null;
  /** Inclure la souche école (par défaut: true). Mettre à false pour un reçu "famille seule" (WhatsApp). */
  souche?: boolean;
  /** Masquer la ligne « Versement reçu / Dont ce versement » (ex: réimpression). */
  hideVersementLine?: boolean;
  /** Sous-titre personnalisé (ex: « Reçu Cantine ») remplaçant le libellé par défaut. */
  subtitleOverride?: string;
  /** Titre principal personnalisé (ex: « REÇU CANTINE »). */
  titleOverride?: string;
  /** Période couverte par le paiement (ex: « Octobre 2025 » ou « Trimestre 1 »). */
  periode?: string;
  /** Date d'échéance de la facture (ISO). */
  date_echeance?: string;
}

async function loadImageAsDataURL(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

const formatFCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;

const monthsFR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")} ${monthsFR[d.getMonth()]} ${d.getFullYear()}`;
};

export async function generateRecuPDF(data: RecuData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const halfH = H / 2;

  const ink: [number, number, number] = [40, 40, 45];
  const muted: [number, number, number] = [120, 120, 128];
  const line: [number, number, number] = [210, 210, 215];
  const primary: [number, number, number] = [110, 26, 44];
  const success: [number, number, number] = [22, 122, 70];
  const warn: [number, number, number] = [180, 95, 6];

  const logo = data.ecole.logoUrl ? await loadImageAsDataURL(data.ecole.logoUrl) : null;

  const totalDu = data.total_du ?? 0;
  const totalPaye = data.total_paye ?? data.montant;
  const totalRemises = Math.max(0, data.total_remises ?? 0);
  const totalEncaisse = Math.max(0, data.total_encaisse ?? Math.max(0, totalPaye - totalRemises));
  const hasRemise = totalRemises > 0;
  const reste = Math.max(0, totalDu - totalPaye);
  const solde = totalDu > 0 && reste <= 0;

  // Précharge la photo une seule fois (évite double await dans les 2 copies)
  const photoData = data.eleve.photo_url ? await loadImageAsDataURL(data.eleve.photo_url) : null;

  const drawCopy = (offsetY: number, label: string) => {
    const M = 16;
    let y = offsetY + 12;

    // ── Header (no color band, just typography + logo) ──
    if (logo) {
      const logoH = 16;
      const logoW = (logo.w / logo.h) * logoH;
      doc.addImage(logo.data, "PNG", M, y, logoW, logoH);
    }
    const tx = logo ? M + 22 : M;
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...primary);
    doc.text(data.ecole.nom.toUpperCase(), tx, y + 6);
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    doc.text(`« ${data.ecole.devise} »`, tx, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${data.ecole.adresse} • Tél : ${data.ecole.telephone}${data.ecole.email ? " • " + data.ecole.email : ""}`, tx, y + 15);

    // Copy label (top right) + Titre dynamique selon le type d'opération
    const TYPE_LABEL: Record<string, { title: string; subtitle: string }> = {
      encaissement:     { title: "REÇU DE PAIEMENT",      subtitle: "Encaissement" },
      remise:           { title: "ATTESTATION DE REMISE", subtitle: "Remise commerciale" },
      bourse:           { title: "ATTESTATION DE BOURSE", subtitle: "Bourse d'études" },
      prise_en_charge:  { title: "ATTESTATION DE PRISE EN CHARGE", subtitle: "Prise en charge tiers" },
      annulation:       { title: "REÇU DE CORRECTION",    subtitle: "Annulation / Remboursement" },
    };
    const typeInfo = TYPE_LABEL[data.type ?? "encaissement"] ?? TYPE_LABEL.encaissement;
    const finalTitle = data.titleOverride ?? typeInfo.title;
    const finalSubtitle = data.subtitleOverride ?? typeInfo.subtitle;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(`${label.toUpperCase()} • ${finalSubtitle.toUpperCase()}`, W - M, y + 2, { align: "right" });
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primary);
    doc.text(finalTitle, W - M, y + 9, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`N° ${data.reference}`, W - M, y + 14, { align: "right" });


    // Thin separator
    y += 22;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);

    // ── Info grid (2 columns) ──
    y += 7;
    const colW = (W - 2 * M) / 2;
    const drawField = (label: string, value: string, x: number, yy: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(label.toUpperCase(), x, yy);
      doc.setFont("times", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      doc.text(value || "—", x, yy + 5);
    };

    // Photo de l'élève (coin droit)
    if (photoData) {
      try {
        doc.addImage(photoData.data, "JPEG", W - M - 18, y - 2, 16, 18);
      } catch { /* ignore */ }
    }

    // Row 1
    drawField("Élève", `${data.eleve.nom} ${data.eleve.prenom}`, M, y);
    drawField("Date du paiement", formatDateLong(data.date_paiement), M + colW, y);
    // Row 2
    drawField("Matricule", data.eleve.matricule || "—", M, y + 12);
    drawField("Classe", data.eleve.classe || "—", M + colW, y + 12);
    // Row 3
    const isRemise = data.type === "remise" || data.type === "bourse" || data.type === "prise_en_charge";
    drawField(isRemise ? "Type d'opération" : "Mode de règlement",
      (data.mode || "").replace(/_/g, " ").toUpperCase(), M, y + 24);
    drawField(isRemise ? "Accordée par" : "Reçu par", data.recu_par || "Caisse", M + colW, y + 24);

    // ── Amount line ──
    y += 36;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);

    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    // Quand il y a une remise/bourse, on met en évidence le montant réellement
    // encaissé (caisse) plutôt que le total réglé, pour éviter toute confusion
    // sur ce que la famille a effectivement versé.
    const showEncaisseAsBig = !isRemise && totalDu > 0 && hasRemise;
    const bigLabel = isRemise
      ? "MONTANT ACCORDÉ"
      : showEncaisseAsBig
        ? "TOTAL ENCAISSÉ"
        : (totalDu > 0 ? "TOTAL RÉGLÉ" : "MONTANT REÇU");
    const bigValue = isRemise || totalDu === 0
      ? data.montant
      : showEncaisseAsBig
        ? totalEncaisse
        : totalPaye;
    doc.text(bigLabel, M, y);
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...primary);
    doc.text(formatFCFA(bigValue), W - M, y + 2, { align: "right" });

    // ── Motif (obligatoire pour remises) ──
    if (data.motif) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text("MOTIF", M, y);
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...ink);
      doc.text(data.motif, M, y + 4, { maxWidth: W - 2 * M });
    }

    // ── Status / Solde ──
    y += data.motif ? 12 : 10;
    if (totalDu > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      if (data.hideVersementLine) {
        const base = `Total dû : ${formatFCFA(totalDu)}`;
        const extra = hasRemise
          ? `    •    Total réglé : ${formatFCFA(totalPaye)}    •    Dont remise : ${formatFCFA(totalRemises)}`
          : "";
        doc.text(base + extra, M, y);
      } else {
        const isReprint = !isRemise && Number(totalPaye) !== Number(data.montant);
        const versementLabel = isRemise
          ? "Montant accordé"
          : isReprint
            ? "Dont ce versement"
            : "Versement reçu";
        const remiseSuffix = hasRemise && !isRemise
          ? `    •    Dont remise : ${formatFCFA(totalRemises)}`
          : "";
        doc.text(
          `Total dû : ${formatFCFA(totalDu)}    •    ${versementLabel} : ${formatFCFA(data.montant)}${remiseSuffix}`,
          M,
          y,
        );
      }
    }

    // Badge
    y += 6;
    const badgeText = solde ? "SOLDÉ" : `RESTE À PAYER : ${formatFCFA(reste)}`;
    const badgeColor = solde ? success : warn;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const tw = doc.getTextWidth(badgeText) + 8;
    doc.setDrawColor(...badgeColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, tw, 7, 1.5, 1.5, "S");
    doc.setTextColor(...badgeColor);
    doc.text(badgeText, M + 4, y + 4.8);


    // ── Footer / signature ──
    const footY = offsetY + halfH - 16;
    doc.setDrawColor(...line);
    doc.line(W - M - 55, footY, W - M, footY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text("Signature & cachet", W - M - 27.5, footY + 4, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      "Ce reçu fait foi de paiement. Aucun remboursement ne sera effectué sans présentation du présent document.",
      M, footY + 4, { maxWidth: W - 2 * M - 65 }
    );
  };

  // Top half — Exemplaire client
  drawCopy(0, data.souche === false ? "Reçu — Famille" : "Exemplaire — Famille");

  if (data.souche !== false) {
    // Dotted separator (scissor cut line)
    const sepY = halfH;
    doc.setDrawColor(160, 160, 165);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(8, sepY, W - 8, sepY);
    doc.setLineDashPattern([], 0);
    // little scissor hint
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 165);
    doc.text("✂  -  -  -  -  Découper le long des pointillés  -  -  -  -", W / 2, sepY - 1, { align: "center" });

    // Bottom half — Souche école
    drawCopy(halfH, "Souche — École");
  }

  return doc;
}

export interface CertificatData {
  ecole: { nom: string; devise: string; adresse: string; telephone: string; directeur: string; logoUrl?: string | null };
  eleve: { nom: string; prenom: string; matricule: string; date_naissance: string; lieu_naissance: string; photo_url?: string | null };
  classe: string;
  annee: string;
  type: "scolarite" | "inscription" | "frequentation";
  /** Ville d'émission (par défaut Abidjan) */
  ville?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Helper — rendu d'un paragraphe avec segments gras / normaux,
 * word-wrap automatique en typographie serif.
 * ────────────────────────────────────────────────────────────────────────── */
type RichSeg = { text: string; bold?: boolean };
function drawRichParagraph(
  doc: jsPDF,
  segs: RichSeg[],
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  font = "times",
  size = 12,
  color: [number, number, number] = [40, 40, 45],
): number {
  doc.setFontSize(size);
  doc.setTextColor(...color);

  type Tok = { t: string; b: boolean; sp: boolean };
  const tokens: Tok[] = [];
  segs.forEach((s) => {
    const parts = s.text.split(/(\s+)/);
    parts.forEach((p) => {
      if (!p) return;
      tokens.push({ t: p, b: !!s.bold, sp: /^\s+$/.test(p) });
    });
  });

  const measure = (tok: Tok) => {
    doc.setFont(font, tok.b ? "bold" : "normal");
    return doc.getTextWidth(tok.t);
  };

  let line: Tok[] = [];
  let lineW = 0;
  let curY = y;
  const flush = () => {
    let cx = x;
    line.forEach((tok) => {
      doc.setFont(font, tok.b ? "bold" : "normal");
      doc.text(tok.t, cx, curY);
      cx += measure(tok);
    });
    curY += lineH;
    line = [];
    lineW = 0;
  };

  tokens.forEach((tok) => {
    const w = measure(tok);
    if (lineW + w > maxW && line.length > 0) {
      while (line.length && line[line.length - 1].sp) {
        lineW -= measure(line.pop()!);
      }
      flush();
      if (tok.sp) return;
    }
    if (line.length === 0 && tok.sp) return;
    line.push(tok);
    lineW += w;
  });
  if (line.length) flush();
  return curY;
}

export async function generateCertificatPDF(data: CertificatData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const bordeaux: [number, number, number] = [110, 26, 44];
  const bordeauxLight: [number, number, number] = [150, 60, 80];
  const gold: [number, number, number] = [184, 134, 11];
  const goldLight: [number, number, number] = [212, 175, 55];
  const ink: [number, number, number] = [40, 30, 35];
  const muted: [number, number, number] = [120, 110, 115];

  const logoUrl = data.ecole.logoUrl ?? "/logo-gsp.png";
  const logo = await loadImageAsDataURL(logoUrl);

  /* ── Bordure décorative double ── */
  const o1 = 8;
  const o2 = 11;
  doc.setDrawColor(...bordeaux);
  doc.setLineWidth(1.2);
  doc.rect(o1, o1, W - 2 * o1, H - 2 * o1);
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.45);
  doc.rect(o2, o2, W - 2 * o2, H - 2 * o2);

  // Ornements de coin (losanges dorés)
  const cornerOrn = (cx: number, cy: number) => {
    doc.setFillColor(...goldLight);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    const s = 2.2;
    doc.lines([[s, -s], [s, s], [-s, s], [-s, -s]], cx - s, cy, [1, 1], "FD", true);
    doc.setFillColor(...bordeaux);
    doc.circle(cx, cy, 0.4, "F");
  };
  cornerOrn(o2 + 4, o2 + 4);
  cornerOrn(W - o2 - 4, o2 + 4);
  cornerOrn(o2 + 4, H - o2 - 4);
  cornerOrn(W - o2 - 4, H - o2 - 4);

  /* ── Filigrane logo (centre, très léger) ── */
  if (logo) {
    try {
      const GState = (doc as any).GState;
      if (GState) doc.setGState(new GState({ opacity: 0.06 }));
      const wmH = 130;
      const wmW = (logo.w / logo.h) * wmH;
      doc.addImage(logo.data, "PNG", (W - wmW) / 2, (H - wmH) / 2, wmW, wmH);
      if (GState) doc.setGState(new GState({ opacity: 1 }));
    } catch {
      /* ignore */
    }
  }

  /* ── EN-TÊTE ── */
  let y = 18;
  if (logo) {
    const lh = 26;
    const lw = (logo.w / logo.h) * lh;
    doc.addImage(logo.data, "PNG", (W - lw) / 2, y, lw, lh);
    y += lh + 4;
  } else {
    y += 4;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...bordeaux);
  const nomLines = doc.splitTextToSize(data.ecole.nom.toUpperCase(), W - 50);
  nomLines.forEach((ln: string, i: number) =>
    doc.text(ln, W / 2, y + i * 7, { align: "center" }),
  );
  y += nomLines.length * 7 + 1;

  // Devise dorée italique
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...gold);
  const devise = data.ecole.devise || "Foi, Savoir, Excellence";
  const devW = doc.getTextWidth(devise);
  const devY = y + 4;
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - devW / 2 - 28, devY - 1.5, W / 2 - devW / 2 - 4, devY - 1.5);
  doc.line(W / 2 + devW / 2 + 4, devY - 1.5, W / 2 + devW / 2 + 28, devY - 1.5);
  doc.text(devise, W / 2, devY, { align: "center" });
  y = devY + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Établissement privé confessionnel catholique", W / 2, y, { align: "center" });
  y += 6;

  // Séparateur avec ornement central
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.3);
  doc.line(28, y, W / 2 - 4, y);
  doc.line(W / 2 + 4, y, W - 28, y);
  doc.setFillColor(...gold);
  doc.circle(W / 2, y, 0.9, "F");
  y += 10;

  /* ── TITRE PRINCIPAL ── */
  const titles: Record<string, string> = {
    scolarite: "CERTIFICAT DE SCOLARITÉ",
    inscription: "ATTESTATION D'INSCRIPTION",
    frequentation: "CERTIFICAT DE FRÉQUENTATION",
  };
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...bordeaux);
  doc.text(titles[data.type], W / 2, y + 2, { align: "center" });
  y += 10;

  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.4);
  doc.line(35, y, W / 2 - 6, y);
  doc.line(W / 2 + 6, y, W - 35, y);
  doc.setFillColor(...gold);
  const ds = 1.6;
  doc.lines([[ds, -ds], [ds, ds], [-ds, ds], [-ds, -ds]], W / 2 - ds, y, [1, 1], "F", true);
  y += 12;

  /* ── RÉFÉRENCE & DATE ── */
  const M = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...ink);
  doc.text("Réf. :", M, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`CSP/${data.annee}/${data.eleve.matricule}`, M + 9, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ink);
  const ville = data.ville ?? "Abidjan";
  const today = new Date().toLocaleDateString("fr-FR");
  doc.text(`${ville}, le ${today}`, W - M, y, { align: "right" });

  y += 14;

  /* ── CORPS ── */
  const nomComplet = `${data.eleve.nom} ${data.eleve.prenom}`.trim();
  const actionVerb =
    data.type === "scolarite"
      ? "est régulièrement inscrit(e) en classe de"
      : data.type === "inscription"
      ? "est inscrit(e) au sein de l'établissement en classe de"
      : "fréquente régulièrement l'établissement en classe de";

  const segs: RichSeg[] = [
    { text: `Le Directeur du ${data.ecole.nom} certifie que l'élève ` },
    { text: nomComplet, bold: true },
    { text: `, né(e) le ${data.eleve.date_naissance} à ${data.eleve.lieu_naissance}, matricule ` },
    { text: data.eleve.matricule, bold: true },
    { text: `, ${actionVerb} ` },
    { text: data.classe, bold: true },
    { text: ` pour l'année scolaire ` },
    { text: data.annee, bold: true },
    { text: `.` },
  ];
  y = drawRichParagraph(doc, segs, M, y, W - 2 * M, 6.8, "times", 12, ink);

  y += 6;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...ink);
  const closing = doc.splitTextToSize(
    "En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.",
    W - 2 * M,
  );
  doc.text(closing, M, y);

  /* ── SIGNATURE (bas droite) ── */
  const sigY = H - 70;
  const sigX = W - M - 70;
  const sigW = 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...bordeaux);
  doc.text("Le Directeur", sigX + sigW / 2, sigY, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Signature et cachet", sigX + sigW / 2, sigY + 5, { align: "center" });

  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.4);
  doc.line(sigX + 8, sigY + 26, sigX + sigW - 8, sigY + 26);

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  const dirNom = data.ecole.directeur && data.ecole.directeur.trim() ? data.ecole.directeur : "Diop";
  const dirLabel = /^M\.|^Mme|^Mlle/i.test(dirNom) ? dirNom : `M. ${dirNom}`;
  doc.text(dirLabel, sigX + sigW / 2, sigY + 31, { align: "center" });

  /* ── PIED DE PAGE ── */
  const footY = H - o2 - 10;
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.25);
  doc.line(o2 + 16, footY - 5, W / 2 - 4, footY - 5);
  doc.line(W / 2 + 4, footY - 5, W - o2 - 16, footY - 5);
  doc.setFillColor(...gold);
  const fs = 1.2;
  doc.lines([[fs, -fs], [fs, fs], [-fs, fs], [-fs, -fs]], W / 2 - fs, footY - 5, [1, 1], "F", true);

  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...bordeauxLight);
  doc.text(
    `${data.ecole.nom} — Établissement privé confessionnel catholique`,
    W / 2,
    footY,
    { align: "center" },
  );

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tableau d'honneur — diplôme individuel pour élève méritant
// ─────────────────────────────────────────────────────────────────────────────
export interface TableauHonneurData {
  ecole: { nom: string; devise: string; adresse: string; telephone: string; directeur: string; logoUrl?: string | null };
  eleve: { nom: string; prenom: string; matricule: string; photo_url?: string | null };
  classe: string;
  annee: string;
  periode?: string;
  moyenne: number;
  rang?: number;
  effectif?: number;
  mention: string;
  seuil: number;
}

export async function generateTableauHonneurPDF(data: TableauHonneurData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const primary: [number, number, number] = [110, 26, 44];
  const accent: [number, number, number] = [252, 227, 77];
  const ink: [number, number, number] = [40, 40, 45];
  const muted: [number, number, number] = [120, 120, 128];

  doc.setDrawColor(...primary);
  doc.setLineWidth(1.4);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, W - 22, H - 22);

  doc.setFillColor(...accent);
  [[14, 14], [W - 22, 14], [14, H - 22], [W - 22, H - 22]].forEach(([x, y]) => {
    doc.circle(x + 4, y + 4, 2.5, "F");
  });

  const logo = data.ecole.logoUrl ? await loadImageAsDataURL(data.ecole.logoUrl) : null;
  if (logo) {
    const lh = 18;
    const lw = (logo.w / logo.h) * lh;
    doc.addImage(logo.data, "PNG", (W - lw) / 2, 20, lw, lh);
  }

  let y = logo ? 44 : 28;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(data.ecole.nom.toUpperCase(), W / 2, y, { align: "center" });
  y += 6;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`« ${data.ecole.devise} »`, W / 2, y, { align: "center" });

  y += 14;
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...primary);
  doc.text("TABLEAU D'HONNEUR", W / 2, y, { align: "center" });

  y += 8;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 50, y, W / 2 + 50, y);

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text("Décerné à", W / 2, y, { align: "center" });

  y += 11;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ink);
  doc.text(`${data.eleve.nom} ${data.eleve.prenom}`.toUpperCase(), W / 2, y, { align: "center" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`Matricule ${data.eleve.matricule}  •  Classe de ${data.classe}  •  Année scolaire ${data.annee}`, W / 2, y, { align: "center" });

  y += 12;
  doc.setFont("times", "italic");
  doc.setFontSize(11.5);
  doc.setTextColor(...ink);
  const rangTxt = data.rang && data.effectif ? ` — ${data.rang}e sur ${data.effectif}` : "";
  const periodeTxt = data.periode ? ` au titre de ${data.periode}` : "";
  const phrase = `pour ses brillants résultats scolaires${periodeTxt}, avec une moyenne de ${data.moyenne.toFixed(2)} / 20${rangTxt}, supérieure au seuil d'excellence fixé à ${data.seuil.toFixed(2)} / 20.`;
  const lines = doc.splitTextToSize(phrase, W - 80);
  doc.text(lines, W / 2, y, { align: "center" });

  y = H - 60;
  const boxW = 90;
  const boxX = (W - boxW) / 2;
  doc.setFillColor(...accent);
  doc.roundedRect(boxX, y, boxW, 18, 3, 3, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text(`MOYENNE : ${data.moyenne.toFixed(2)} / 20`, W / 2, y + 7, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Mention : ${data.mention}`, W / 2, y + 13.5, { align: "center" });

  const footY = H - 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text(`Fait à Abidjan, le ${new Date().toLocaleDateString("fr-FR")}`, 25, footY);

  doc.setDrawColor(...muted);
  doc.setLineWidth(0.3);
  doc.line(W - 80, footY, W - 25, footY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Le Directeur", W - 52.5, footY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.ecole.directeur || "", W - 52.5, footY + 10, { align: "center" });

  return doc;
}
