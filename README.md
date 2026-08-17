# Live Event Q&A

Audience send questions to a speaker from their phone, named or anonymous. The speaker reads
them full-screen one at a time. An admin types in what the speaker answered, which then shows
publicly under the question.

**This is the UI/UX phase — there is no backend.** Everything runs off a seeded in-memory store,
so a page reload resets any question you submit. Client-side nav keeps it.

See [ROADMAP.md](ROADMAP.md) for the product notes: what's built and why, and the backend,
auto-triage, and transcript-ingestion phases ahead.

```bash
npm install
npm run dev          # http://localhost:3000
node --experimental-strip-types lib/mock.check.ts   # paginate self-check
```

## Screens

| Route | Who | What |
|---|---|---|
| `/` | audience | Pick a session |
| `/events/[id]` | audience | Live: submit a question (anonymous by default). Recorded: player + extracted Q&A, no form |
| `/events/[id]/questions` | audience | All questions + answers, manual Refresh, Load more |
| `/events/[id]/speaker` | speaker | Full-screen swipe deck, extends as you near the end |
| `/events/[id]/admin` | organiser | Type in the answers |

## Backend phase

- `lib/store.tsx` is the only file that changes — replace the five function bodies with real
  requests. Nothing that consumes the context needs to move.
- `lib/mock.ts` holds the types and the seed; `paginate` shows the cursor contract the API
  should match (`{ items, nextCursor }`).
- Body validation currently lives only in `components/SubmitForm.tsx`. It must be duplicated
  server-side — that is the actual trust boundary.
- **`/events/[id]/speaker` and `/events/[id]/admin` are unguarded.** They are the two routes
  that get the auth middleware.
