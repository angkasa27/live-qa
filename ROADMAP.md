# Ask — product notes

**Ask turns a talk into a searchable Q&A.**

An audience sends questions from their phones. The speaker reads them one at a time on stage.
Someone records what was answered — and later, that same treatment gets applied backwards to
talks that already happened.

| | |
|---|---|
| Stack | Next.js 16 · Tailwind v4 |
| Added deps | 0 |
| Screens built | 5 |
| Backend | Not yet |

---

## 1. The shape of it

Everything hangs off an **event**. An event is either **live** — happening in a room right now,
taking questions — or **recorded**, a talk that already happened and got pulled into the system
after the fact.

**Only live events accept questions.** A recorded event is an archive: its detail page shows the
player and then goes straight to the extracted Q&A, with no submit form and no "Ask" CTA
anywhere. That settles the biggest open question from §7 — for now, in favour of the simpler
model. Revisit if people start wanting to ask things about old talks.

The audience is on a phone, standing up, in a dim room, with one hand free. That single fact
drove every layout decision: mobile-first throughout, thumb-reachable submit button, no gesture
the OS doesn't already give us.

| Route | Who | What it does | State |
|---|---|---|---|
| `/` | Audience | Pick a session. Cover image, live/recorded badge, question count. | Built |
| `/events/[id]` | Audience | **Live:** submit a question, anonymous by default. **Recorded:** player embed, then the extracted Q&A list directly — no form. | Built |
| `/events/[id]/questions` | Audience | Everything asked, with answers underneath. Manual refresh, cursor-paged. | Built |
| `/events/[id]/speaker` | Speaker | Full-screen deck, one question per card, swipe to advance. Extends itself near the end. | Built |
| `/events/[id]/admin` | Organiser | Type in what the speaker actually said. Filters by answered state. | Built |
| `/admin/events/new` | Organiser | Create a live event, or point at a recording and let the system ingest it. | **Next** |

---

## 2. Decisions worth remembering

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
`order by created_at asc`. For a recorded event that makes the replay timestamps run start → end
down the page; for a live one it's the order they were asked, which is the order the speaker
works through them. The cost: a newly submitted question lands at the *end* of the public list,
so on a busy event the person who asked it may need to page to find it.

**Refresh is a button.**
No polling, no websockets. A room-sized audience refreshing on demand costs nothing and keeps the
app deployable anywhere. Revisit only if the speaker view starts feeling stale in practice.

**Validation is currently theatre.**
The 500-character limit and the empty check live in the form component only. That is UI, not
enforcement. When the API lands, the same rules have to be duplicated server-side — that is the
actual trust boundary.

---

## 3. Media on events — shipped

An event can carry a cover image, a YouTube recording, or neither. The list shows a thumbnail;
the detail page shows the player. When there is a recording but no explicit cover, the list falls
back to YouTube's own still, so attaching a video gets you a thumbnail for free.

```ts
// lib/mock.ts — the fields that were added
mode:       "live" | "recorded"   // drives the badge, and later the ingest path
image?:     string                // optional cover
youtubeId?: string                // optional recording → detail page embeds it

// list thumbnail: explicit cover wins, then the video still, then nothing
coverFor(e) → e.image ?? ytThumb(e.youtubeId) ?? null
```

The embed uses `youtube-nocookie.com` and sits in an `aspect-video` box, so it scales cleanly
from 375px up without touching the page's horizontal scroll. Images are plain `<img>` rather than
`next/image` — the URLs will eventually come from organisers, and `next/image` would need a
domain allowlist we can't write in advance.

The seed's two recorded events are real videos — cover, embed, and questions all come from the
actual recordings. Everything marked "live" is fictional demo data for the submit flow.

---

## 4. The backend phase

Nothing here is speculative — it's the same shapes, made real.

- **Postgres behind the seam.** Events and questions as tables. The cursor contract already
  matches what `order by created_at desc` plus a keyset cursor gives you.
- **Real accounts.** Speaker and admin routes are wide open today. They're the two that get the
  middleware — organisers persist across events, so shared links won't hold up.
