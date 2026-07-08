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

/**
 * Interpole un modèle avec les variables `{{cle}}` fournies.
 * Ex : renderTemplate("Cours de {{matiere}} le {{date}}", { matiere: "Maths", date: "12/09" })
 */
export function renderTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}
