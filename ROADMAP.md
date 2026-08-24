# Ask — product notes

**Ask replaces the pen and paper in a majelis.**

Students send questions from their phones. The syaikh reads them one at a time on stage. An admin
types in what was answered. Questions the session ran out of time for stay open — answered later,
from home, with the student told when it lands.

| | |
|---|---|
| Stack | Next.js 16 · Tailwind v4 |
| Added deps | 0 so far |
| Screens built | 5 (UI phase) |
| Backend | Not yet — next |
| Target | Majelis in Indonesia. Indonesian UI. |

---

## 1. The problem

In a majelis ta'lim, a student writes a question on paper and passes it forward to the syaikh.
Three things are broken about that:

- **Nobody carries a pen.** Notes go into a phone now, so asking means borrowing paper from a
  stranger.
- **Passing takes time** out of a window that is already short.
- **The queue outlasts the session.** Q&A runs 10–30 minutes; the questions don't stop when it
  does, and on paper the unanswered ones are simply lost.

The first two are why this is a form on a phone. The third is why the app doesn't end when the
session does — and that turns out to be the part paper could never do.

A livestreamed majelis gets the same thing for free: someone watching from home submits through
the same form as the person in the room.

## 2. The shape of it

Everything hangs off an **event** — one majelis session. Two independent things describe it:

```ts
status: "scheduled" | "live" | "archived"   // where it is in its life
video?:  { youtubeId, live?: boolean }      // whether there's a stream or recording
```

They're orthogonal on purpose. An earlier draft used `mode: "live" | "recorded"` and it was the
wrong axis: a livestreamed majelis is both at once, and a session whose Q&A ran out of time is
still taking answers long after the room empties.

**Questions are only accepted while `live`** — an event that never closes is a queue that grows
forever. An admin can toggle an archived event back open when they want to keep taking them.
**Answers are always allowed**, in every status. That's the whole point of §1's third failure.

### Roles

| Role | Signs in | Does |
|---|---|---|
| Student | No | Submits, reads answers, checks their own questions |
| Admin | Yes | Approves, types answers, runs the session |
| Syaikh | Yes, on an admin account | Reads the speaker deck. Doesn't type. |

There is no separate syaikh account or syaikh-facing answer screen. Some teachers use a tablet
comfortably, and swiping is not a tech skill — but typing answers is the admin's job by design,
because that's how it already works out loud in the room. If a syaikh starts answering unprompted
from home, build for it then.

### Routes

| Route | Who | What it does | State |
|---|---|---|---|
| `/` | Student | Pick a session. Cover, status badge, question count. | Built |
| `/events/[id]` | Student | Submit a question, anonymous by default. Player when there's a stream. | Built, needs rework |
| `/events/[id]/questions` | Student | Everything asked, answers underneath. Manual refresh, cursor-paged. | Built |
| `/pertanyaan-saya` | Student | Your own questions and whether they've been answered. | **Next** |
| `/admin` | Admin | Sessions you run. | **Next** |
| `/admin/events/new` | Admin | Create a session. | **Next** |
| `/admin/events/[id]` | Admin | Approval queue, type in answers, print. | Built as `/events/[id]/admin`, needs rework |
| `/admin/events/[id]/speaker` | Syaikh | Full-screen deck, one question per card, swipe to advance. | Built as `/events/[id]/speaker` |

## 3. Decisions worth remembering

**Swipe is CSS, not a library.**
The speaker deck is a horizontal scroller with `scroll-snap-type: x mandatory` and one
full-viewport card per question. Touch swipe, trackpad, and arrow keys all work for free. No
gesture library, no drag maths, nothing to maintain.

**The deck pages on scroll position.**
First attempt used an IntersectionObserver on the third-from-last card. It stranded the deck two
questions short: a fast fling or a jump to the end flies past the sentinel without ever
intersecting it, so the fetch never fires and the last questions become unreachable. Driving off
the card index we already track handles flings, jumps, and keyboard identically — and deleted
the observer.

**One file is the backend seam.**
`lib/store.tsx` holds five functions over an in-memory array. Every screen talks to those and
nothing else. Swapping to real endpoints means replacing five function bodies; no consumer moves.
`paginate()` in `lib/mock.ts` defines the cursor contract the API should honour:
`{ items, nextCursor }`.

**Questions are ordered oldest first.**
`order by created_at asc` — the order they were asked is the order the syaikh works through them.
The cost: a newly submitted question lands at the *end* of the public list, so on a busy event the
person who asked it may need to page to find it. `/pertanyaan-saya` is the answer to that.

