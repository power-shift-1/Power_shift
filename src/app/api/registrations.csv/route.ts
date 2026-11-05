import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";

import { CSV_BOM, csvIstTime, csvLine } from "@/lib/csv";
import { getSupabase, REGISTRATIONS_TABLE } from "@/lib/supabase";

// Supabase returns at most 1,000 rows per request by default, so the export reads in pages
// until a page comes back empty. That still works if the project's limit is set lower.
const PAGE_SIZE = 1000;

// The route has no rate limit, so only a long password keeps guessing hopeless.
const MIN_PASSWORD_LENGTH = 20;

const HEADER = ["Name", "Email", "Registered (IST)"];

const NO_STORE = { "Cache-Control": "no-store" };

type Row = { name: string; email: string; created_at: string };

/**
 * Every registration as a CSV, oldest first, for Excel's Data > Get Data > From Web.
 * Sign in with Basic: any user name, and REGISTRATIONS_EXPORT_PASSWORD as the password.
 * While that variable is unset or shorter than 20 characters, this route answers 404.
 */
export async function GET(request: Request) {
  // Always run per request. Otherwise a build without the password set prerenders the 404 and serves it for good.
  await connection();

  const password = process.env.REGISTRATIONS_EXPORT_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    if (password) console.error(`[export] REGISTRATIONS_EXPORT_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters, so the export is off.`);
    return new Response("Not found", { status: 404, headers: NO_STORE });
  }

  if (!isAuthorized(request.headers.get("authorization"), password)) {
    return new Response("Sign in with the export password.", {
      status: 401,
      headers: { ...NO_STORE, "WWW-Authenticate": 'Basic realm="PowerShift registrations", charset="UTF-8"' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error("[export] SUPABASE_URL or SUPABASE_SECRET_KEY is not set.");
    return new Response("Registrations are not connected yet.", { status: 503, headers: NO_STORE });
  }

  const readPage = async (offset: number): Promise<Row[]> => {
    const { data, error } = await supabase
      .from(REGISTRATIONS_TABLE)
      .select("name, email, created_at")
      .order("created_at")
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    return data;
  };

  // Reading the first page up front lets a failing database still get a clear 502.
  let page: Row[] | null;
  try {
    page = await readPage(0);
  } catch (error) {
    console.error("[export] Could not read registrations:", error);
    return new Response("Could not read registrations. Try again shortly.", { status: 502, headers: NO_STORE });
  }

  // Streamed page by page: Vercel refuses a buffered response over 4.5 MB.
  const encoder = new TextEncoder();
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvLine(HEADER)));
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
        controller.enqueue(encoder.encode(rows.map((row) => csvLine([row.name, row.email, csvIstTime(row.created_at)])).join("")));
      } catch (error) {
        // Failing the stream makes Excel report a failed refresh instead of loading a short list.
        console.error("[export] Could not read registrations:", error);
        controller.error(error);
      }
    },
  });

  return new Response(body, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="powershift-registrations.csv"',
      "X-Robots-Tag": "noindex",
    },
  });
}

function isAuthorized(header: string | null, password: string) {
  const match = header?.match(/^Basic\s+(\S+)$/i);
  if (!match) return false;

  const credentials = Buffer.from(match[1], "base64").toString("utf8");
  const colon = credentials.indexOf(":");
  if (colon === -1) return false;

  // Hashing gives both sides the same length, which timingSafeEqual requires.
  return timingSafeEqual(sha256(credentials.slice(colon + 1)), sha256(password));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}
