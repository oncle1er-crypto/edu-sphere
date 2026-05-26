import { QRCodeSVG } from "qrcode.react";

interface Props {
  value: string;
  size?: number;
  className?: string;
}

/** QR code de vérification (pointant vers l'URL publique de la carte). */
export function StudentCardQRCode({ value, size = 60, className }: Props) {
  return (
    <div className={className} style={{ background: "#fff", padding: 2, borderRadius: 4 }}>
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}

/** Construit le payload du QR : URL publique de vérification de la carte. */
export function buildVerificationUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/carte-scolaire/verification/${token}`;
  }
  return `/carte-scolaire/verification/${token}`;
}
