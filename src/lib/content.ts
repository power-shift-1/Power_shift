// All page copy lives here, word for word from the Figma Make source.
// Sections import from this file, so wording only ever changes in one place.

export const brand = {
  name: "The Power Shift",
  tagline: "Career growth without personal sacrifice",
  footerLine: "Manisha Agrawal · Leadership Coach",
  symbol: "/power-shift-symbol.webp",
} as const;

/**
 * The live session's start time, as an ISO 8601 string with an offset, for
 * example "2026-12-05T19:00:00+05:30". While this is null the page says
 * "Date announced soon" and the floating pill runs a repeating 24-hour timer.
 * Setting a date replaces that timer with a real countdown.
 */
export const MASTERCLASS_STARTS_AT: string | null = null;

export const navLinks = [
  { href: "#discover", label: "What you’ll discover" },
  { href: "#about", label: "Meet Manisha" },
  { href: "#faq", label: "FAQ" },
] as const;

export const navCta = "Reserve my seat!";

export const hero = {
  eyebrow: "Free live masterclass for working professionals with 12 years or more of experience",
  title: "You’ve worked hard for years.",
  titleAccent: "So why does your career still feel stuck?",
  lead: "Discover three powerful shifts to break free from overthinking, self-doubt and career stagnation—without sacrificing your peace, relationships or joy. The longer you wait for perfect clarity, the more opportunities can pass unnoticed.",
  cta: "Reserve my free seat!",
  format: "Live on Zoom",
  formatDetail: "Date announced soon · Free to attend",
  hostMonogram: "MA",
  hostPrefix: "With",
  hostName: "Manisha Agrawal",
  hostRole: "Leadership Coach · 20 years corporate experience",
  quote: "You’re Just One Shift Away.",
  image: {
    src: "/manisha-hero.webp",
    alt: "Manisha Agrawal, leadership coach",
    width: 1448,
    height: 1086,
  },
} as const;

export const recognition = {
  eyebrow: "Does this feel familiar?",
  title: "You’ve come so far.",
  titleAccent: "So why aren’t you moving forward?",
  lead: "On paper, you are doing well. Deep inside, you know you are capable of so much more.",
  struggles: [
    {
      title: "You feel stagnant",
      copy: "You’re putting in the effort, but the growth and opportunities aren’t following.",
    },
    {
      title: "You overthink everything",
      copy: "You analyse, question and imagine what could go wrong until action feels overwhelming.",
    },
    {
      title: "You doubt your readiness",
      copy: "Despite years of experience, you wonder whether you are capable enough for the next level.",
    },
    {
      title: "You hold back your voice",
      copy: "You have valuable ideas, but don’t always know how to communicate your value.",
    },
    {
      title: "Your dreams keep waiting",
      copy: "You keep telling yourself you will focus on what you want once things settle down.",
    },
    {
      title: "You come last",
      copy: "Between work, family and responsibilities, your own needs stay at the bottom of the list.",
    },
  ],
  closing:
    "You know what you should be doing. But somehow, you keep falling back into the same patterns. Don’t let another season pass while you wait to feel completely ready.",
  cta: "Yes, I’m ready to move forward!",
} as const;

export const cost = {
  eyebrow: "The hidden cost",
  title: "Feeling stuck affects more than",
  titleAccent: "your career.",
  lead: "Over time, it quietly touches the things that matter most—the way you feel, the way you trust yourself and the way you connect with others.",
  items: [
    {
      title: "Your Calm",
      copy: "Your mind rarely switches off. Even at home, you replay conversations, question decisions and carry the noise of the day.",
    },
    {
      title: "Your Confidence",
      copy: "Every big decision comes with a hundred questions. The longer you hesitate, the harder it becomes to trust yourself.",
    },
    {
      title: "Your Connections",
      copy: "Managing everything leaves little energy for the people you love—or for your own interests, dreams and happiness.",
    },
  ],
} as const;

