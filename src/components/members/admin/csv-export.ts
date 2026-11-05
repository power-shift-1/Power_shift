import "server-only";

import { connection } from "next/server";

import { getCurrentMember } from "@/lib/auth";
import { CSV_BOM, CSV_HEADERS, csvIstTime, csvLine } from "@/lib/csv";
import { createUserClient } from "@/lib/supabase/server";

import { listMembers, PAGE_SIZE, type UserClient } from "./admin-data";

// The admin CSV exports. They run as the signed-in admin, so row level security still applies.

const NO_STORE = { "Cache-Control": "no-store" };

type Cell = string | number | null | undefined;

/** The admin's own client, or null for everyone else. */
export async function adminExportClient(): Promise<UserClient | null> {
  // Always run per request. Otherwise a build prerenders the visitor's 404 and serves it for good.
  await connection();
  const member = await getCurrentMember();
  return member?.isAdmin ? createUserClient() : null;
}

/** The same answer as a missing page, so the route doesn't reveal that it exists. */
export const notFound = () => new Response("Not found", { status: 404, headers: NO_STORE });

export const readFailed = (what: string) => new Response(`Could not read ${what}. Try again shortly.`, { status: 502, headers: NO_STORE });

/** A page of every member, newest first. Throws, so a failed read never passes for the last page. */
export async function memberPage(supabase: UserClient, offset: number) {
  const { data, error } = await listMembers(supabase, "", PAGE_SIZE, offset);
  if (error) throw error;
  return data ?? [];
}

/** Today in India, for the file name: powershift-members-2026-11-05.csv. */
export function istToday() {
  return csvIstTime(new Date().toISOString()).slice(0, 10);
}

/**
 * A CSV download, streamed page by page because Vercel refuses a buffered response over 4.5 MB.
 * The caller reads the first page itself, so a failing database still gets a clear 502.
 */
export function csvDownload<T>(
  filename: string,
  header: string[],
  firstPage: T[],
  readPage: (offset: number) => Promise<T[]>,
  cells: (row: T) => Cell[],
) {
  const encoder = new TextEncoder();
  let page: T[] | null = firstPage;
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvLine(header)));
    },
    async pull(controller) {
      try {
        const rows = page ?? (await readPage(offset));
        page = null;
        if (rows.length === 0) {
          controller.close();
          return;
        }
        offset += rows.length;
        controller.enqueue(encoder.encode(rows.map((row) => csvLine(cells(row))).join("")));
      } catch (error) {
        // Failing the stream makes the browser report a failed download instead of saving a short file.
        console.error(`[export] Could not finish ${filename}:`, error);
        controller.error(error);
      }
    },
  });

  return new Response(body, { headers: { ...CSV_HEADERS, "Content-Disposition": `attachment; filename="${filename}"` } });
}