**Polling, not websockets — and only on two devices.**
There's a useful asymmetry here. Five thousand phones need nothing: they have a Refresh button,
which is what keeps this deployable anywhere. Only the syaikh's tablet and the admin's screen need
questions to appear on their own, and that's 2–3 devices per event. They poll every 3–5s. A
connection lifecycle is a thing to debug at the exact moment nothing can be debugged — the syaikh
is on stage. Revisit if polling visibly lags in a real room.

**Moderation is a per-event toggle, not a policy.**
The admin picks auto-approve or manual review. Manual review is also where flagging and grouping
happen (§6). This is the knob that absorbs a change in volume without a rewrite — see §8.

**A pending question is visible to the person who asked it.**
Marked *menunggu review*, invisible to everyone else. A student who submits into a void submits
again, and again, and you end up moderating the same question three times.

**Answers publish directly and can always be edited.**
The highest-stakes failure here isn't downtime — it's a wrong ruling published under a real
scholar's name because an admin misheard or mistyped. The instinct is to make the syaikh approve
each answer first; that queue will not survive contact with a syaikh who doesn't want another
thing to tap. So: publish directly, keep every edit in history, make `retracted` a state that
shows the question with the answer withdrawn. Nothing is ever deleted. The fix path has to be as
fast as the write path — one tap from the public list.

**Anonymity is display, not identity.**
Contact detail and public attribution are different fields. A student can give an email for the
notification and still show as anonymous, logged in or not. Contact detail never leaves the
server.

**Validation is currently theatre.**
The 500-character limit and the empty check live in `components/SubmitForm.tsx` only. That is UI,
not enforcement. When the API lands the same rules get duplicated server-side with a rate limit —
that is the actual trust boundary.

**Nothing Vercel-specific.**
MVP deploys to Vercel; the plan is a VPS under Coolify or Dokploy later. So: Postgres stays
external, rate-limit state lives in Postgres rather than a hosted KV, email goes through plain
SMTP or a provider SDK, and no edge-runtime-only code. Done right, that move is a Dockerfile
rather than a migration.

## 4. Data model

```ts
Event {
  id, name, startsAt, venue, speaker
  status:        "scheduled" | "live" | "archived"
  acceptingQuestions: boolean   // admin override; questions normally follow status === "live"
  moderation:    "auto" | "manual"
  publicArchive: boolean        // link-only + noindex when true
  image?, youtubeId?
}

Question {
  id, eventId, body, createdAt
  status:      "submitted" | "approved" | "hidden"   // moderation, one axis
  answer:      string | null                         // answered = answer !== null
  isAnonymous: boolean
  author:      string | null    // display attribution
  contact?:    string           // server-only, never returned by the API
  source?:     "transcript"     // §7
  videoStart?: number           // §7 replay anchor, seconds
}
```

`status` and answeredness are separate axes on purpose. A first draft had `answered` as a fourth
status value, which loses whether the question was ever approved and makes it impossible to hide
something after it's been answered.