export const possibility = {
  eyebrow: "A different way forward",
  title: "Imagine if your next level didn’t require",
  titleAccent: "more sacrifice.",
  lead: "Imagine feeling excited about your future again—not because every challenge has disappeared, but because you trust yourself to navigate what comes.",
  prose: [
    "Know what you want and where you are going. Make decisions without endlessly second-guessing yourself, and speak up so your contribution becomes visible.",
    "Pursue opportunities before you feel perfectly ready. Set healthier boundaries without the guilt, and grow while staying connected to yourself and your family.",
  ],
} as const;

export const pillars = {
  eyebrow: "Inside the masterclass",
  title: "Discover the 3 pillars to become",
  titleAccent: "unstoppable.",
  lead: "The three shifts that will help you stop living on autopilot and start creating a life of clarity, confidence and meaningful growth.",
  items: [
    {
      label: "Pillar 1",
      title: "Purpose",
      subtitle: "Stop chasing expectations. Start living what matters.",
      copy: "Discover what truly matters to YOU, reconnect with your core values and uncover the deeper WHY behind your choices—so you’re not just working hard, but moving toward a life that feels meaningful and fulfilling.",
      takeaway: "Purpose gives you direction.",
    },
    {
      label: "Pillar 2",
      title: "Power",
      subtitle: "Stop giving away your power. Start trusting yourself.",
      copy: "Discover how fear, self-doubt and the need for approval quietly hold you back—and what it takes to build the confidence, courage and inner strength to speak up, make decisions and stand up for yourself.",
      takeaway: "Power gives you the courage.",
    },
    {
      label: "Pillar 3",
      title: "Progress",
      subtitle: "Stop waiting to feel ready. Start making things happen.",
      copy: "Discover how perfectionism, procrastination and overthinking keep even capable professionals stuck—and how to move beyond these patterns to take bold, massive action toward the goals that matter to you.",
      takeaway: "Progress turns your dreams into reality.",
    },
  ],
  summary:
    "Purpose gives you direction. Power gives you the courage. Progress turns your dreams into reality.",
  summaryDetail:
    "Together, they help you move from simply managing your life to leading it.",
  cta: "Discover the 3 pillars!",
} as const;

export const outcomes = {
  eyebrow: "What you can take away",
  title: "Less busy. More",
  titleAccent: "intentional.",
  lead: "Begin moving towards three outcomes that matter far beyond your job title.",
  items: [
    {
      title: "Calm",
      copy: "A quieter mind and a greater ability to handle pressure without feeling constantly overwhelmed.",
      visualLabel: "A quiet sun resting above calm, flowing lines",
    },
    {
      title: "Confidence",
      copy: "Greater trust in yourself to make decisions, speak up and pursue meaningful opportunities.",
      visualLabel: "A flame-shaped arrow rising above a flowing line",
    },
    {
      title: "Freedom",
      copy: "More freedom to choose, act, set boundaries and enjoy your life without fear or guilt driving you.",
      visualLabel: "An open circular form with flowing lines moving freely beyond it",
    },
  ],
  manifesto: "Because success should feel meaningful on the inside,",
  manifestoAccent: "not just look impressive on the outside.",
} as const;

export const about = {
  eyebrow: "Meet your coach",
  title: "I was achieving my goals.",
  titleAccent: "But I was losing my peace.",
  image: {
    src: "/manisha-coach.webp",
    alt: "Manisha Agrawal standing in a bright lobby, wearing a navy blazer and white trousers",
    width: 1086,
    height: 1448,
  },
  quote: "I didn’t have to become less ambitious to become happier.",
  quoteAuthor: "Manisha Agrawal",
  storyBefore:
    "For nearly 20 years, I built my career in the corporate world. I was ambitious, hardworking and results-driven. I delivered projects, achieved goals and took on responsibility.",
  feedbackLead:
    "Then my boss gave me feedback that changed the way I looked at leadership:",
  feedbackQuote: "“You’ve achieved your goals. But your team feels left behind.”",
  storyAfter: [
    "That moment began a journey into Agile Coaching, mindset, communication and relationships. I learned that I could grow professionally without losing myself along the way.",
    "Today, I help ambitious working professionals—both men and women—reconnect with their confidence, move towards meaningful growth and create more space for the people and things that matter most.",
  ],
  credentials: [
    { value: "20 years", label: "Corporate experience" },
    { value: "Leadership", label: "& Agile coaching" },
    { value: "Practical", label: "Mindset-led approach" },
  ],
} as const;

