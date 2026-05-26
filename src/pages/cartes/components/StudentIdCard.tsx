import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StudentCardBarcode } from "./StudentCardBarcode";
import { StudentCardQRCode, buildVerificationUrl } from "./StudentCardQRCode";

/**
 * Données nécessaires à l'impression d'une carte scolaire.
 * Pensée pour être alimentée depuis la base (élèves + école).
 */
export interface StudentCardData {
  /** ID interne ou matricule, utilisé pour la vérification. */
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe?: string;
  niveau?: string;           // sert au statut scolaire (maternelle / primaire / secondaire)
  anneeScolaire: string;     // ex "2025 - 2026"
  photo?: string;            // URL

  dateNaissance?: string;    // ISO ou "JJ/MM/AAAA"
  lieuNaissance?: string;
  sexe?: string;
  adresse?: string;

  ecoleNom: string;          // "COMPLEXE SCOLAIRE LA PROVIDENCE DE DON ORIONE"
  ecoleLogo?: string;        // URL ronde
  ecoleAdresse?: string;
  ecoleTelephone?: string;
  ecoleSite?: string;
  devise?: string;           // "Instruire l'esprit, former le cœur."
  deviseLatin?: string;      // "FOI • SAVOIR • EXCELLENCE"

  directeurNom?: string;     // "M. Diop"
  directeurSignature?: string; // URL signature

  verificationToken?: string;  // sera utilisé dans le QR
}

/* Format CR80 portrait : 54 × 86 mm → 204 × 323 px à 96 dpi. */
export const CARD_W_PX = 204;
export const CARD_H_PX = 323;
export const CARD_W_MM = 54;
export const CARD_H_MM = 86;

interface SideProps {
  data: StudentCardData;
  scale?: number;
  className?: string;
}

/* Couleurs institutionnelles. */
const BORDEAUX = "#6E1A2C";
const BORDEAUX_DARK = "#561220";
const GOLD = "#C9A24B";
const GOLD_LIGHT = "#E9C97A";
const CREAM = "#FBF5E8";

function CardShell({
  children,
  className,
  scale = 1,
  side,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
  side: "recto" | "verso";
}) {
  return (
    <div
      data-card-side={side}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[14px] shadow-[0_6px_24px_rgba(0,0,0,0.15)] border border-black/5",
        "print:shadow-none",
        className,
      )}
      style={{
        width: CARD_W_PX * scale,
        height: CARD_H_PX * scale,
        background: CREAM,
        transformOrigin: "top left",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          width: CARD_W_PX,
          height: CARD_H_PX,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: CREAM,
        }}
      >
        {/* Filigrane logo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: 0.06 }}
          aria-hidden
        >
          <div
            className="rounded-full"
            style={{
              width: 160,
              height: 160,
              background:
                "radial-gradient(circle at center, #6E1A2C 0%, #6E1A2C 55%, transparent 70%)",
            }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}

/* Vague bordeaux + liseré doré en haut (SVG). */
function TopWave({ height = 70 }: { height?: number }) {
  return (
    <svg
      width={CARD_W_PX}
      height={height}
      viewBox={`0 0 ${CARD_W_PX} ${height}`}
      className="absolute top-0 left-0"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="grdBordeaux" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BORDEAUX} />
          <stop offset="100%" stopColor={BORDEAUX_DARK} />
        </linearGradient>
        <linearGradient id="grdGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD} />
          <stop offset="50%" stopColor={GOLD_LIGHT} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
      </defs>
      {/* Forme bordeaux avec vague en bas */}
      <path
        d={`M0,0 L${CARD_W_PX},0 L${CARD_W_PX},${height - 18} Q${CARD_W_PX * 0.55},${height + 14} 0,${height - 18} Z`}
        fill="url(#grdBordeaux)"
      />
      {/* Liseré doré épousant la vague */}
      <path
        d={`M0,${height - 18} Q${CARD_W_PX * 0.55},${height + 14} ${CARD_W_PX},${height - 18}`}
        stroke="url(#grdGold)"
        strokeWidth={2.5}
        fill="none"
      />
    </svg>
  );
}

/* Vague basse pour le verso (similaire mais inversée niveau bandeau coordonnées). */
function BottomBand({ height = 56, children }: { height?: number; children?: ReactNode }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center px-2 text-[7px]"
      style={{
        height,
        background: `linear-gradient(180deg, ${BORDEAUX} 0%, ${BORDEAUX_DARK} 100%)`,
        color: GOLD_LIGHT,
      }}
    >
      {children}
    </div>
  );
}

/* Petit ornement doré */
function GoldOrnament({ width = 60 }: { width?: number }) {
  return (
    <svg width={width} height={8} viewBox="0 0 60 8" aria-hidden>
      <path
        d="M0 4 L24 4 M36 4 L60 4 M28 4 L32 4"
        stroke={GOLD}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="30" cy="4" r="1.6" fill={GOLD} />
    </svg>
  );
}

