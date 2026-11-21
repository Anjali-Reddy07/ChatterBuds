/**
 * Strict Phone Number Normalizer for ChatterBuds.
 * Strips whitespace, dashes, hyphens, dots, parentheses, and leading zeros.
 * Prepends +91 to standard 10-digit Indian numbers.
 * Example:
 *   "9876543210" -> "+919876543210"
 *   "09876543210" -> "+919876543210"
 *   "+91 98765-43210" -> "+919876543210"
 *   "14155552671" -> "+14155552671"
 *   "+1 (415) 555-2671" -> "+14155552671"
 */
export function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";

  const trimmed = rawPhone.trim();
  if (!trimmed) return "";

  // Extract all digits
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  // Strip leading 0 if 11 digits starting with 0 (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // 10 digits -> Indian mobile number
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // 12 digits starting with 91 -> +91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Preserve international numbers with +
  return `+${digits}`;
}

/**
 * Returns user-friendly display format (e.g. "+91 98765 43210")
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  const norm = normalizePhone(rawPhone);
  if (!norm) return "";

  if (norm.startsWith("+91") && norm.length === 13) {
    return `+91 ${norm.slice(3, 8)} ${norm.slice(8)}`;
  }

  if (norm.startsWith("+1") && norm.length === 12) {
    return `+1 (${norm.slice(2, 5)}) ${norm.slice(5, 8)}-${norm.slice(8)}`;
  }

  return norm;
}
