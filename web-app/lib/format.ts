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

const timeFormat = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' });

/** Times as HH:mm in Maputo time ("07:42"). */
export function formatTime(value: Date | string): string {
  return timeFormat.format(new Date(value));
}

/** "Segunda, 02/11" — the day shown on staff screens. */
export function formatWeekday(value: Date | string): string {
  const date = new Date(value);
  const weekday = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', timeZone: 'Africa/Maputo' }).format(date).replace('-feira', '');
  const day = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', timeZone: 'Africa/Maputo' }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}`;
}

/** A child's age: "9 meses", "1 ano e 6 meses", "3 anos". */
export function formatAge(birthDate: Date | string, today: Date = new Date()): string {
  const birth = new Date(birthDate);
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 12) return months === 1 ? '1 mês' : `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = years === 1 ? '1 ano' : `${years} anos`;
  if (years >= 3 || rest === 0) return yearsText;
  return `${yearsText} e ${rest === 1 ? '1 mês' : `${rest} meses`}`;
}

/** Initials for avatars: "Lucas Silva" → "LS". */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}
