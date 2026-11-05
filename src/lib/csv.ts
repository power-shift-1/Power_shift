// CSV for Excel, shared by the registrations export and the admin exports.

/** Excel only reads a downloaded CSV as UTF-8 when it starts with a byte order mark. */
export const CSV_BOM = String.fromCharCode(0xfeff);

export const CSV_HEADERS = {
  "Content-Type": "text/csv; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;

// India has no daylight saving time, so a fixed offset is exact.
const IST_OFFSET_MS = 330 * 60_000;

/** One row, every cell quoted, with Excel's CRLF line end. */
export function csvLine(cells: (string | number | null | undefined)[]) {
  return cells.map((cell) => csvCell(cell == null ? "" : String(cell))).join(",") + "\r\n";
}

// Anyone can type a name into the form, and Excel runs a cell that starts with = + - or @ as a formula.
export function csvCell(value: string) {
  const flat = value.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ");
  const safe = /^[=+\-@]/.test(flat) ? `'${flat}` : flat;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** A timestamp as Excel-friendly local time in India: 2026-11-04 16:50:26. */
export function csvIstTime(timestamp: string | null | undefined) {
  if (!timestamp) return "";
  return new Date(Date.parse(timestamp) + IST_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
}