Auth is [better-auth](https://better-auth.com): email and password for now, Google and magic link
later — both configuration rather than a migration. Events belong to an **organisation**, not an
individual: a dauroh is run by a lembaga with several people helping, and per-individual accounts
break the first time someone else has to open the admin screen.

## 5. v1

In build order. Step 1 is the only one that makes the app real; everything after decorates a
working thing.

| # | Step | What |
|---|---|---|
| 1 | Backend + auth | Postgres, better-auth, the five `store.tsx` bodies, server-side validation, rate limiting, the status model |
| 2 | Admin | Approval queue, moderation toggle, answer editing with history, speaker view under `/admin` with polling |
| 3 | Student | Indonesian copy throughout, optional email at submit, `/pertanyaan-saya` off localStorage |
| 4 | Email | Notify on answer |
| 5 | Print | `@media print` stylesheet, admin clicks print, the browser makes the PDF |
| 6 | Archive | Public toggle, `noindex`, disclaimer |

**Out of v1, deliberately:** auto-triage, voice-to-text, WhatsApp notifications, Google and
magic-link sign-in, ingestion automation, a syaikh-facing answer screen, websockets.

## 6. Later

**Auto-triage.** §5's three signals — on-topic, urgency, near-duplicate grouping — reorder the
speaker deck and annotate the admin view. Not in v1 for a specific reason: there's no real question
data yet, so every threshold would be a guess. Ship manual, run three real dauroh, then tune
against what actually arrived.

The rule that doesn't change: **classification reorders, humans hide.** An auto-flag that silently
buries a question is a moderation system wearing a ranking system's clothes, and a false positive
on a sincere question in a religious setting is a serious failure, not a ranking miss.

**Voice-to-text.** The admin dictates a *summary* of the answer using the browser's own
`SpeechRecognition` in Indonesian, then edits before publishing. Not a room mic transcribing the
whole thing: §7 already learned that Indonesian auto-captions aren't publishable text, and answers
run several minutes when what a card wants is a summary. Zero dependencies either way.

**WhatsApp notifications.** Email first because it's free and ships in an afternoon.
Business-initiated WhatsApp needs Meta Business verification, pre-approved templates, and
per-conversation billing, and outside a 24-hour window free-form text isn't allowed at all. Price
it properly before committing.

**Print for the syaikh.** §5 covers printing the finished Q&A. Printing the *queue* at the start
of a session — paper again, but with the passing-forward problem solved — is the other half, and
it only makes sense once triage exists.

## 7. Transcript ingestion — frozen

Pull an old talk off YouTube, split the Q&A into pairs, keep each answer's timestamp so the public
list gets a ▶ control that drops the viewer into the video at the second the answer starts.

**This works and it's done, twice, by hand.** It is also no longer on the critical path. It was
built when the archive looked like the product; the archive turns out to be a byproduct of live
sessions that already produce clean data — real questions, admin-typed answers, no captions
involved. Ingestion only matters for talks that happened before this app existed.

So: `scripts/ingest-youtube.mjs`, [`INGESTION.md`](INGESTION.md) and the transcripts under
[`data/`](data/) stay as a manual process. **Don't build a self-serve ingest button** until §8's
republishing question has an answer.

| Event | Video | Length | Segments | Pairs |
|---|---|---|---|---|
| `tanya-ustadz-24-jun` | [71z6vw_c5JE](https://youtu.be/71z6vw_c5JE) | 56 min | 1,563 | 7 |
| `tanya-jawab-yazid` | [1mycTmtS5_4](https://youtu.be/1mycTmtS5_4) | 40 min | 838 | 8 |

### What the manual passes taught us

Worth keeping even with the feature parked — most of it applies to any audio the app touches,
voice-to-text included.

- **The captions are gettable, but not straightforwardly.** YouTube's `timedtext` endpoint returns
  HTTP 200 with a zero-byte body for an unauthenticated caller. `yt-dlp` got both tracks; a naive
  fetch got neither. Whatever ships must assume this breaks and fail loudly.
- **Segmentation difficulty depends entirely on format.** In one video a host announces every
  question — a discourse-marker pass nearly does the job. In the other the ustadz reads each
  question aloud mid-flow with no cue, and a marker-based splitter finds roughly one boundary in
  the whole video. The second case needs a model.
- **The raw text is not publishable.** Auto-captions carry filler, false starts, and mis-heard
  words. Every seeded question was rewritten from its caption span; none is a verbatim paste. That
  rewrite is the feature, not polish.
- **Answers run long** — two to five minutes with digressions. What's stored is a summary; the
  replay link carries the reader to the real thing.
- **Attribution varies.** One host reads out demographics ("perempuan, 29, Jakarta Pusat"), which
  makes a decent author line. The other video has none. The extractor can't assume either.

### Replay anchors

`timecode()` in `lib/mock.ts` formats the seconds. The control adapts to its surroundings: with a
player on the page it seeks the embed in place and scrolls it into view; without one it falls back
to `youtu.be/<id>?t=<seconds>`. Seeking needs no `iframe_api` load — the embed takes commands over
`postMessage` as long as its src carries `enablejsapi=1`:

```js
win.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }),
                "https://www.youtube-nocookie.com")
```

`components/Player.tsx` owns the iframe and passes `seek` down through context; `useSeek()` returns
`null` when there's no player, which is what drives the fallback.

## 8. Open questions

**How many questions does a frictionless majelis actually get?**
Today it's 2–5, rarely over 50 — but that number measures the *paper* system, including everyone
who didn't ask because they had no pen. Removing that friction is the entire point, so volume may
jump past what manual approval can absorb mid-session. The per-event moderation toggle is the
mitigation and the first three real events are the measurement. Nothing in §4 or §5 has to change
if the number moves; that's why it's settled now.

**Does the archive ever open to search engines?**
Link-only and `noindex` for v1, with a disclaimer that the answer is an admin's summary and the
recording is the authority. A searchable, indexed archive of a named scholar's answers — typed
from memory by a volunteer — is a fatwa database, and a mistyped or out-of-context one is
attributed to a real person. Don't open it until answer editing has been used in anger.

**Do we have the right to republish someone's talk as text?**
Only blocks §7 if ingestion unfreezes. Extracting a talk into a searchable archive is a different
act from linking to it, and the answer probably differs per channel.

**Does the speaker deck ever need push instead of polling?**
Polling is the v1 answer and it's almost certainly enough at 2–3 devices. This is the one place
push could earn its infrastructure, but only if a real room shows the lag.
