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

## Deploying to Vercel + Neon

The app talks plain Postgres over `pg`, so nothing here is Neon-specific beyond the two
connection strings. Same steps work against any managed Postgres.

**1. Create the database.** A Neon project gives you two connection strings for it. The pooled
one (`-pooler` in the hostname) is what the app runs on; the direct one is what migrations need.

**2. Point a local `.env.local` at it and migrate from your machine.** Don't migrate during the
Vercel build — a build that mutates the schema runs again on every rollback and every preview
deploy.

```bash
DATABASE_URL=<pooled>  DATABASE_URL_UNPOOLED=<direct>  npm run setup
npm run admin:create -- "Nama" you@example.com "password-min-12-chars"
```

`db/env.mts` swaps in `DATABASE_URL_UNPOOLED` automatically for those scripts, and refuses to run
if you hand it a pooled host with no direct one set.

**3. Set these in Vercel** (all environments you intend to use):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string |
| `BETTER_AUTH_SECRET` | 32 random bytes — `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `BETTER_AUTH_URL` | Your deployed origin, e.g. `https://ask.example.com`. **Required in production** |
| `IP_HASH_SALT` | 16 random bytes, same generator |

`BETTER_AUTH_URL` is the one that will bite you: unset, better-auth infers the origin per request
and sign-in fails with a 403 that reads like a wrong password. It must match the origin the
browser actually uses, so set it to your custom domain rather than the `*.vercel.app` alias if you
have one.

**4. Deploy.** No build configuration needed — `next build` is the default and there's no
`vercel.json`.

Notes specific to serverless:

- `lib/db.ts` keeps the pool at `DB_POOL_MAX` (default 5) and registers it with
  `attachDatabasePool` from `@vercel/functions`, so Fluid compute drains it when an instance
  suspends rather than stranding connections. Raise `DB_POOL_MAX` only if you move to a single
  long-lived server.
- Neon computes scale to zero after idling. The first request after that pays a cold start of a
  few hundred ms. That's fine for this app — nobody is watching an empty majelis — but it means
  the very first question of a session may feel slow. Disable scale-to-zero on a paid plan if it
  ever matters during a dauroh.
- `lib/asker.ts` reads `x-forwarded-for` for the rate-limit hash, which Vercel sets correctly. It
  falls back to `x-real-ip`, then to a constant — so behind a proxy that strips both, the IP
  backstop degrades to one shared bucket. The per-browser limit still holds.

## Transcript ingestion

Parked, and deliberately manual — see [§7](ROADMAP.md#7-transcript-ingestion--frozen). The two
archived sample events had their Q&A pulled from the videos' own captions by hand.

```bash
npm run ingest -- "https://youtu.be/VIDEO_ID"   # requires yt-dlp
```

[INGESTION.md](INGESTION.md) covers the script and the prompt to hand an agent for the extraction
step. Note its output predates the §4 data model.
