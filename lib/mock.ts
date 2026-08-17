// ponytail: in-memory seed data for the UI phase. When the backend lands, replace the bodies
// of the helpers in lib/store.tsx with real fetches — this file's types are what stays.

export type Event = {
  id: string;
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
};

export type Question = {
  id: string;
  eventId: string;
  body: string;
  author: string | null; // null = anonymous
  answer: string | null;
  createdAt: string;
};

export const events: Event[] = [
  {
    id: "devfest-25",
    name: "DevFest Jakarta 2026: Building for the Next Billion",
    startsAt: "2026-08-17T09:30:00+07:00",
    venue: "Main Hall, Ciputra Artpreneur",
    speaker: "Rani Wijaya",
    },
  {
    id: "ai-townhall",
    name: "AI Town Hall",
    startsAt: "2026-08-17T13:00:00+07:00",
    venue: "Studio B",
    speaker: "Danu Prasetyo",
  },
  {
    id: "design-systems",
    name: "Design Systems That Survive Contact With Product",
    startsAt: "2026-08-18T10:00:00+07:00",
    venue: "Workshop Room 3",
    speaker: "Mira Halim",
  },
  {
    id: "infra-night",
    name: "Infra Night: Postmortems We Actually Learned From",
    startsAt: "2026-08-18T19:00:00+07:00",
    venue: "Rooftop Deck",
    speaker: "Chris Tanuwijaya",
  },
];

const BODIES: [string, string | null, string | null][] = [
  [
    "How do you decide when a feature is done enough to ship versus when it needs another iteration? We keep going back and forth internally and it burns weeks.",
    "Sasha",
    "Ship when the next thing you'd learn can only be learned in production. Everything before that is guessing with extra steps.",
  ],
  ["What's the single biggest mistake you see teams make in their first year?", null, null],
  [
    "You mentioned latency budgets earlier. Concretely, how do you allocate a 200ms budget across the gateway, the service mesh, the database round trip, and rendering? And what do you do when one of those consistently blows past its slice but the overall number still looks acceptable to leadership because the p50 is fine and nobody is looking at p99 until something actually catches fire in production?",
    "Bimo",
    null,
  ],
  ["Is TypeScript still worth it for a two-person team?", "Kelly", "Yes. It pays for itself the first time you rename something."],
  ["Do you write tests before or after the code, honestly?", null, null],
  [
    "How do you handle a stakeholder who keeps changing the requirements mid-sprint?",
    "Farah",
    null,
  ],
  ["What does your local dev setup look like these days?", "Toni", null],
  [
    "Our monolith takes 14 minutes to build. The team wants to break it into services. I think that fixes the symptom and not the cause, but I can't articulate why well enough to win the argument. What would you tell them?",
    null,
    "Microservices trade a slow build for a slow debugging session at 3am. Fix the build.",
  ],
  ["Any book recommendations for someone moving from IC to lead?", "Nadia", null],
  ["How much of your day is actually spent writing code now?", null, "Maybe an hour. On a good day."],
  [
    "Can you talk about the tradeoff between shipping fast and accumulating debt? Where's the line for you?",
    "Yoga",
    null,
  ],
  ["What's your take on AI code review tools — genuinely useful or noise?", null, null],
  [
    "We're a fintech and every schema change needs a compliance review, which takes two weeks. How do teams in regulated environments keep any velocity at all?",
    "Priya",
    null,
  ],
  ["Do you still use feature flags after launch or clean them up?", "Marco", "Clean them up. A flag older than a quarter is just a bug waiting for a quiet week."],
  ["Favourite debugging technique that isn't a debugger?", null, null],
  [
    "How do you interview for judgment rather than for trivia? Every loop I've run ends up selecting for people who prepped, not people who can think.",
    "Dewi",
    null,
  ],
  ["Is on-call rotation still necessary if you have good observability?", null, null],
  ["What's the smallest team you've seen ship something at real scale?", "Alvin", null],
  [
    "You said earlier that documentation rots. So what's the alternative — do you just accept that the code is the only truth and invest in readability instead, or is there a category of docs that's actually worth maintaining over years?",
    null,
    null,
  ],
  ["How do you keep learning without burning your weekends?", "Ratna", null],
  ["Any advice for someone switching from backend to frontend?", null, null],
  ["What made you leave your last role?", "Anonymous fan", null],
  [
    "Our postmortems always end with 'add more monitoring' and nothing changes. How do you make them actually produce change?",
    "Gilang",
    "Assign one owner and one date per action item. No owner means it didn't happen.",
  ],
  ["Do you think junior roles are disappearing?", null, null],
  ["Vim or VS Code?", "Iqbal", null],
  [
    "How should a small team think about accessibility when there's no budget for an audit and no one on the team has the expertise?",
    "Lena",
    null,
  ],
  ["What's the most over-hyped tool right now?", null, null],
  ["How do you say no to your own manager?", "Hendra", null],
  [
    "We've got a legacy system nobody understands and the person who wrote it left three years ago. Where do you even start with something like that?",
    null,
    "Instrument it before you touch it. You can't refactor what you can't observe.",
  ],
  ["Remote, hybrid, or office — what actually works for engineering?", "Sinta", null],
  ["Best way to onboard a new engineer in week one?", null, null],
  [
    "Is there ever a good reason to build your own auth in 2026, or is that permanently a mistake now?",
    "Rio",
    null,
  ],
  ["How do you measure developer productivity without it becoming a metric people game?", null, null],
  ["What would you do differently if you started over?", "Ayu", null],
  ["Do you use AI to write tests? Does it work?", "Bagas", null],
  [
    "Speaking as someone who's been burned: how do you evaluate a vendor whose pricing looks fine at your current scale but has a cliff at 10x, without spending three months modelling it?",
    null,
    null,
  ],
  ["Thoughts on monorepos for a team of five?", "Cindy", null],
  ["What's one thing you wish someone told you earlier in your career?", null, null],
  ["How do you handle disagreement in a code review without it getting personal?", "Fajar", null],
  ["Will you share the slides?", null, "Yes — link goes out tonight."],
];

// Deterministic timestamps so nothing depends on Date.now() at module scope.
const BASE = Date.parse("2026-08-17T09:40:00+07:00");

// Deliberately lopsided: the first event needs more than one page so "Load more" and the
// speaker deck's prefetch are exercised without submitting anything first.
const eventFor = (i: number) => (i < 22 ? events[0].id : events[1 + (i % 3)].id);

export const questions: Question[] = BODIES.map(([body, author, answer], i) => ({
  id: `q${i + 1}`,
  eventId: eventFor(i),
  body,
  author,
  answer,
  createdAt: new Date(BASE + i * 97_000).toISOString(),
}));

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Cursor-paginate by id. `cursor` is the id of the last item already seen. */
export function paginate<T extends { id: string }>(
  list: T[],
  cursor?: string | null,
  limit = 10,
): Page<T> {
  const start = cursor ? list.findIndex((x) => x.id === cursor) + 1 : 0;
  // An unknown cursor yields findIndex === -1 → start 0, which would silently replay page one.
  if (cursor && start === 0) return { items: [], nextCursor: null };
  const items = list.slice(start, start + limit);
  const last = items.at(-1);
  const more = last ? list.findIndex((x) => x.id === last.id) < list.length - 1 : false;
  return { items, nextCursor: more && last ? last.id : null };
}
