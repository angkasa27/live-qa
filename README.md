# Ask — Q&A for majelis ta'lim

Students send questions to the syaikh from their phones instead of passing paper forward. The
syaikh reads them full-screen, one at a time. An admin types in what was answered, which then
shows publicly under the question — including hours later, for the questions the session ran out
of time for.

Built for majelis in Indonesia. The interface is Indonesian.

[ROADMAP.md](ROADMAP.md) has the product notes: the problem, the decisions and why, the data
model, and what v1 is.

## Running it

Needs Postgres 14+ (anything that speaks the wire protocol — local, Neon, or the Postgres in a
Coolify/Dokploy stack; nothing here is host-specific).

```bash
npm install
cp .env.example .env.local        # then fill in DATABASE_URL and BETTER_AUTH_SECRET

npm run db:schema                 # application tables
npm run auth:migrate              # better-auth's own tables
npm run db:seed                   # demo majelis + the two archived recordings
npm run admin:create -- "Nama" you@example.com "password-min-12-chars"

npm run dev
npm run check                     # pagination, visibility and rate-limit self-check
```

`BETTER_AUTH_URL` is deliberately left unset in development — better-auth infers it from the
request, and `next dev` moves off port 3000 whenever it's taken. A hardcoded port that stops
matching surfaces as a 403 on sign-in, which reads like a wrong password. **Set it in production**;
it's what the origin check compares against.

There is no sign-up page. An account is an admin account, so `admin:create` is the only way in —
including for a forgotten password, until email lands in step 4.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | student | Pick a session |
| `/events/[id]` | student | Submit a question, anonymous by default. Player when there's a recording |
| `/events/[id]/questions` | student | All questions + answers, manual Refresh, Load more |
| `/pertanyaan-saya` | student | Your own questions and whether they've been answered |
| `/masuk` | admin | Sign in |
| `/events/[id]/admin` | admin | Approve, hide, type in the answers |
| `/events/[id]/speaker` | syaikh | Full-screen swipe deck, extends as you near the end |

The two admin routes are guarded twice: `proxy.ts` does a cheap cookie-presence redirect, and
every protected page calls `requireSession()` in `lib/guard.ts`. Only the second is a real
authorization boundary — Next's own docs are explicit that Proxy isn't one.

## How it fits together

- **`lib/queries.ts`** — all reads. `PUBLIC_COLS` is the list of columns allowed to reach a
  browser; `contact`, `asker_token` and `ip_hash` are not on it and must not be added.
- **`lib/actions.ts`** — all writes, plus validation and rate limiting. Server actions, called
  straight from the client components; there is no REST layer and no fetch boilerplate.
- **`db/schema.sql`** — the trust boundary that actually holds. Body length is a CHECK constraint,
  not a form validation.
- **`lib/asker.ts`** — the student "identity": an opaque cookie and nothing else. No account, no
  phone number, no PII.

Answers publish directly and every edit is kept in `answer_revisions`. Clearing the answer box
retracts rather than deletes — the row and its history stay. See ROADMAP §3.

## Next

Step 2 in [§5](ROADMAP.md#5-v1): an `/admin` home, event creation, organisation ownership, and
moving the two admin routes under `/admin`. Then email, print, and the archive toggle.

## Transcript ingestion

Parked, and deliberately manual — see [§7](ROADMAP.md#7-transcript-ingestion--frozen). The two
archived sample events had their Q&A pulled from the videos' own captions by hand.

```bash
npm run ingest -- "https://youtu.be/VIDEO_ID"   # requires yt-dlp
```

[INGESTION.md](INGESTION.md) covers the script and the prompt to hand an agent for the extraction
step. Note its output predates the §4 data model.