type Testimonial = {
  name: string;
  /** Initials for the monogram, since clients' photos are never used. Null shows a quotation mark. */
  monogram: string | null;
  /** The programme or role, as the client gave it. */
  detail?: string;
  /** Where the note was shared. */
  source?: string;
  /** The note word for word, one string per paragraph. Only the typography is changed. */
  paragraphs: readonly string[];
  /** Exact phrases the client emphasised, in the order they appear. */
  emphasis?: readonly string[];
};

type TestimonialVideo = {
  name: string;
  youtubeId: string | null;
};

const featuredNote: Testimonial = {
  name: "Sunetra",
  monogram: "S",
  detail: "The Leadership Power Code",
  paragraphs: [
    "After going through your sessions I know how to prioritise, How to be non judgemental... how to be more empathetic, Different leadership styles, how to manage stress and most importantly what is the impact that I am creating with my own behaviour. These sessions were very important for me. I started taking care of myself. I evolved. I became self confident. I know my worth and I don’t depend on others anymore for their validation.",
  ],
  emphasis: ["most importantly what is the impact that I am creating with my own behaviour"],
};

// In reading order. The two from Ruchi Bansal are kept apart, and the long ones clamp on the page.
const testimonialNotes: readonly Testimonial[] = [
  {
    name: "Roopa Mahishi",
    monogram: "RM",
    detail:
      "Gen AI Solutioning | Digital Twin | MLOps Practitioner | Cloud Solutioning | NASSCOM Tech Advisor",
    source: "Leadership coaching · LinkedIn recommendation, April 2025",
    paragraphs: [
      "I had the privilege of undertaking leadership coaching with Manisha, and the experience was nothing short of transformative! Her sessions were a deep dive into self-discovery, clarity, understanding responsibilities, decision-making, and powerful communication. Manisha’s insightful guidance and supportive approach helped me uncover my strengths and identify areas for growth. Her ability to foster clarity and confidence in decision-making is truly remarkable. Plus, her emphasis on effective communication has significantly boosted my leadership skills.",
      "Manisha also provided invaluable techniques for handling emotions, which have been crucial in maintaining composure and resilience in challenging situations. Her powerful leadership techniques and formulae have equipped me with practical tools to lead effectively and inspire my team. What sets Manisha apart is her ability to structure her coaching program according to your specific needs, ensuring a personalized and impactful experience.",
      "I wholeheartedly recommend Manisha to anyone looking to elevate their leadership capabilities. Her expertise, dedication, and passion make her an exceptional coach.",
      "Thank you, Manisha, for your outstanding guidance and support!",
    ],
  },
  {
    name: "Sudha",
    monogram: "S",
    detail: "Limitless Success Program",
    paragraphs: [
      "There were days when I waited for an opportunity to knock my door, or was sitting through my comfort zone, thinking I would never be able to break barriers or that I could achieve excellence beyond a limit. After I started my transformation journey with you, and 6 months now - I was able to open my own doors, even open hidden ones, grab my own opportunities, break my own barriers and learn and grow to a level that once seemed impossible to even achieve. And yes, I am able to reinforce the fact that, yes indeed, I am too cut out for excellence, and I have Manisha to help me realise my journey and make me realise my own power and potential!",
    ],
    emphasis: [
      "open my own doors, even open hidden ones, grab my own opportunities, break my own barriers and learn and grow to a level that once seemed impossible to even achieve.",
      "I am too cut out for excellence, and I have Manisha to help me realise my journey",
    ],
  },
  {
    name: "Mukesh Bansal",
    monogram: "MB",
    detail: "Business and Technology Leader, Author",
    source: "LinkedIn comment",
    paragraphs: [
      "Manisha Agrawal thanks a lot for your mentoring and support to push me to achieve my dream of book publication. Your regular mentoring from last 11 months transformed me to a very positive and self sufficient personality with healthy relationships with family and stakeholders",
    ],
  },
  {
    name: "Ruchi Bansal",
    monogram: "RB",
    detail: "Agile & Automotive Project Management Leader | Purpose-Driven Coach",
    source: "LinkedIn post",
    paragraphs: [
      "I was caught up in people-pleasing for a long time, constantly looking for approval and feedback to validate my actions. While feedback can be constructive, over-reliance on others for affirmation can easily lead us away from our true strengths and potential. It’s easy to lose sight of our worth when we’re endlessly trying to meet external expectations.",
      "With Manisha Agrawal’s guidance, I’ve started focusing on discovering my values and strengths. This shift has allowed me to align my actions with my personal goals rather than getting sidetracked by seeking validation. It’s been about uncovering my true abilities and using them as the foundation for growth.",
      "One of the biggest transformations has been finding the confidence to take initiative without overthinking others’ opinions. This mindset shift has activated a sense of purpose and the motivation to act on it independently—what I like to call “auto-action mode.”",
      "Now, instead of hesitating or waiting for others to validate my ideas, I feel equipped to make decisions that align with my goals and values.",
      "Thank you, Manisha Agrawal, for your support and wisdom. Your mentorship has sparked exponential change within me, and I’m excited to continue this journey of growth and self-empowerment.",
    ],
  },
  {
    name: "Saanchi",
    monogram: "S",
    source: "WhatsApp message",
    paragraphs: [
      "Manisha ma’am has been a powerful guiding force in my journey. Her coaching helped me rebuild my confidence, especially during interviews, and gave me a mindset that genuinely uplifted me. The affirmations she taught and the simple routine she helped me follow made me feel grounded, positive, and ready to face challenges. Because of her, I walk into opportunities with clarity and self belief. She truly changed the way I see myself.",
    ],
  },
  {
    name: "Mayukhi Sen",
    monogram: "MS",
    detail: "Talent Management, Learning & DEI Lead, Aptiv TCI (Ex Accenture, Ex TCS)",
    source: "LinkedIn post, after a Power*N session for Aptiv TCI’s DEI Council",
    // Her hashtags and tagged colleagues are left out, including the # before Aptiv.
    paragraphs: [
      "What an amazing session on Power*N led by our in-house agile coach Manisha Agrawal, hosted by Aptiv Technical Center India, DEI Council for women in engineering.",
      "We witnessed how yielding power lies well within us yet we continuously let the YES and NO battle in our mind and let the negativity win. More often than not perfection is the enemy of progress. The role-playing was just apt for us to resonate.",
      "It is so natural to be emotional yet we are trying to park it during the day and venting it on soft targets. STOP - it is okay to be human.",
    ],
  },
  {
    name: "Pooja Toonwal",
    monogram: "PT",
    detail: "Workshop participant",
    source: "Recommendation on Facebook",
    paragraphs: [
      "Manisha’s workshop is focused towards bringing confidence, clarity and lifting women up. this workshop will be very helpful for you to get your goals clear and start working towards those. also, it can help you change your mindset towards positivity.",
    ],
  },
  {
    name: "Ruchi Bansal",
    monogram: "RB",
    source: "Recommendation on Facebook",
    paragraphs: [
      "Before I met Manisha, I was confused and afraid and couldn’t focus on anything. I was reflecting on my previous decisions and experiences, wondering where and when everything went wrong, and not realizing that it is a learning experience and a journey.",
      "While I’ve always done personal growth work, I felt I needed someone to help me progress.",
      "I chose to invest in myself and my future by working with Manisha to look after myself as I needed.",
      "What I’ve learned (and I am still learning) is not to jump to conclusions, to listen more, and to give myself time to reflect on why and how I respond. I want to make sure that whatever I do, has meaning for me and those around me.",
      "Manisha’s time, dedication, and advice have truly helped me in my journey",
    ],
  },
  {
    name: "Webinar participant",
    monogram: null,
    source: "WhatsApp message",
    paragraphs: [
      "It was great session Manisha Agrawal . I can see the change in my thought process. And as said only we can uplift ourself. Thank you so much",
    ],
  },
];

