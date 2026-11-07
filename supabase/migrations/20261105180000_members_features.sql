-- The members area, part 2: lesson completion, lesson resources, profile pictures and bios,
-- notifications, chat replies, pinned messages, locked and slow rooms, reports and mutes,
-- and the admin dashboard's member search and daily stats.
-- Run once, after 20261105120000_create_members.sql.

-- ---------------------------------------------------------------------------------------------
-- Tables and columns
-- ---------------------------------------------------------------------------------------------

alter table public.lesson_progress add column completed_at timestamptz;

alter table public.profiles add column bio text not null default '' check (char_length(bio) <= 500);
grant update (bio) on table public.profiles to authenticated;

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null check (btrim(title) <> '' and char_length(title) <= 160),
  kind text not null check (kind in ('file', 'link')),
  -- A link opens in a new tab. A file lives in the private lesson-resources bucket at storage_path.
  url text check (url is null or (url ~ '^https://' and char_length(url) <= 2048)),
  storage_path text unique check (storage_path is null or char_length(storage_path) <= 400),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  check ((kind = 'link' and url is not null and storage_path is null) or (kind = 'file' and storage_path is not null and url is null))
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id, sort);

-- Written only by the triggers below. Members read and dismiss their own.
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('announcement', 'reply', 'report')),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 300),
  link text check (link is null or (link ~ '^/' and char_length(link) <= 300)),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- What it is about, so removing the message or announcement removes the notification too (see below).
  message_id bigint,
  announcement_id uuid references public.announcements (id) on delete cascade
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.chat_rooms
  add column topic text not null default '' check (char_length(topic) <= 300),
  add column is_locked boolean not null default false,
  add column slow_mode_seconds integer not null default 0 check (slow_mode_seconds between 0 and 3600);

alter table public.chat_messages
  add column reply_to bigint references public.chat_messages (id) on delete set null,
  -- Copied from the message being answered, so a reply still reads well after the original is removed.
  add column reply_author text,
  add column reply_excerpt text,
  add column pinned_at timestamptz,
  -- Set by the database from the author's role, so a member can't pass as the team by changing their name.
  add column author_is_admin boolean not null default false;
create index chat_messages_pinned_idx on public.chat_messages (room_id, pinned_at desc) where pinned_at is not null;

alter table public.notifications
  add constraint notifications_message_fk foreign key (message_id) references public.chat_messages (id) on delete cascade;

create table public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id bigint not null references public.chat_messages (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (message_id, reporter_id)
);
create index chat_reports_open_idx on public.chat_reports (status, created_at desc);

