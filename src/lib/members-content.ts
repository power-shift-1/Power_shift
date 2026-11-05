// Copy for the members area, sign-in pages and legal pages. The landing page's copy stays in content.ts.

export const memberNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/chat", label: "Community" },
  { href: "/account", label: "Account" },
] as const;

export const mastheadMember = {
  signedOut: "Sign in",
  signedIn: "My dashboard",
} as const;

export const auth = {
  notConfigured:
    "Member accounts aren't switched on yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, as the README explains.",
  signIn: {
    eyebrow: "Members",
    title: "Welcome back.",
    lead: "Sign in to continue your courses and join the community.",
    submit: "Sign in",
    pending: "Signing in…",
    google: "Continue with Google",
    forgot: "Forgot your password?",
    switchPrompt: "New here?",
    switchLink: "Create a free account",
    badCredentials: "That email and password don't match. Please try again.",
    unconfirmed: "Please confirm your email first. We sent you a link when you signed up.",
    linkFailed: "That link has expired or was already used. Please sign in, or ask for a new link.",
  },
  signUp: {
    eyebrow: "Join free",
    title: "Start your Power Shift.",
    lead: "A free account gives you the member dashboard, announcements and free lessons. Courses can be added any time.",
    submit: "Create my account",
    pending: "Creating your account…",
    switchPrompt: "Already a member?",
    switchLink: "Sign in",
    checkInbox: "Check your inbox. We sent a link to confirm your email, and it signs you in.",
  },
  forgot: {
    eyebrow: "Password",
    title: "Reset your password.",
    lead: "Enter your account's email and we'll send you a link to choose a new password.",
    submit: "Send the link",
    pending: "Sending…",
    sent: "If that email has an account, a reset link is on its way. It works once, for one hour.",
    back: "Back to sign in",
  },
  newPassword: {
    title: "Choose a new password.",
    submit: "Save new password",
    pending: "Saving…",
    saved: "Your password has been changed.",
  },
  fields: {
    name: "Your name",
    email: "Your email",
    password: "Password",
    newPassword: "New password",
    passwordHint: "At least 8 characters.",
  },
  errors: {
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    password: "Please use at least 8 characters.",
    passwordLong: "Please use at most 72 characters.",
    generic: "Something went wrong on our side. Please try again in a minute.",
    rateLimited: "Too many attempts. Please wait a few minutes and try again.",
    google: "Google sign-in isn't available right now. Please use your email instead.",
  },
} as const;

export const dashboard = {
  eyebrow: "Your dashboard",
  greeting: (name: string) => `Hello, ${name}.`,
  lead: "Pick up where you left off, and see what's coming up.",
  continueTitle: "Continue watching",
  continueEmpty: "Lessons you watch will show up here.",
  coursesTitle: "Your courses",
  coursesEmpty: "You haven't added a course yet. Free lessons are open to every member.",
  browse: "Browse courses",
  announcementsTitle: "Announcements",
  announcementsEmpty: "No announcements yet.",
  sessionsTitle: "Upcoming live sessions",
  sessionsEmpty: "No sessions are scheduled right now.",
  join: "Join session",
  joinLocked: "For course members",
  attendee: "Thank you for joining the masterclass. Your seat there is linked to this account.",
  upNext: "Up next",
  resume: "Resume",
  startFirst: "Start with a free lesson",
  completedLessons: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"} completed`,
  coursesOwned: (n: number) => `${n} ${n === 1 ? "course" : "courses"}`,
} as const;

export const courses = {
  eyebrow: "Courses",
  title: "Learn at your own pace.",
  lead: "Every course has free lessons to start with. Buy a course once and keep it for good.",
  empty: "Courses are on their way. Check back soon.",
  owned: "Yours",
  draft: "Draft",
  lessons: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
  free: "Free",
  locked: "Locked",
  start: "Start the course",
  open: "Open the course",
  outline: "What's inside",
  buy: (price: string) => `Buy this course · ${price}`,
  buyPending: "Opening checkout…",
  buyConfirming: "Confirming your payment…",
  buyDone: "Payment received. The course is yours.",
  buyFailed: "The payment didn't go through. You haven't been charged twice, so you can try again.",
  buyUnavailable: "Payments aren't switched on yet.",
  buyNote: "One-time payment through Razorpay: UPI, cards, net banking and wallets.",
  lockedTitle: "This lesson is part of the course.",
  lockedLead: "Buy the course to watch every lesson and join its community room.",
  previous: "Previous lesson",
  next: "Next lesson",
  back: "All lessons",
  noVideo: "The video for this lesson is being prepared.",
  markComplete: "Mark as complete",
  completed: "Completed",
  undoComplete: "Mark as not complete",
  progress: (done: number, total: number) => `${done} of ${total} lessons complete`,
  courseComplete: "Course complete. Well done!",
  resourcesTitle: "Resources",
  download: "Download",
  openLink: "Open",
  resourceUnavailable: "This file can't be opened right now. Please try again shortly.",
} as const;