/**
 * Video testimonials, uploaded to YouTube as Unlisted. To show one, paste the 11-character ID
 * from its unlisted link in place of null: the part after youtu.be/ or after watch?v=.
 * Only entries with a valid ID render, so while every entry is null the video block is absent.
 */
const testimonialVideos: readonly TestimonialVideo[] = [
  { name: "Afrin", youtubeId: null },
  { name: "Chaithanya", youtubeId: null },
  { name: "Geetha", youtubeId: null },
  { name: "Payal", youtubeId: null },
  { name: "Rajani", youtubeId: null },
  { name: "Sayani Roy", youtubeId: null },
  { name: "Smita", youtubeId: null },
  { name: "Sudha", youtubeId: null },
  { name: "Zareen", youtubeId: null },
  { name: "Client story", youtubeId: null },
];

export const testimonials = {
  eyebrow: "In their own words",
  title: "Different journeys.",
  titleAccent: "The same shift.",
  lead: "Professionals who have worked with Manisha describe what changed for them. Every note is quoted exactly as it was written.",
  featured: {
    // Whole sentences from the end of the note, so the cut is marked with an ellipsis.
    quote:
      "… I started taking care of myself. I evolved. I became self confident. I know my worth and I don’t depend on others anymore for their validation.",
    note: featuredNote,
    fullNote: "Read the full note",
  },
  notes: testimonialNotes,
  readMore: "Read more",
  readLess: "Show less",
  videosTitle: "In their own voices",
  videoPlay: "Play video",
  videoFrameTitle: "Video testimonial",
  videos: testimonialVideos,
} as const;

