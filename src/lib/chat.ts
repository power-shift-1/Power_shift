export type ChatMessage = {
  id: number;
  room_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  body: string;
  created_at: string;
  reply_to: number | null;
  reply_author: string | null;
  reply_excerpt: string | null;
  pinned_at: string | null;
  /** Set by the database from the author's role, so it can be trusted where the name can't. */
  author_is_admin: boolean;
};

export type RoomState = {
  id: string;
  topic: string;
  isLocked: boolean;
  slowModeSeconds: number;
  /** When this member's mute ends, null for "until lifted", or undefined when not muted. */
  mutedUntil?: string | null;
};

export type MemberCard = { full_name: string; avatar_url: string | null; bio: string; is_team: boolean };

export const MESSAGE_FIELDS =
  "id, room_id, user_id, author_name, author_avatar, body, created_at, reply_to, reply_author, reply_excerpt, pinned_at, author_is_admin";
export const MESSAGE_PAGE = 50;
export const PINNED_LIMIT = 3;