export const community = {
  eyebrow: "Community",
  title: "Talk it through.",
  lead: "Each course has its own room, and the members lounge is open to everyone who owns a course.",
  lounge: "Members lounge",
  open: "Open",
  locked: "Buy any course to join",
  lockedCourse: "Buy this course to join",
  lockedTitle: "This room is for course members.",
  placeholder: "Write a message…",
  send: "Send",
  sending: "Sending…",
  loadOlder: "Show older messages",
  empty: "No messages yet. Say hello!",
  remove: "Remove",
  removeConfirm: "Remove this message for everyone?",
  banned: "Your account can read the community but can't post. Contact us if you think this is a mistake.",
  tooFast: "You're sending messages quickly. Please wait a few seconds.",
  failed: "Your message didn't send. Please try again.",
  live: "Live",
  connecting: "Connecting…",
  reply: "Reply",
  replyingTo: (name: string) => `Replying to ${name}`,
  cancelReply: "Cancel reply",
  pinned: "Pinned",
  pin: "Pin",
  unpin: "Unpin",
  report: "Report",
  reportTitle: "Report this message",
  reportReason: "What's wrong with it? (optional)",
  reportSend: "Send report",
  reportThanks: "Thank you. The team will take a look.",
  cancel: "Cancel",
  done: "Done",
  reportFailed: "The report didn't send. You may have reported this message already.",
  roomLocked: "This room is read-only for now.",
  slowMode: (seconds: number) => `Slow mode is on: one message every ${seconds < 60 ? `${seconds} seconds` : `${Math.round(seconds / 60)} min`}.`,
  slowWait: "Slow mode is on. Please wait a little before your next message.",
  muted: (until: string | null) => (until ? `You're muted in this room until ${until}.` : "You're muted in this room."),
  mute: "Mute",
  muteOptions: [
    { minutes: 60, label: "Mute for 1 hour", short: "1 hour" },
    { minutes: 1440, label: "Mute for 24 hours", short: "24 hours" },
    { minutes: 0, label: "Mute until lifted", short: "Until lifted" },
  ],
  memberCard: "About",
  noBio: "No bio yet.",
} as const;

export const notifications = {
  title: "Notifications",
  open: (count: number) => (count ? `Notifications, ${count} unread` : "Notifications"),
  empty: "You're all caught up.",
  markAll: "Mark all as read",
  clear: "Clear",
  sessionSoon: (when: string) => `Live session ${when}`,
} as const;

export const account = {
  eyebrow: "Account",
  title: "Your account.",
  profileTitle: "Profile",
  save: "Save",
  saving: "Saving…",
  saved: "Saved.",
  purchasesTitle: "Purchases",
  purchasesEmpty: "No purchases yet.",
  refunded: "Refunded",
  granted: "Added by the team",
  changePassword: "Change password",
  signOut: "Sign out",
  attendee: "Masterclass attendee",
  bio: "A line about you",
  bioHint: "Shown to members you share a community room with. Up to 500 characters.",
  photo: "Profile photo",
  photoHint: "JPG, PNG or WebP, up to 2 MB.",
  photoChange: "Change photo",
  photoRemove: "Remove photo",
  photoUploading: "Uploading…",
  photoSaved: "Photo updated.",
  photoTooBig: "Please choose a picture under 2 MB.",
  photoWrongType: "Please choose a JPG, PNG or WebP picture.",
  photoFailed: "The photo didn't upload. Please try again.",
  admin: "Open the admin panel",
} as const;

/**
 * Business details for the legal pages, which Razorpay checks before it approves the account.
 * A phone or address left as null is left off the Contact page.
 */
export const business: {
  legalName: string;
  email: string;
  phone: string | null;
  address: string | null;
  refundDays: number;
  updated: string;
} = {
  legalName: "The Power Shift (Manisha Agrawal)",
  email: "powershift988@gmail.com",
  phone: null,
  address: null,
  refundDays: 2,
  updated: "5 November 2026",
};

export const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
] as const;
