/**
 * Display helpers for lead data coming from Notion (which is free-text and
 * inconsistent — some salary values already contain "LPA", some don't).
 */

/**
 * Normalises a raw salary string so we can append a single "LPA" suffix at the
 * call site without producing "16-24 LPA LPA". Strips any trailing/standalone
 * "LPA" token (and stray trailing punctuation) and trims whitespace.
 *
 * Examples:
 *   "16-24 LPA"             -> "16-24"
 *   "8-10 LPA"              -> "8-10"
 *   "14+ (Cisco standard)"  -> "14+ (Cisco standard)"
 *   ""                       -> ""
 */
export function cleanSalary(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\s*lpa\s*$/i, '') // trailing "LPA"
    .replace(/\blpa\b/gi, '')   // any stray standalone "LPA"
    .replace(/[\s,.;-]+$/, '')  // trailing punctuation/whitespace
    .trim();
}
