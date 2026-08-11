/**
 * Returns the local calendar date (device timezone) as YYYY-MM-DD.
 * Deliberately NOT date.toISOString().split('T')[0], which converts to UTC
 * first and rolls the date back to the previous calendar day for the first
 * several hours of every day in any timezone ahead of UTC (e.g. IST,
 * UTC+5:30 - 00:00 to 05:30 local). Confirmed as the root cause of a real
 * "yesterday's horoscope" bug - this device-local date must always match
 * what the user's own calendar/clock shows.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