export const awards = {
  eyebrow: "Recognition",
  title: "Recognised along the way.",
  lead: "Diamond Club, Leadership and Quantum Club recognition for Manisha Agrawal.",
  items: [
    {
      src: "/testimonials/awards-certificates.webp",
      width: 600,
      height: 800,
      alt: "Manisha Agrawal in a white jacket holding a gold star trophy, standing beside three framed certificates on a table",
      caption: "With her Diamond Club Certification, Leadership Certificate and Certificate of Appreciation.",
    },
    {
      src: "/testimonials/awards-quantum-club.webp",
      width: 600,
      height: 800,
      alt: "Manisha Agrawal on stage holding a framed certificate beside a woman in a black and gold sari, in front of a large screen that reads Quantum Club",
      caption: "Receiving Quantum Club recognition on stage.",
    },
  ],
} as const;

export const fit = {
  yes: {
    eyebrow: "This is for you if...",
    title: "You are ready to explore a different way forward.",
    paragraphs: [
      "You’re an ambitious working professional with 12+ years of experience who feels stuck, stagnant or unsure about your next move.",
      "You may be navigating overthinking, self-doubt or difficult decisions. You want to speak up, create greater visibility and grow without losing your peace or relationships along the way.",
    ],
  },
  no: {
    eyebrow: "This is not for you if...",
    title: "You are looking for a shortcut.",
    paragraphs: [
      "This is not a promise of guaranteed promotions or job placements. It is not technical skills training.",
      "It is for anyone willing to reflect honestly on their patterns, choices and possibilities.",
    ],
    closing:
      "You don’t need to have everything figured out. You just need to be willing to begin.",
  },
} as const;

