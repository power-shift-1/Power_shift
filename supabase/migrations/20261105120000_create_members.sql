-- The members area: accounts, courses and lessons, purchases, announcements, live sessions and chat.
-- Run once, after 20261104120000_create_registrations.sql, in the SQL Editor or with `supabase db push`.
--
-- Every table has row level security. Signed-in members read through the publishable key, so these
-- policies are the real access rules. Payments are written only by the site's server with the secret key.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  role text not null default 'member' check (role in ('member', 'admin')),
  -- True when the account's email had already reserved a masterclass seat.
  attended_masterclass boolean not null default false,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (btrim(title) <> '' and char_length(title) <= 160),
  summary text not null default '' check (char_length(summary) <= 2000),
  cover_url text check (cover_url is null or char_length(cover_url) <= 2048),
  -- Razorpay's smallest charge is one rupee.
  price_paise integer not null check (price_paise between 100 and 10000000),
  is_published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (btrim(title) <> '' and char_length(title) <= 160),
  summary text not null default '' check (char_length(summary) <= 2000),
  is_free boolean not null default false,
  duration_s integer check (duration_s is null or duration_s >= 0),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index lessons_course_idx on public.lessons (course_id, sort);

-- Kept apart from lessons so a locked lesson's video ID never leaves the database.
create table public.lesson_media (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  provider text not null check (provider in ('youtube', 'vimeo')),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  -- The h= part of a private Vimeo link.
  vimeo_hash text check (vimeo_hash is null or vimeo_hash ~ '^[0-9a-f]{6,32}$')
);

-- One row per Razorpay order the site creates. Written only by the server.
create table public.orders (
  id text primary key check (id ~ '^order_[A-Za-z0-9]+$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'created' check (status in ('created', 'paid')),
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);

-- Owning a course. Paid through Razorpay, or granted by an admin.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  source text not null check (source in ('razorpay', 'admin')),
  amount_paise integer not null default 0 check (amount_paise >= 0),
  order_id text references public.orders (id),
  payment_id text unique check (payment_id is null or payment_id ~ '^pay_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_recent_idx on public.lesson_progress (user_id, last_seen_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> '' and char_length(title) <= 160),
  body text not null default '' check (char_length(body) <= 5000),
  -- Null: for every member. Otherwise only for that course's buyers.
  course_id uuid references public.courses (id) on delete cascade,
  -- Null keeps it a draft.
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> '' and char_length(title) <= 160),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min between 5 and 600),
  -- Null: open to every member. Otherwise only that course's buyers can join.
  course_id uuid references public.courses (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index live_sessions_starts_idx on public.live_sessions (starts_at);

-- Kept apart so the joining link only reaches people who may join.
create table public.live_session_links (
  session_id uuid primary key references public.live_sessions (id) on delete cascade,
  join_url text not null check (join_url ~ '^https://' and char_length(join_url) <= 2048)
);

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> '' and char_length(name) <= 160),
  -- Null: the members lounge, for anyone who owns a course. Otherwise that course's room.
  course_id uuid unique references public.courses (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Copied from the author's profile when posted, so members never need to read each other's profiles.
  author_name text not null default '',
  author_avatar text,
  body text not null check (btrim(body) <> '' and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_room_idx on public.chat_messages (room_id, id desc);
create index chat_messages_user_idx on public.chat_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Access helpers. Security definer so policies can call them without recursing into RLS.
-- ---------------------------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and banned_at is not null);
$$;

create function public.has_course_access(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.purchases
    where user_id = auth.uid() and course_id = target and status = 'paid'
  );
$$;

-- Anyone signed in may see a published course and its outline.
create function public.course_is_visible(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (select 1 from public.courses where id = target and is_published);
$$;

create function public.can_watch_lesson(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = target
      and (public.has_course_access(c.id) or (l.is_free and c.is_published))
  );
$$;

create function public.owns_any_course() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.purchases where user_id = auth.uid() and status = 'paid'
  );
$$;

create function public.can_access_room(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id = target
      and (case when r.course_id is null then public.owns_any_course() else public.has_course_access(r.course_id) end)
  );
$$;

create function public.can_join_session(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = target and (s.course_id is null or public.has_course_access(s.course_id))
  );
$$;

-- Admins ban or unban a member. Role changes stay in the SQL Editor on purpose.
create function public.admin_set_banned(target uuid, banned boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can ban members.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'Admins cannot ban themselves.' using errcode = '22023';
  end if;
  update public.profiles set banned_at = case when banned then now() else null end where id = target;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- Every new account gets a profile. Google sign-ups bring their name and picture.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, attended_masterclass)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120),
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 2048),
    exists (select 1 from public.registrations r where lower(r.email) = lower(new.email))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Each course gets its own chat room, named after it.
