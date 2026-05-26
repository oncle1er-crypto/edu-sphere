export function normalizeSmsText(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[✓]/g, "OK")
    .replace(/[💡]/g, "")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[^\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}