- **Server-side validation.** Length, emptiness, and rate limiting. A public form with no backend
  check is an invitation.
- **Event creation.** The admin picks live or recorded. Live opens for questions immediately;
  recorded kicks off ingestion instead.

---

## 5. Auto-triage

*The speaker has four minutes and forty questions.*

Right now the speaker deck is strictly chronological, which is the worst possible ordering when
time runs out. Triage is what makes the deck worth looking at: the questions the room most wants
answered should surface first, and the ones that don't belong shouldn't surface at all.

Three separate judgements, worth keeping separate because they fail differently:

- **On topic?** Scored against the event's title, description, and — for recorded events — the
  transcript itself. Low scores get demoted, not deleted.
- **Urgency.** Time-sensitive questions ("you're about to move on from —") outrank evergreen ones.
  Decays fast; a live-only signal.
- **Near-duplicates.** Six people asking the same thing is the strongest signal in the room, but
  it should be one card with a count — not six cards.

### The part to get right

Auto-flagging that silently hides a question is a moderation system wearing a ranking system's
clothes. The safe version: classification *reorders* the speaker deck and annotates the admin
view, but every question stays visible on the public list. Anything that removes a question from
view should need a human click.

---

## 6. Transcript ingestion

*The feature that makes the archive worth having.*

Take a talk that already happened on YouTube, find the Q&A section, split it into question–answer
pairs, and keep the timestamp of each. The payoff is on the public list: every extracted answer
carries a **play** control that drops the viewer into the video at the exact second the speaker
started answering.

**This has been done twice, by hand, end to end.** Both recorded events in the seed hold real
question–answer pairs pulled from their videos' auto-generated Indonesian captions, each with a
working replay anchor. It proves the output shape is right; it does not yet prove the extraction
can be automated.

