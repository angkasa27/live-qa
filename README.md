# Ask — Q&A for majelis ta'lim

Students send questions to the syaikh from their phones instead of passing paper forward. The
syaikh reads them full-screen, one at a time. An admin types in what was answered, which then
shows publicly under the question — including hours later, for the questions the session ran out
of time for.

Built for majelis in Indonesia. The interface is Indonesian.

[ROADMAP.md](ROADMAP.md) has the product notes: the problem, the decisions and why, the data
model, and what v1 is.

## Running it

Needs Postgres 14+ and Node 22+. Any Postgres that speaks the wire protocol works — local, Neon,
or the one in a Coolify/Dokploy stack; nothing here is host-specific.

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run setup                     # schema + auth tables + demo data
npm run admin:create -- "Nama" you@example.com "password-min-12-chars"
npm run dev
```

`npm run check` runs the self-check for the parts that aren't obvious by reading: keyset
pagination, who can see a question awaiting review, and the rate-limit window. It creates and
removes its own scaffold event, including when an assertion fails.

Individual steps, if you need them: `db:schema`, `auth:migrate`, `db:seed`.

**`BETTER_AUTH_URL` is deliberately unset in development.** better-auth infers it from the
request, and `next dev` moves off port 3000 whenever it's taken; a hardcoded port that stops
matching surfaces as a 403 on sign-in, which reads like a wrong password. **Set it in
production** — it's what the origin check compares against.

**There is no sign-up page.** An account is an admin account, so `admin:create` is the only way
in, including for a forgotten password until email lands in step 4.

Every script reads `.env.local` itself and refuses to run without `DATABASE_URL`. That matters
more than it sounds: `psql $DATABASE_URL` with the variable unset connects to whatever default
database the local socket offers and creates the entire schema there, silently.

### What to try

The seed gives you six sessions covering all three states.

| Try | Where |
|---|---|
| Submit a question, anonymously or named | `/events/devfest-25` — live, auto-approve, so it publishes immediately |
| Watch moderation hold one back | `/events/ai-townhall` — live, **manual** review. Yours shows "menunggu review" to you and to nobody else |
| Find your own questions again | `/pertanyaan-saya` — no login; the browser holds an opaque cookie |
| Run a session | `/admin` — pending and unanswered counts per majelis, live ones first |
| Create one | `/admin/events/new` — paste a YouTube link and it echoes back the id it parsed |
| Approve, hide, answer | `/admin/events/ai-townhall` |
| Close questions on a live session | Same page → **Menerima pertanyaan → Tutup**. "Ikut status" puts it back on automatic |
| The stage view | `/admin/events/ai-townhall/speaker` — approve something in another tab and it appears within ~4s |
| A finished session | `/events/tanya-ustadz-24-jun` — archived, no form, replay buttons seek the embed |
| The rate limit | Submit four questions inside ten minutes; the fourth is refused |

An archived session is `noindex` and carries a disclaimer that the answer is an admin's summary
and the recording is the authority.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | student | Pick a session |
| `/events/[id]` | student | Submit a question, anonymous by default. Player when there's a recording |
| `/events/[id]/questions` | student | All questions + answers, manual Refresh, Load more |
| `/pertanyaan-saya` | student | Your own questions and whether they've been answered |
| `/masuk` | admin | Sign in |
| `/admin` | admin | Sessions, with pending and unanswered counts |
| `/admin/events/new` | admin | Create a session |
| `/admin/events/[id]` | admin | Status and moderation controls, approve, hide, answer |
| `/admin/events/[id]/speaker` | syaikh | Full-screen swipe deck, extends as you near the end |

Everything under `/admin` is guarded twice: `proxy.ts` does a cheap cookie-presence redirect, and
every protected page calls `requireSession()` in `lib/guard.ts`. Only the second is a real
authorization boundary — Next's own docs are explicit that Proxy isn't one.

Every admin sees every majelis. Organisation ownership is deferred until a second lembaga shares
a deployment — see [§4](ROADMAP.md#4-data-model).

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

Steps 4–6 in [§5](ROADMAP.md#5-v1): email on answer, the print stylesheet, and the archive
visibility toggle.

## Transcript ingestion

Parked, and deliberately manual — see [§7](ROADMAP.md#7-transcript-ingestion--frozen). The two
archived sample events had their Q&A pulled from the videos' own captions by hand.

```bash
npm run ingest -- "https://youtu.be/VIDEO_ID"   # requires yt-dlp
```

[INGESTION.md](INGESTION.md) covers the script and the prompt to hand an agent for the extraction
step. Note its output predates the §4 data model.
