/** Mozambican formats (pt-MZ). */

/** "+258841234567" → "+258 84 123 4567"; other countries are shown as stored. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const mobile = e164.match(/^\+258(8\d)(\d{3})(\d{4})$/);
  if (mobile) return `+258 ${mobile[1]} ${mobile[2]} ${mobile[3]}`;
  const landline = e164.match(/^\+258(2\d)(\d{3})(\d{3})$/);
  if (landline) return `+258 ${landline[1]} ${landline[2]} ${landline[3]}`;
  return e164;
}

// Group thousands even for 4-digit amounts (pt-PT leaves "1500" ungrouped by default)
const money = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

/** 1500 → "1 500,00 MT" */
export function formatMT(amount: number): string {
  return `${money.format(amount)} MT`;
}

/** Dates as dd/MM/yyyy in Maputo time. */
export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Africa/Maputo' }).format(new Date(value));
}