| Event | Video | Length | Segments | Pairs extracted |
|---|---|---|---|---|
| `tanya-ustadz-24-jun` | [71z6vw_c5JE](https://youtu.be/71z6vw_c5JE) — Khalid Basalamah Official | 56 min | 1,563 | 7 |
| `tanya-jawab-yazid` | [1mycTmtS5_4](https://youtu.be/1mycTmtS5_4) — Moslem Nearer | 40 min | 838 | 8 |

Both full timestamped transcripts are checked in under [`data/`](data/) as
`{ t, text }` segments with `t` in seconds. They're kept in the repo deliberately: re-fetching is
the fragile step (see below), so the good copies are worth version-controlling. They're also the
raw material for extracting more pairs than the ones seeded.

`scripts/ingest-youtube.mjs` now automates the mechanical half — fetch, dedupe, timestamp, save,
and report candidate boundaries (`npm run ingest -- <url>`). It reproduces both hand-made
transcripts byte-for-byte. The judgement half stays with an agent; [INGESTION.md](INGESTION.md)
carries the prompt.

### What the manual passes taught us

- **The captions are gettable, but not straightforwardly.** YouTube's `timedtext` endpoint
  returns HTTP 200 with a zero-byte body for an unauthenticated caller — the caption URL scraped
  out of the watch page is not enough on its own. `yt-dlp` got both tracks; a naive fetch got
  neither. Whatever ships needs to assume this breaks and handle it loudly.
- **Segmentation difficulty depends entirely on the format, and that's the real finding.** In the
  first video a host introduces every question with *"Selanjutnya…"* or *"Pertanyaan dari…"* — a
  discourse-marker pass gets most of the way there. In the second the ustadz reads each question
  aloud himself, mid-flow, with no cue at all; the only signal is the interrogative turn in the
  sentence. A marker-based splitter would have found roughly one boundary in that whole video.
  **Any automated pipeline needs to handle both, and the second case needs a model.**
- **The raw text is not publishable.** Auto-captions carry filler, false starts, and mis-heard
  words. Every question in the seed was rewritten from its caption span; none is a verbatim
  paste. That rewrite step is not optional polish, it is the feature.
- **Answers run long.** Answers run two to five minutes with digressions. Storing the full span
  is useless on a card — what's stored is a summary, and the replay link is what carries the
  reader to the real thing.
- **Attribution varies.** The first video's host reads out demographics ("perempuan, 29,
  Jakarta Pusat"), which makes a decent author line. The second has none, so those pairs fall
  back to Anonymous. The extractor can't assume either.

| # | Stage | Notes |
|---|---|---|
| 01 | Fetch captions | Pull the transcript with timings. Auto-generated captions are the realistic input. |
| 02 | Locate the Q&A | Find where the talk ends and questions begin — usually a clear discourse shift. |
| 03 | Split into pairs | Segment into question, then answer. Speaker changes and prosody cues do most of the work. |
| 04 | Clean up | Audience questions off a bad room mic are the noisiest text in the pipeline. Rewrite, don't transcribe. |
| 05 | Anchor + store | Keep the start time in seconds per pair, write them in as questions with answers already attached. |

### Where it gets interesting

An ingested Q&A pair and an audience-submitted question are **not the same object**, even though
they'd share a table. One is a historical record with a timestamp and no author; the other is a
live request from a person. If a viewer watching an old talk can also ask something new — and
they should be able to — then a recorded event holds both kinds at once, and the UI has to say
which is which.

That distinction is worth settling before the schema does, because it decides whether
`source: "live" | "transcript"` is a column or a whole second table.

```ts
// what a transcript-sourced question looks like — this shape is live in lib/mock.ts
{
  source:     "transcript",
  body:       "Apa hukumnya orang tua melarang anak perempuannya menikah…",
  author:     "Hamba Allah · perempuan, 29 · Jakarta Pusat",  // as read out by the host
  answer:     "Tidak boleh. Tidak ada orang tua yang membenci anaknya…",
  videoStart: 2760,           // seconds — renders as a ▶ 46:00 link
  confidence: 0.82            // NOT YET: low scores should need review before publishing
}
```

`timecode()` in `lib/mock.ts` formats the anchor. The control adapts to its surroundings:

- **With the player on the page** (the recorded event's detail page) it's a button that **seeks
  the embed in place** and scrolls it into view. No navigation, no lost place.
- **Without one** (`/events/[id]/questions`) it falls back to a link to `youtu.be/<id>?t=<seconds>`.

Seeking needs no external script and no `iframe_api` load — the embed accepts commands over
`postMessage` as long as its src carries `enablejsapi=1`:

```js
win.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }),
                "https://www.youtube-nocookie.com")
```

`components/Player.tsx` owns the iframe and hands a `seek` function down through context;
`useSeek()` returns `null` when there's no player, which is what drives the fallback. Verified
against the live embed: clicking 23:17 moved the player from 0s to 1398s and started playback.

---

## 7. Open questions

Decide these before writing the schema, not after.

**~~Can people ask questions on a recorded event?~~ — decided: no.**
Recorded events are read-only archives. `source` stays a column rather than becoming a second
table, and the recorded flow skips the form entirely. Reopen if viewers of old talks start
asking for it — the shape supports it, the UI just doesn't offer it.

**How do we get captions, exactly?**
Confirmed as the weak link. The unauthenticated `timedtext` fetch already returns empty, and
`yt-dlp` is a dependency that breaks whenever YouTube changes. Worth pricing the Data API's
official caption route before building around a scraper.

**Do we have the right to republish someone's talk as text?**
The seed uses a public video from a channel we don't own. Extracting a talk into a searchable
archive is a different act from linking to it, and the answer probably differs per channel.
Worth settling before ingestion becomes a self-serve button.

**Does ingestion publish automatically?**
Extraction will be wrong sometimes. A review queue where the admin approves pairs before they go
public costs one screen and prevents the archive filling with garbled questions attributed to a
real speaker.

**Who owns an event?**
Determines whether accounts are per-organiser, per-conference, or per-team — and that decides the
auth model. Worth answering before the middleware gets written.

**Does the speaker deck ever need to be live?**
Refresh-on-demand is enough for the audience list. The speaker mid-talk may be the one place push
actually earns its infrastructure.
