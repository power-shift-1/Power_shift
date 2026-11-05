import { PAGE_SIZE, readEvery, type AdminMember, type UserClient } from "@/components/members/admin/admin-data";
import { adminExportClient, csvDownload, istToday, memberPage, notFound, readFailed } from "@/components/members/admin/csv-export";
import { csvIstTime } from "@/lib/csv";

const HEADER = ["Name", "Email", "Joined (IST)", "Last sign-in (IST)", "Masterclass attendee", "Courses owned", "Banned"];

type Owned = { user_id: string; courses: { title: string } | null };

/** Every member, newest first, with the courses they own. Admins only: everyone else gets a 404. */
export async function GET() {
  const supabase = await adminExportClient();
  if (!supabase) return notFound();
  const readPage = (offset: number) => memberPage(supabase, offset);

  let first: AdminMember[];
  let owned: Map<string, string[]>;
  try {
    [first, owned] = await Promise.all([readPage(0), ownedCourses(supabase)]);
  } catch (error) {
    console.error("[export] Could not read members:", error);
    return readFailed("members");
  }

  return csvDownload(`powershift-members-${istToday()}.csv`, HEADER, first, readPage, (member) => [
    member.full_name,
    member.email,
    csvIstTime(member.joined_at),
    csvIstTime(member.last_sign_in_at),
    member.attended_masterclass ? "Yes" : "No",
    (owned.get(member.member_id) ?? []).join("; "),
    member.banned_at ? "Yes" : "No",
  ]);
}

/** Course titles per member, oldest first: bought or added by hand, and not refunded. */
async function ownedCourses(supabase: UserClient) {
  const rows = await readEvery(async (offset) => {
    const { data, error } = await supabase
      .from("purchases")
      .select("user_id, courses(title)")
      .eq("status", "paid")
      .order("created_at")
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
      .overrideTypes<Owned[], { merge: false }>();
    if (error) throw error;
    return data;
  });

  const owned = new Map<string, string[]>();
  for (const row of rows) if (row.courses) owned.set(row.user_id, [...(owned.get(row.user_id) ?? []), row.courses.title]);
  return owned;
}