create function public.handle_course_room() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.chat_rooms (slug, name, course_id) values (new.slug, new.title, new.id);
  elsif new.title is distinct from old.title or new.slug is distinct from old.slug then
    update public.chat_rooms set name = new.title, slug = new.slug where course_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_course_saved
  after insert or update on public.courses
  for each row execute function public.handle_course_room();

-- Fills in the author and limits posting to 5 messages in 10 seconds.
create function public.prepare_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recent integer;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.body := btrim(new.body);
  select coalesce(nullif(p.full_name, ''), 'Member'), p.avatar_url
    into new.author_name, new.author_avatar
    from public.profiles p where p.id = new.user_id;
  select count(*) into recent from public.chat_messages
    where user_id = new.user_id and created_at > now() - interval '10 seconds';
  if recent >= 5 then
    raise exception 'You are sending messages too quickly.' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger before_chat_message
  before insert on public.chat_messages
  for each row execute function public.prepare_chat_message();

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_media enable row level security;
alter table public.orders enable row level security;
alter table public.purchases enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.announcements enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_session_links enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- Nothing here is public: signed-out visitors (anon) get no access at all.
revoke all on table
  public.profiles, public.courses, public.lessons, public.lesson_media, public.orders, public.purchases,
  public.lesson_progress, public.announcements, public.live_sessions, public.live_session_links,
  public.chat_rooms, public.chat_messages
from anon;

-- Members may change only their own name and picture.
revoke update on table public.profiles from authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;
create policy "Read own profile, admins read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Read published courses" on public.courses
  for select to authenticated using (is_published or public.is_admin());
create policy "Admins manage courses" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read lessons of visible courses" on public.lessons
  for select to authenticated using (public.course_is_visible(course_id));
create policy "Admins manage lessons" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Watch free or owned lessons" on public.lesson_media
  for select to authenticated using (public.can_watch_lesson(lesson_id));
create policy "Admins manage lesson media" on public.lesson_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "Read own purchases" on public.purchases
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins grant and revoke courses" on public.purchases
  for all to authenticated using (public.is_admin()) with check (public.is_admin() and source = 'admin');

create policy "Own progress" on public.lesson_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_watch_lesson(lesson_id));

create policy "Read published announcements" on public.announcements
  for select to authenticated
  using (
    public.is_admin()
    or (published_at <= now() and (course_id is null or public.has_course_access(course_id)))
  );
create policy "Admins manage announcements" on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read live sessions" on public.live_sessions
  for select to authenticated using (true);
create policy "Admins manage live sessions" on public.live_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read joining links you may use" on public.live_session_links
  for select to authenticated using (public.can_join_session(session_id));
create policy "Admins manage joining links" on public.live_session_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Every member sees the room list, so free members can see what buying a course opens up.
create policy "List rooms" on public.chat_rooms
  for select to authenticated using (true);
create policy "Admins manage rooms" on public.chat_rooms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read rooms you belong to" on public.chat_messages
  for select to authenticated using (public.can_access_room(room_id));
create policy "Post in rooms you belong to" on public.chat_messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_room(room_id) and not public.is_banned());
create policy "Admins remove messages" on public.chat_messages
  for delete to authenticated using (public.is_admin());

-- Members cannot edit messages after posting.
revoke update on table public.chat_messages from authenticated;

-- ---------------------------------------------------------------------------------------------
-- Live chat and seed data
-- ---------------------------------------------------------------------------------------------

-- Realtime delivers new and removed messages, filtered by the select policy above.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;

insert into public.chat_rooms (slug, name) values ('lounge', 'Members lounge');
