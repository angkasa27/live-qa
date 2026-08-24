# Ask — Q&A for majelis ta'lim

Students send questions to the syaikh from their phones instead of passing paper forward. The
syaikh reads them full-screen, one at a time. An admin types in what was answered, which then
shows publicly under the question — including hours later, for the questions the session ran out
of time for.

Built for majelis in Indonesia. The interface is Indonesian.

**This is the UI/UX phase — there is no backend.** Everything runs off a seeded in-memory store,
so a page reload resets any question you submit. Client-side nav keeps it.

[ROADMAP.md](ROADMAP.md) has the product notes: the problem, the decisions and why, the data
model, and what v1 is.

```bash
npm install
npm run dev          # http://localhost:3000
node --experimental-strip-types lib/mock.check.ts   # paginate self-check
```

## Screens

Routes still reflect the UI phase; §2 of the roadmap has where they move to.

| Route | Who | What |
|---|---|---|
| `/` | student | Pick a session |
| `/events/[id]` | student | Submit a question, anonymous by default. Player when there's a recording |
| `/events/[id]/questions` | student | All questions + answers, manual Refresh, Load more |
| `/events/[id]/speaker` | syaikh | Full-screen swipe deck, extends as you near the end |
| `/events/[id]/admin` | admin | Type in the answers |

## Known gaps

The UI phase left these open on purpose. They're steps 1–2 of [§5](ROADMAP.md#5-v1).

- `lib/store.tsx` is the backend seam — five function bodies over an in-memory array. Replacing
  them with real requests is the whole change; nothing that consumes the context moves.
- `lib/mock.ts` holds the types and the seed. `paginate()` shows the cursor contract the API
  should match (`{ items, nextCursor }`). The `Event`/`Question` shapes there predate the roadmap's
  §4 model and don't have `status`, moderation, or anonymity as separate fields yet.
- Body validation lives only in `components/SubmitForm.tsx`. That's UI, not enforcement — it has
  to be duplicated server-side, with a rate limit.
- **`/events/[id]/speaker` and `/events/[id]/admin` are unguarded.** Both move under `/admin` and
  get real auth.

## Transcript ingestion

Parked, and deliberately manual — see [§7](ROADMAP.md#7-transcript-ingestion--frozen). The two
recorded sample events had their Q&A pulled from the videos' own captions by hand.

```bash
npm run ingest -- "https://youtu.be/VIDEO_ID"   # requires yt-dlp
```

[INGESTION.md](INGESTION.md) covers the script and the prompt to hand an agent for the extraction
step.
