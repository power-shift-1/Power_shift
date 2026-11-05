# The Power Shift

Landing page for the free live masterclass by Manisha Agrawal. Built with Next.js 16, Tailwind CSS 4, shadcn/ui (Radix), Motion (Framer Motion) and three.js.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production check, run `npm run build`, then `npm run start`.

## Before going live

| What | Where | Without it |
|---|---|---|
| Registrations database | `SUPABASE_URL` and `SUPABASE_SECRET_KEY` environment variables. See [Saving registrations](#saving-registrations). | Visitors see an error and nothing is saved. In `npm run dev`, the form shows a "Preview: not saved" success instead. |
| Export password | `REGISTRATIONS_EXPORT_PASSWORD` environment variable, at least 20 characters. See [Registrations in Excel](#registrations-in-excel). | The export link answers "Not found", and it does the same while the password is shorter than 20 characters. Sign-ups are still saved. |
| Site address | `NEXT_PUBLIC_SITE_URL` environment variable | Link previews on WhatsApp and elsewhere point at localhost and show no image. |
| Date and time | `MASTERCLASS_STARTS_AT` in `src/lib/content.ts`, for example `"2026-12-05T19:00:00+05:30"` | The page says "Date announced soon", and the desktop pill runs a repeating 24-hour timer instead of a real countdown. |

For local work, copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same variables under the project's Settings > Environment Variables, for Production and also for Preview if preview deployments should save sign-ups. Then redeploy, because a running deployment keeps the values it was built with.

## Saving registrations

Each sign-up becomes a row in a Supabase table called `registrations`, with the name, the email and when they registered.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). Mumbai is the closest region for visitors in India. Keep the Data API turned on, because the site reaches the table through it.
2. Open **SQL Editor**, paste in everything from `supabase/migrations/20261104120000_create_registrations.sql`, and click **Run**. It only needs to run once. With the Supabase CLI, `supabase link` and then `supabase db push` do the same.
3. Copy the **Project URL** from Project Settings > Data API, and a **secret key** (it starts with `sb_secret_`) from Project Settings > API Keys.
4. Set them as `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` and in Vercel. If Supabase is connected through Vercel's Supabase integration instead, the names it sets (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) work too.

The secret key can read and change every row, so it belongs only in server environment variables. Never give it a `NEXT_PUBLIC_` name. The table has row level security turned on and no policies, so the public (publishable or anon) key can neither read nor write it.

To see who has registered, open **Table Editor** > `registrations`.

How sign-ups behave:

- Each email address gets one seat, whatever its capitalisation. Signing up again still says "Your seat is reserved", and the first row stays as it was.
- If Supabase fails or takes longer than 8 seconds, the visitor is asked to try again in a few minutes. The cause is in the server logs (on Vercel, the project's Logs) under `[register]`.
- A hidden honeypot field turns away simple bots. There is no other rate limiting, so a determined script could still add rows.

## Registrations in Excel

`/api/registrations.csv` downloads every registration, oldest first, with the columns Name, Email and Registered (IST). It asks for a sign-in: any user name, with `REGISTRATIONS_EXPORT_PASSWORD` as the password. Until that variable is set to at least 20 characters, the link answers "Not found".

The link does not limit wrong guesses, so use a long random password rather than one you would type from memory. This makes one:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

**Excel for Windows** keeps a table you can refresh:

1. Data > Get Data > From Other Sources > From Web.
2. Enter `https://<your-site>/api/registrations.csv` and click OK.
3. When Excel asks how to connect, choose **Basic**, enter any user name and the export password, and click **Connect**.
4. Click **Load**.

Data > Refresh All fetches new sign-ups. To refresh without clicking, open Data > Queries & Connections, right-click the query, choose Properties, and turn on "Refresh every … minutes" or "Refresh data when opening the file".

Excel keeps the password on that computer (Data > Get Data > Data Source Settings), not in the workbook. Someone you send the workbook to is asked for it when they refresh. The workbook itself still holds every name and email it has loaded, so only send it to people who may see the whole list.

**Excel for Mac and Excel on the web:** open the link in a browser, sign in with the same details, and open the downloaded file in Excel. It is a copy, so download it again to see new sign-ups.

**Straight from Supabase:** open Table Editor > `registrations` and export the table as CSV.

A name that starts with `=`, `+`, `-` or `@` gets a leading `'` in the export, so Excel shows it as text instead of running it as a formula.

To check the link from a terminal:

```bash
curl -u excel:YOUR_EXPORT_PASSWORD https://<your-site>/api/registrations.csv
```

## Members area

Members sign up free with email and password or Google, at `/sign-up`. A free account gets the dashboard, announcements, the live session schedule and every lesson marked free. Each course is bought once through Razorpay, and buying one opens all of its lessons, its own chat room, its live session links and the members lounge. The team runs everything from `/admin`.

**Setting it up:**

1. In the Supabase SQL Editor, run `supabase/migrations/20261105120000_create_members.sql`, then `supabase/migrations/20261105180000_members_features.sql`, after the registrations migration. The second one also creates the two storage buckets: `avatars` (public profile photos) and `lesson-resources` (private lesson files, up to 50 MB each).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable key starts with `sb_publishable_`). Keep `SUPABASE_SECRET_KEY` set too: payments and the members list need it.
3. In Supabase, Authentication > URL Configuration: set the Site URL to the live address, and add `https://<your-site>/auth/callback` and `http://localhost:3000/auth/callback` to the Redirect URLs.
4. For Google sign-in, create an OAuth client (type: Web application) in Google Cloud Console with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste its client ID and secret into Supabase under Authentication > Sign In / Providers > Google.
5. Sign up on the site, then make that account the first admin in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

6. In Razorpay, copy the API keys into `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Add a webhook for `https://<your-site>/api/razorpay/webhook` with the events `order.paid`, `payment.captured` and `refund.processed`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. Test keys (`rzp_test_`) work end to end before the account's KYC is approved.
7. Keep the business details in `business` in `src/lib/members-content.ts` up to date. They appear on `/terms`, `/privacy`, `/refunds` and `/contact`, which Razorpay checks before approving the account.
8. Supabase's built-in email sender only sends a few emails an hour. Before launch, add your own SMTP sender under Authentication > Emails.

**Videos:** paste a YouTube or Vimeo link into a lesson. Only members who may watch a lesson are ever sent its video ID. But anyone who has a YouTube link can still watch the video, so put paid lessons on Vimeo with privacy set to "Hide from Vimeo" and embedding allowed only on your domain.

**Payments:** the buyer pays in Razorpay Checkout, and the site checks Razorpay's signature before opening the course. The webhook records the same purchase if the buyer closes the tab first, and a full refund in Razorpay takes the course away again. The price always comes from the database, never from the browser.

**For members:** a progress ring on each course, lessons ticked off with "Mark as complete", worksheets and links under each lesson, a profile photo and bio, and a notification bell for new announcements, replies to their messages, and live sessions starting within a day. On phones, the members area has a bottom tab bar.

**Community:** members reply to a message from its ⋯ menu, open someone's card by tapping their name, and report a message. Admins pin a message to the top of a room, mute someone in one room (for an hour, a day or until lifted), or remove a message from the same menu.

**Admin jobs:** add courses, lessons and lesson resources, publish announcements, schedule live sessions with Zoom or Meet links, add a course to a member by hand, stop a member posting everywhere, set each room's topic, make a room read-only or put it in slow mode (Admin > Chat), and work through reported messages (Admin > Reports). The overview has daily charts of sign-ups and sales, and members and purchases download as CSV.

To make someone else an admin, run the same SQL with their email. The admin panel can't do this on purpose.

## Changing things

- **Words:** the landing page's copy is in `src/lib/content.ts`, and the members area's in `src/lib/members-content.ts`.
- **Colours and type:** tokens and type classes are in `src/app/globals.css`. Each section sets its colours through `data-stock`.
- **Regenerating the hero crop and share image:** `node scripts/make-assets.mjs`.
- **Turning WebGL off:** set `NEXT_PUBLIC_HORIZON_WEBGL=0`. The sun then shows as a static SVG, as it already does for reduced-motion users and slower devices.