-- A mute stops one member posting in one room, until muted_until (or until lifted, when null).
create table public.chat_mutes (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ---------------------------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------------------------

create function public.is_muted(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_mutes
    where room_id = target and user_id = auth.uid() and (muted_until is null or muted_until > now())
  );
$$;

-- One rule for posting: a member of the room, not banned, not muted there, and the room open (admins always may).
create function public.can_post_in_room(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_access_room(target)
    and not public.is_banned()
    and not public.is_muted(target)
    and (public.is_admin() or exists (select 1 from public.chat_rooms where id = target and not is_locked));
$$;

-- Not banned, at most 20 reports an hour, and only messages in rooms you can read that aren't your own.
create function public.can_report(target bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.is_banned()
    and (select count(*) from public.chat_reports r where r.reporter_id = auth.uid() and r.created_at > now() - interval '1 hour') < 20
    and exists (
      select 1 from public.chat_messages m
      where m.id = target and m.user_id <> auth.uid() and public.can_access_room(m.room_id)
    );
$$;

-- What another member sees on someone's card in chat: only people they share a room with.
create function public.member_card(target uuid)
returns table (full_name text, avatar_url text, bio text, is_team boolean)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.avatar_url, p.bio, p.role = 'admin' from public.profiles p
  where p.id = target
    and auth.uid() is not null
    and (
      public.is_admin()
      or p.id = auth.uid()
      or exists (select 1 from public.chat_messages m where m.user_id = target and public.can_access_room(m.room_id))
    );
$$;

-- Admins only: members with their sign-in emails, newest first, filtered by name or email.
create function public.admin_members(search text default '', page_size integer default 50, page_offset integer default 0)
returns table (
  member_id uuid,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  role text,
  attended_masterclass boolean,
  banned_at timestamptz,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list members.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.avatar_url, p.bio, p.role, p.attended_masterclass, p.banned_at,
           p.created_at, u.last_sign_in_at, count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(search, '') = ''
       or p.full_name ilike '%' || search || '%'
       or u.email ilike '%' || search || '%'
    -- The id breaks ties, so paging through members never repeats or skips anyone with the same join time.
    order by p.created_at desc, p.id desc
    limit least(greatest(coalesce(page_size, 50), 1), 5000)
    offset greatest(coalesce(page_offset, 0), 0);
end;
$$;

-- Admins only: blank out a member's name, bio and picture, for profiles that break the community rules.
-- Their uploaded picture files are removed by the site with the storage API.
create function public.admin_clear_profile(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can clear profiles.' using errcode = '42501';
  end if;
  update public.profiles set full_name = '', bio = '', avatar_url = null where id = target;
end;
$$;

-- Admins only: sign-ups, paid purchases and sales per day in India's time zone, oldest first.
create function public.admin_daily_stats(days integer default 30)
returns table (stat_day date, signup_count bigint, purchase_count bigint, sales_paise bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  span integer := least(greatest(coalesce(days, 30), 1), 366);
begin
  if not public.is_admin() then
    raise exception 'Only admins can read stats.' using errcode = '42501';
  end if;
  return query
    select d::date,
      (select count(*) from public.profiles p where (p.created_at at time zone 'Asia/Kolkata')::date = d::date),
      (select count(*) from public.purchases pu
        where pu.source = 'razorpay' and pu.status = 'paid' and (pu.created_at at time zone 'Asia/Kolkata')::date = d::date),
      (select coalesce(sum(pu.amount_paise), 0)::bigint from public.purchases pu
        where pu.source = 'razorpay' and pu.status = 'paid' and (pu.created_at at time zone 'Asia/Kolkata')::date = d::date)
    from generate_series(today - (span - 1), today, interval '1 day') as d
    order by 1;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- Replaces part 1's version: adds replies, slow mode and pins on top of the author copy and rate limit.
create or replace function public.prepare_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recent integer;
  slow integer;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.body := btrim(new.body);
  new.pinned_at := null;

  select coalesce(nullif(p.full_name, ''), 'Member'), p.avatar_url, p.role = 'admin'
    into new.author_name, new.author_avatar, new.author_is_admin
    from public.profiles p where p.id = new.user_id;
  new.author_is_admin := coalesce(new.author_is_admin, false);

  -- A reply must answer a message in the same room.
  new.reply_author := null;
  new.reply_excerpt := null;
  if new.reply_to is not null then
    select m.author_name, left(m.body, 140) into new.reply_author, new.reply_excerpt
      from public.chat_messages m where m.id = new.reply_to and m.room_id = new.room_id;
    if not found then
      new.reply_to := null;
    end if;
  end if;

  select count(*) into recent from public.chat_messages
    where user_id = new.user_id and created_at > now() - interval '10 seconds';
  if recent >= 5 then
    raise exception 'You are sending messages too quickly.' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  select r.slow_mode_seconds into slow from public.chat_rooms r where r.id = new.room_id;
  if coalesce(slow, 0) > 0 and not public.is_admin() and exists (
    select 1 from public.chat_messages
    where user_id = new.user_id and room_id = new.room_id and created_at > now() - make_interval(secs => slow)
  ) then
    raise exception 'This room is in slow mode.' using errcode = 'P0001', hint = 'slow_mode';
  end if;

  return new;
end;
$$;

create function public.notify_chat_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.reply_to is not null then
    insert into public.notifications (user_id, kind, title, body, link, message_id)
    select m.user_id, 'reply', left(new.author_name || ' replied to you', 200), left(new.body, 140), '/chat/' || r.slug, new.id
    from public.chat_messages m
    join public.chat_rooms r on r.id = new.room_id
    where m.id = new.reply_to and m.user_id <> new.user_id;
  end if;
  return new;
end;
$$;

create trigger after_chat_message
  after insert on public.chat_messages
  for each row execute function public.notify_chat_reply();

-- A removed message takes its words with it: replies keep only the fact that they were replies.
create function public.scrub_replies() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_messages set reply_author = null, reply_excerpt = null where reply_to = old.id;
  return old;
end;
$$;

create trigger before_chat_message_delete
  before delete on public.chat_messages
  for each row execute function public.scrub_replies();

-- Publishing an announcement notifies everyone who can read it, once.
create function public.notify_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.published_at is null or new.published_at > now() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;
  insert into public.notifications (user_id, kind, title, body, link, announcement_id)
  select p.id, 'announcement', left(new.title, 200), left(new.body, 140), '/dashboard', new.id
  from public.profiles p
  where new.course_id is null
     or exists (
       select 1 from public.purchases pu
       where pu.user_id = p.id and pu.course_id = new.course_id and pu.status = 'paid'
     );
  return new;
end;
$$;

create trigger on_announcement_published
  after insert or update of published_at on public.announcements
  for each row execute function public.notify_announcement();

-- Admins hear about a message once, on its first open report, however many members report it.
create function public.notify_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.chat_reports r
    where r.message_id = new.message_id and r.id <> new.id and r.status = 'open'
  ) then
    return new;
  end if;
  insert into public.notifications (user_id, kind, title, body, link, message_id)
  select p.id, 'report', 'A message was reported', left(m.author_name || ': ' || m.body, 140), '/admin/reports', new.message_id
  from public.profiles p
  join public.chat_messages m on m.id = new.message_id
  where p.role = 'admin';
  return new;
end;
$$;

-- Profile pictures may only be the member's own upload in the avatars bucket, or, from Google sign-in,
-- their Google picture. Anything else could track everyone who views it, or point back at this site.
create function public.check_avatar_url() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  file text;
begin
  if new.avatar_url is null or (tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url) then
    return new;
  end if;
  if tg_op = 'INSERT'
     and new.avatar_url ~ '^https://lh[0-9]\.googleusercontent\.com/[A-Za-z0-9._~/=-]+$'
     and exists (select 1 from auth.users u where u.id = new.id and u.raw_app_meta_data ->> 'provider' = 'google') then
    return new;
  end if;
  file := substring(new.avatar_url from '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/(.+)$');
  if file ~ ('^' || new.id::text || '/[A-Za-z0-9._-]{1,200}$')
     and exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = file) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.avatar_url := null;
    return new;
  end if;
  raise exception 'That picture address is not allowed.' using errcode = '22023';
end;
$$;

create trigger before_profile_avatar
  before insert or update of avatar_url on public.profiles
  for each row execute function public.check_avatar_url();

-- Name and picture changes reach the member's past messages, so a removed photo stops showing.
create function public.refresh_author_copies() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_messages
    set author_name = coalesce(nullif(new.full_name, ''), 'Member'), author_avatar = new.avatar_url
    where user_id = new.id;
  return new;
end;
$$;

create trigger after_profile_identity
  after update of full_name, avatar_url on public.profiles
  for each row
  when (new.full_name is distinct from old.full_name or new.avatar_url is distinct from old.avatar_url)
  execute function public.refresh_author_copies();

create trigger on_chat_report
  after insert on public.chat_reports
  for each row execute function public.notify_report();

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.lesson_resources enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_reports enable row level security;
alter table public.chat_mutes enable row level security;

revoke all on table public.lesson_resources, public.notifications, public.chat_reports, public.chat_mutes from anon;

create policy "Resources of lessons you may watch" on public.lesson_resources
  for select to authenticated using (public.can_watch_lesson(lesson_id));
create policy "Admins manage resources" on public.lesson_resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Members may only mark their own notifications read, or clear them.
revoke insert, update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;
create policy "Own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Mark own notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Clear own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Posting now also respects mutes and locked rooms.
drop policy "Post in rooms you belong to" on public.chat_messages;
create policy "Post where you may" on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid() and public.can_post_in_room(room_id));

-- Admins pin and unpin. Members still cannot change messages.
grant update (pinned_at) on table public.chat_messages to authenticated;
create policy "Admins pin messages" on public.chat_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Report messages in your rooms" on public.chat_reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open' and public.can_report(message_id));
create policy "Read own reports, admins read all" on public.chat_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "Admins handle reports" on public.chat_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete reports" on public.chat_reports
  for delete to authenticated using (public.is_admin());

create policy "See own mutes, admins see all" on public.chat_mutes
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins manage mutes" on public.chat_mutes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A banned member keeps reading but can no longer change their name, bio or picture.
drop policy "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() and not public.is_banned())
  with check (id = auth.uid() and not public.is_banned());

-- Rooms of unpublished courses stay hidden from members, in the database and not just on the page.
drop policy "List rooms" on public.chat_rooms;
create policy "List rooms" on public.chat_rooms
  for select to authenticated using (course_id is null or public.course_is_visible(course_id));

-- ---------------------------------------------------------------------------------------------
-- File storage
-- ---------------------------------------------------------------------------------------------

-- Profile pictures are public, at avatars/<user id>/<file>. Lesson files are private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('lesson-resources', 'lesson-resources', false, 52428800, null)
on conflict (id) do nothing;

create policy "Members manage their own picture" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_banned());

create policy "Admins manage lesson files" on storage.objects
  for all to authenticated
  using (bucket_id = 'lesson-resources' and public.is_admin())
  with check (bucket_id = 'lesson-resources' and public.is_admin());

create policy "Download lesson files you may watch" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-resources'
    and exists (select 1 from public.lesson_resources r where r.storage_path = name and public.can_watch_lesson(r.lesson_id))
  );

-- ---------------------------------------------------------------------------------------------
-- Live updates
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