/* Petite croix dorée pour le verso */
function GoldCross({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1 L7 13 M2 5 L12 5"
        stroke={GOLD}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================ */
/* RECTO                                                         */
/* ============================================================ */
export function StudentIdCardFront({ data, scale = 1, className }: SideProps) {
  const statut = niveauToStatut(data.niveau);

  return (
    <CardShell scale={scale} className={className} side="recto">
      <TopWave height={66} />

      {/* Logo rond chevauchant la vague */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 6 }}>
        <div
          className="rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: 56,
            height: 56,
            border: `2.5px solid ${GOLD}`,
            background: CREAM,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          {data.ecoleLogo ? (
            <img src={data.ecoleLogo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="text-[6px] font-bold text-center px-1 leading-tight"
              style={{ color: BORDEAUX }}
            >
              COMPLEXE<br />SCOLAIRE
            </div>
          )}
        </div>
      </div>

      {/* Titre établissement */}
      <div
        className="absolute left-0 right-0 text-center px-2"
        style={{ top: 70 }}
      >
        <p
          className="font-bold leading-[1.1] tracking-tight"
          style={{ color: BORDEAUX, fontSize: 9.5, fontFamily: "Georgia, serif" }}
        >
          {data.ecoleNom.toUpperCase()}
        </p>
        <p
          className="italic mt-0.5"
          style={{ color: GOLD, fontSize: 7, fontFamily: "Georgia, serif" }}
        >
          {data.devise ?? "Instruire l'esprit, former le cœur."}
        </p>
        <div className="flex justify-center mt-0.5">
          <GoldOrnament width={70} />
        </div>
      </div>

      {/* Zone principale : photo + infos */}
      <div className="absolute left-0 right-0 px-3 flex gap-2.5" style={{ top: 130 }}>
        {/* Photo */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: 78,
            height: 98,
            borderRadius: 6,
            border: `1.5px solid ${GOLD}`,
            background: "#e9e9e9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }}
        >
          {data.photo ? (
            <img src={data.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400">
              Photo
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p
            className="font-bold leading-tight truncate"
            style={{ color: "#1a1a1a", fontSize: 13, fontFamily: "Georgia, serif" }}
            title={data.nom}
          >
            {data.nom.toUpperCase()}
          </p>
          <p
            className="leading-tight truncate"
            style={{ color: "#1a1a1a", fontSize: 11, fontFamily: "Georgia, serif" }}
            title={data.prenom}
          >
            {data.prenom.toUpperCase()}
          </p>

          <div className="mt-2 space-y-1.5">
            <Field label="Matricule" value={data.matricule} />
            <Field label="Classe" value={data.classe ?? "—"} />
            <Field label="Année scolaire" value={data.anneeScolaire} />
          </div>
        </div>
      </div>

      {/* Bandeau bordeaux avec statut + code-barres */}
      <div
        className="absolute left-0 right-0"
        style={{ top: 245, height: 56, background: BORDEAUX }}
      >
        {/* Petit liseré doré au-dessus */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        />
        <div className="flex justify-center pt-1">
          <GoldCross size={10} />
        </div>
        <p
          className="text-center font-semibold leading-tight"
          style={{ color: CREAM, fontSize: 8 }}
        >
          {statut}
        </p>
        {/* Code-barres */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-white rounded px-1 py-0.5"
          style={{ bottom: 4, width: 150 }}
        >
          <StudentCardBarcode value={data.matricule} height={22} width={1.1} className="w-full block" />
        </div>
      </div>

      {/* Pied doré devise */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: 22,
          background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})`,
          color: BORDEAUX_DARK,
        }}
      >
        <p
          className="font-bold tracking-[0.18em]"
          style={{ fontSize: 8.5, fontFamily: "Georgia, serif" }}
        >
          {data.deviseLatin ?? "FOI • SAVOIR • EXCELLENCE"}
        </p>
      </div>
    </CardShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="leading-none font-semibold"
        style={{ color: "#1a1a1a", fontSize: 7.5 }}
      >
        {label}
      </p>
      <p
        className="leading-tight"
        style={{ color: "#1a1a1a", fontSize: 9.5, fontFamily: "Georgia, serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function niveauToStatut(niveau?: string): string {
  if (!niveau) return "Élève";
  const n = niveau.toLowerCase();
  if (n.includes("matern")) return "Élève de maternelle";
  if (n.includes("prim")) return "Élève du primaire";
  if (n.includes("sec") || n.includes("coll") || n.includes("lyc")) return "Élève du secondaire";
  if (n.includes("étud") || n.includes("etud") || n.includes("sup")) return "Étudiant";
  return `Élève — ${niveau}`;
}

/* ============================================================ */
/* VERSO                                                         */
/* ============================================================ */
export function StudentIdCardBack({ data, scale = 1, className }: SideProps) {
  const qrUrl = buildVerificationUrl(data.verificationToken ?? data.id);

  return (
    <CardShell scale={scale} className={className} side="verso">
      <TopWave height={46} />

      {/* Croix centrée + ornement */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ top: 32 }}>
        <GoldCross size={12} />
        <div style={{ marginTop: 2 }}>
          <GoldOrnament width={50} />
        </div>
      </div>

      {/* Section INFORMATIONS */}
      <div className="absolute left-3 right-3" style={{ top: 64 }}>
        <SectionTitle label="INFORMATIONS" />
        <div className="mt-1 space-y-0.5">
          <KV label="Date de naissance" value={fmtDate(data.dateNaissance)} />
          <KV label="Lieu de naissance" value={data.lieuNaissance ?? "—"} />
          <KV label="Sexe" value={data.sexe ?? "—"} />
          <KV label="Adresse" value={data.adresse ?? "—"} />
        </div>
      </div>

      {/* Section RÈGLEMENT */}
      <div className="absolute left-3 right-3" style={{ top: 148 }}>
        <SectionTitle label="RÈGLEMENT INTÉRIEUR" />
        <p
          className="leading-snug mt-1"
          style={{ color: "#222", fontSize: 7 }}
        >
          Cette carte est strictement personnelle et incessible. Elle doit être
          présentée à toute demande et restituée en fin de scolarité.
        </p>
        <p
          className="leading-snug mt-1 font-semibold"
          style={{ color: BORDEAUX, fontSize: 7 }}
        >
          En cas de perte, veuillez en informer immédiatement l'administration.
        </p>
      </div>

      {/* Séparateur ornement */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: 232 }}
      >
        <GoldOrnament width={80} />
      </div>

      {/* QR code + signature */}
      <div className="absolute left-3 right-3 flex items-end justify-between" style={{ top: 240 }}>
        <div
          className="rounded"
          style={{
            border: `1px solid ${GOLD}`,
            padding: 2,
            background: "#fff",
          }}
        >
          <StudentCardQRCode value={qrUrl} size={48} />
        </div>
        <div className="text-right">
          {data.directeurSignature ? (
            <img
              src={data.directeurSignature}
              alt=""
              style={{ height: 22, marginLeft: "auto" }}
            />
          ) : (
            <div
              style={{ height: 22, width: 60, marginLeft: "auto" }}
              className="italic flex items-end justify-end"
            >
              <span style={{ fontFamily: "'Brush Script MT', cursive", color: "#1d3a8a", fontSize: 14 }}>
                {data.directeurNom?.split(" ").pop() ?? "Direction"}
              </span>
            </div>
          )}
          <p style={{ fontSize: 7, color: "#1a1a1a", fontFamily: "Georgia, serif" }}>Le Directeur</p>
          <p style={{ fontSize: 8, fontWeight: 700, color: "#1a1a1a", fontFamily: "Georgia, serif" }}>
            {data.directeurNom ?? "—"}
          </p>
        </div>
      </div>

      {/* Bandeau coordonnées */}
      <BottomBand height={50}>
        <div className="w-full space-y-0.5 leading-tight" style={{ color: CREAM }}>
          {data.ecoleAdresse && (
            <div className="flex items-center gap-1">
              <PinIcon /> <span className="truncate">{data.ecoleAdresse}</span>
            </div>
          )}
          {data.ecoleTelephone && (
            <div className="flex items-center gap-1">
              <PhoneIcon /> <span className="truncate">{data.ecoleTelephone}</span>
            </div>
          )}
          {data.ecoleSite && (
            <div className="flex items-center gap-1">
              <GlobeIcon /> <span className="truncate">{data.ecoleSite}</span>
            </div>
          )}
        </div>
      </BottomBand>
    </CardShell>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="rounded-full flex items-center justify-center"
        style={{ width: 14, height: 14, border: `1.2px solid ${BORDEAUX}` }}
      >
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: BORDEAUX }} />
      </div>
      <p
        className="font-bold tracking-wider"
        style={{ color: BORDEAUX, fontSize: 8, fontFamily: "Georgia, serif" }}
      >
        {label}
      </p>
      <div className="flex-1 h-px ml-1" style={{ background: GOLD }} />
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <p className="font-bold shrink-0" style={{ color: "#1a1a1a", fontSize: 7.5, width: 64 }}>
        {label} :
      </p>
      <p className="truncate" style={{ color: "#1a1a1a", fontSize: 7.5, fontFamily: "Georgia, serif" }}>
        {value}
      </p>
    </div>
  );
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  }
  return d;
}

function PinIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 012 4.18 2 2 0 014 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
    </svg>
  );
}

/* ============================================================ */
/* COMPOSITION RECTO + VERSO                                    */
/* ============================================================ */
export function StudentIdCard({
  data,
  scale = 1,
  layout = "side-by-side",
  className,
}: {
  data: StudentCardData;
  scale?: number;
  layout?: "side-by-side" | "stacked";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 items-start",
        layout === "stacked" ? "flex-col" : "flex-col md:flex-row",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <StudentIdCardFront data={data} scale={scale} />
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">RECTO</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <StudentIdCardBack data={data} scale={scale} />
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">VERSO</span>
      </div>
    </div>
  );
}
