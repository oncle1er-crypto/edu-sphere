import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  shareToWhatsApp,
  normalizeIvorianPhoneNumber,
  isValidIvorianPhoneNumber,
} from '@/lib/shareToWhatsApp';

interface WhatsAppShareButtonProps {
  phoneNumber?: string;
  message: string;
  documentLink?: string;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export function WhatsAppShareButton({
  phoneNumber,
  message,
  documentLink,
  label = 'Partager sur WhatsApp',
  size = 'sm',
  variant = 'outline',
}: WhatsAppShareButtonProps) {
  if (!phoneNumber || !isValidIvorianPhoneNumber(phoneNumber)) {
    return null;
  }

  const normalizedPhone = normalizeIvorianPhoneNumber(phoneNumber);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() =>
        shareToWhatsApp({
          phoneNumber: normalizedPhone,
          message,
          documentLink,
        })
      }
      className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
    >
      <MessageCircle className="w-4 h-4" />
      {label}
    </Button>
  );
}

export function WhatsAppShareIcon({
  phoneNumber,
  message,
  documentLink,
}: Omit<WhatsAppShareButtonProps, 'label' | 'size' | 'variant'>) {
  if (!phoneNumber || !isValidIvorianPhoneNumber(phoneNumber)) {
    return null;
  }

  const normalizedPhone = normalizeIvorianPhoneNumber(phoneNumber);

  return (
    <button
      onClick={() =>
        shareToWhatsApp({
          phoneNumber: normalizedPhone,
          message,
          documentLink,
        })
      }
      className="p-1 hover:bg-green-100 rounded text-green-600 transition-colors"
      title="Partager via WhatsApp"
    >
      <MessageCircle className="w-5 h-5" />
    </button>
  );
}
