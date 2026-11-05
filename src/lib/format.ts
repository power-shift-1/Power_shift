// Fixed to India's time zone, so the server and every visitor see the same times.
const IST = "Asia/Kolkata";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: IST, dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("en-IN", { timeZone: IST, dateStyle: "medium" });
const timeOnly = new Intl.DateTimeFormat("en-IN", { timeZone: IST, timeStyle: "short" });

export const formatPrice = (paise: number) => rupees.format(paise / 100);
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} IST`;
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));

export function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** A `datetime-local` value entered in IST, as an ISO timestamp. */
export function istInputToIso(value: string) {
  const parsed = Date.parse(`${value}:00+05:30`);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** A timestamp as a `datetime-local` value in IST, for edit forms. */
export function isoToIstInput(iso: string) {
  return new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16);
}

export function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "M";
}
