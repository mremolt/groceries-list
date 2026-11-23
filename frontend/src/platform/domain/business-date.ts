/** The product's business time zone (TS-ARCH-22): declared once, here. */
const BUSINESS_TIME_ZONE = 'Europe/Berlin';

/** The calendar date (`YYYY-MM-DD`) of an instant in the business time zone; never the UTC date. */
export function businessDate(instantMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instantMs));
}
