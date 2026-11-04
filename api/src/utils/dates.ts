/**
 * Calendar days in the centre's time zone (Mozambique: Africa/Maputo, UTC+2 all year).
 * A "day" is stored as midnight UTC of that calendar date, so one attendance record or daily
 * report per child per day can be enforced whatever time of day the device sent.
 */
const TIME_ZONE = process.env.CENTRE_TIME_ZONE || 'Africa/Maputo';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The centre's calendar date of `value`, as YYYY-MM-DD. */
export function centreDate(value: Date | string): string {
  return dayFormat.format(new Date(value));
}

/** The centre's calendar day of `value`, as midnight UTC of that date. */
export function startOfCentreDay(value: Date | string): Date {
  return new Date(`${centreDate(value)}T00:00:00.000Z`);
}
