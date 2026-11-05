import { PAGE_SIZE, readEvery, type AdminMember, type UserClient } from "@/components/members/admin/admin-data";
import { adminExportClient, csvDownload, istToday, memberPage, notFound, readFailed } from "@/components/members/admin/csv-export";
import { csvIstTime } from "@/lib/csv";

const HEADER = ["Date (IST)", "Name", "Email", "Course", "Amount (INR)", "Status", "Source", "Payment ID", "Order ID"];

const STATUS: Record<string, string> = { paid: "Paid", refunded: "Refunded" };
const SOURCE: Record<string, string> = { razorpay: "Razorpay", admin: "Added by hand" };

type Purchase = {
  user_id: string;
  amount_paise: number;
  status: string;
  source: string;
  order_id: string | null;
  payment_id: string | null;
  created_at: string;
  courses: { title: string } | null;
};

/** Every purchase, oldest first, with the buyer's name and email. Admins only: everyone else gets a 404. */
export async function GET() {
  const supabase = await adminExportClient();
  if (!supabase) return notFound();

  // Oldest first, so a purchase made during the download lands at the end instead of shifting a page.
  const readPage = async (offset: number) => {
    const { data, error } = await supabase
      .from("purchases")
      .select("user_id, amount_paise, status, source, order_id, payment_id, created_at, courses(title)")
      .order("created_at")
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
      .overrideTypes<Purchase[], { merge: false }>();
    if (error) throw error;
    return data;
  };

  let first: Purchase[];
  let buyers: Map<string, AdminMember>;
  try {
    [first, buyers] = await Promise.all([readPage(0), membersById(supabase)]);
  } catch (error) {
    console.error("[export] Could not read purchases:", error);
    return readFailed("purchases");
  }

  return csvDownload(`powershift-purchases-${istToday()}.csv`, HEADER, first, readPage, (purchase) => {
    const buyer = buyers.get(purchase.user_id);
    return [
      csvIstTime(purchase.created_at),
      buyer?.full_name,
      buyer?.email,
      purchase.courses?.title,
      rupees(purchase.amount_paise),
      STATUS[purchase.status] ?? purchase.status,
      SOURCE[purchase.source] ?? purchase.source,
      purchase.payment_id,
      purchase.order_id,
    ];
  });
}

/** Emails live in Supabase Auth, which purchases can't join to, so buyers come from admin_members. */
async function membersById(supabase: UserClient) {
  const members = await readEvery((offset) => memberPage(supabase, offset));
  return new Map(members.map((member) => [member.member_id, member]));
}

/** 199900 paise as 1999.00, in whole numbers so floating point never rounds a price. */
function rupees(paise: number) {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}
