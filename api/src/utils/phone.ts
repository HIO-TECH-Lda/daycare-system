/**
 * Phone numbers are stored in E.164 format (`+258841234567`).
 *
 * Accepted input: local Mozambican numbers (`84 123 4567`, landline `21 123 456`),
 * numbers with the country code (`+258 84 123 4567`, `00258…`, `258…`) and other
 * international numbers written with their country code (`+27 82 123 4567`).
 * Spaces, dashes, dots and brackets are ignored.
 */
const MZ_COUNTRY_CODE = '258';

export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, '');
  const hadInternationalPrefix = trimmed.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (!hadInternationalPrefix) {
    // Local Mozambican mobile (8X XXX XXXX) or landline (2X XXX XXX)
    if (digits.length === 9 && digits.startsWith('8')) digits = MZ_COUNTRY_CODE + digits;
    else if (digits.length === 8 && digits.startsWith('2')) digits = MZ_COUNTRY_CODE + digits;
  }

  // E.164: country code + subscriber number, 8 to 15 digits, no leading zero
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  // Mozambican numbers have a fixed length after the country code
  if (digits.startsWith(MZ_COUNTRY_CODE) && !/^258(8\d{8}|2\d{7})$/.test(digits)) return null;

  return `+${digits}`;
}

/** True when the identifier a user typed looks like an email rather than a phone number. */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}
