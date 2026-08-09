/**
 * Utilitaires pour partager des liens via WhatsApp
 * Utilise l'API wa.me de WhatsApp
 */

export interface WhatsAppShareOptions {
  phoneNumber: string;
  message: string;
  documentLink?: string;
}

export function generateWhatsAppLink(options: WhatsAppShareOptions): string {
  const { phoneNumber, message, documentLink } = options;

  let text = message;
  if (documentLink) {
    text += `\n\n📄 ${documentLink}`;
  }

  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${phoneNumber}?text=${encodedText}`;
}

export function shareToWhatsApp(options: WhatsAppShareOptions): void {
  const link = generateWhatsAppLink(options);
  window.open(link, '_blank');
}

export function normalizeIvorianPhoneNumber(phone: string): string {
  if (!phone) return '';

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('225')) {
    return cleaned.length === 12 ? cleaned : '';
  }

  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    return withoutZero.length === 9 ? '225' + withoutZero : '';
  }

  if (cleaned.length === 9 || cleaned.length === 10) {
    return '225' + cleaned.replace(/^0/, '');
  }

  return cleaned.length === 12 && cleaned.startsWith('225') ? cleaned : '';
}

export function isValidIvorianPhoneNumber(phone: string): boolean {
  const normalized = normalizeIvorianPhoneNumber(phone);
  return normalized.length === 12 && normalized.startsWith('225');
}

export const whatsAppTemplates = {
  bulletin: (studentName: string, className: string, period: string) =>
    `📚 Bulletin de ${studentName}\n📍 Classe: ${className}\n📅 Période: ${period}`,

  receipt: (studentName: string, amount: number, date: string) =>
    `💳 Reçu de paiement\n👤 Élève: ${studentName}\n💰 Montant: ${amount.toLocaleString('fr-FR')} FCFA\n📅 Date: ${date}`,

  reminder: (studentName: string, serviceType: string, amountDue: number) =>
    `⚠️ Rappel de paiement\n👤 Élève: ${studentName}\n📌 Service: ${serviceType}\n💰 Montant dû: ${amountDue.toLocaleString('fr-FR')} FCFA`,

  announcement: (title: string) => `📢 ${title}`,
};