export const masterclass = {
  eyebrow: "Your masterclass details",
  title: "Your next chapter can begin with",
  titleAccent: "one decision.",
  lead: "Bring a notebook, an open mind and a willingness to explore your next level.",
  details: [
    { label: "Format", value: "Live on Zoom" },
    { label: "Date & time", value: "Announced soon · IST" },
    { label: "Investment", value: "Free" },
  ],
  card: {
    kicker: "From stuck to unstoppable",
    title: "Claim your free place",
    copy: "Your next opportunity may arrive before you feel ready. Join the masterclass now so you can meet it with greater clarity, confidence and courage—not another round of hesitation.",
    cta: "Reserve my free seat!",
    note: "Joining instructions will be shared after registration.",
  },
} as const;

/** Form wording. This is the only copy not in the Figma source, because the source had no form. */
export const registration = {
  nameLabel: "Your name",
  emailLabel: "Your email",
  pending: "Reserving your seat…",
  successTitle: "Your seat is reserved.",
  successCopy: "Joining instructions will be shared after registration.",
  errorInvalidName: "Please enter your name.",
  errorInvalidEmail: "Please enter a valid email address.",
  errorUnavailable:
    "We couldn’t reserve your seat just now. Please try again in a few minutes.",
  previewBadge: "Preview: not saved",
} as const;

export const faq = {
  eyebrow: "Questions, answered",
  title: "Everything you need to know.",
  lead: "Still have a question? Reach out and we will help you decide if the session is right for you.",
  items: [
    {
      question: "Why should I join now instead of waiting?",
      answer:
        "Because waiting for perfect clarity can quietly become another year of the same patterns. If this page feels familiar, use the masterclass as your checkpoint: step out of autopilot, understand what is holding you back and begin building momentum while your goals still matter deeply to you.",
    },
    {
      question: "How is this different from other trainings?",
      answer:
        "This masterclass focuses on the Purpose, Power and Progress shifts that influence how you use the knowledge and skills you already have.",
    },
    {
      question: "Do I need to be in a leadership role already?",
      answer:
        "No. It’s for ambitious, experienced professionals who want to grow—whether they already lead teams or aspire to bigger roles.",
    },
    {
      question: "Is 12 years of work experience a must?",
      answer:
        "No. If you are a working professional ready to accelerate your career growth and take meaningful ownership of your next move, you are welcome to join.",
    },
    {
      question: "I am a student. Can I join?",
      answer:
        "This masterclass is not designed for students. Its conversations, examples and actions are created for working professionals navigating real career decisions, workplace visibility and leadership growth.",
    },
    {
      question: "What if I don’t know what I want next?",
      answer:
        "That’s completely fine. The Purpose pillar explores what matters to you and how you can begin reconnecting with your direction.",
    },
    {
      question: "Will I get a promotion or a new job?",
      answer:
        "No, this programme does not guarantee a job placement or promotion. It is designed to strengthen the mindset, self-trust, visibility and action-oriented identity that help you recognise opportunities, communicate your value and accelerate your own growth—instead of waiting for someone else to create your next move.",
    },
    {
      question: "Will I have to share personal experiences?",
      answer:
        "No. You can participate at your own comfort level and reflect privately during activities.",
    },
    {
      question: "Is the masterclass really free?",
      answer: "Yes. The live masterclass is completely free to attend.",
    },
    {
      question: "Is this only for women?",
      answer:
        "No. The Power Shift is now open to all working professionals—both men and women. Self-doubt, overthinking and career stagnation don’t discriminate by gender.",
    },
  ],
} as const;

export const finalCta = {
  eyebrow: "You’re one shift away",
  title: "You’ve spent years building your career.",
  titleAccent: "Now step into the growth you truly want.",
  lead: "Your next level begins with one intentional decision. The cost of waiting is not only time—it is every opportunity you remain too uncertain to claim.",
  cta: "Yes, reserve my free seat!",
} as const;

export const countdown = {
  label: "GOING LIVE SOON!",
  dateUnset: "Date announced soon",
  units: { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" },
} as const;
