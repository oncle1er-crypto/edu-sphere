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
    // Flag `u` obligatoire : 💡 est un caractère astral (paire de substituts
    // UTF-16) — sans lui, la classe [💡] matche ses deux moitiés séparément
    // et peut altérer d'autres caractères partageant un demi-substitut.
    .replace(/[💡]/gu, "")
    .replace(/[\u00A0\u202F]/g, " ")
    // Volontaire : ne garde que LF/CR + imprimables ASCII (jeu GSM 03.38),
    // pour un SMS sans caractères exotiques non supportés par les opérateurs.
    // eslint-disable-next-line no-control-regex
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
