# Adding a recorded event

Two steps. The script does the mechanical half; an agent does the judgement half.

## 1. Run the script

```bash
npm run ingest -- "https://youtu.be/VIDEO_ID"      # or just the 11-char id
npm run ingest -- "https://youtu.be/VIDEO_ID" --lang en
```

Requires `yt-dlp` (`pip install -U yt-dlp`). It will:

- write `data/<id>.transcript.json` — every caption line as `{ t, text }`, `t` in seconds
- print a ready-to-paste `Event` object for `lib/mock.ts`
- print candidate question boundaries, tagged `[cue]` (a host announced it) or `[ask]` (just an
  interrogative in the text)

**Read the cue/ask split in the summary line — it tells you how hard step 2 will be.** A video
where most candidates are `[cue]` has a host introducing each question and is close to
mechanical. A video where they're nearly all `[ask]` has the speaker reading questions aloud
mid-flow, and you'll be relying on the model to find the seams. The two seeded videos differ
sharply on exactly this:

| Video | Candidates | From host cues |
|---|---|---|
| `71z6vw_c5JE` | 38 | 19 |
| `1mycTmtS5_4` | 37 | 4 |

Candidates are a starting point, not an answer. They over-fire on rhetorical questions inside an
answer and miss questions phrased as statements.

## 2. Hand the transcript to an agent

Paste this, filling in the two blanks:

> Read `data/<VIDEO_ID>.transcript.json`. It's an auto-generated caption transcript of a Q&A
> session, as `{ t, text }` segments with `t` in seconds.
>
> Extract the question–answer pairs and add them to `lib/mock.ts` as a new recorded event,
> following exactly how `TRANSCRIPT` and `TRANSCRIPT_2` are already built there.
>
> Rules:
> - **Read the transcript, don't skim it.** Find where each question starts by reading for the
>   turn in the conversation, not by pattern-matching one phrase. In some sessions a host
>   announces every question; in others the speaker reads them aloud himself with no cue.
> - `videoStart` is the second the **answer** begins, not the second the question is read. That's
>   the replay anchor — landing on the question means the viewer sits through it again.
> - **Rewrite, don't transcribe.** Auto-captions carry filler, false starts, and mis-heard words.
>   Write each question as a clean sentence that says what was actually asked. Same for answers:
>   they run several minutes with digressions, so write a faithful summary of the ruling or point
>   made — the replay link carries anyone who wants the full thing.
> - Keep the transcript's own language. Don't translate.
> - `author` is whatever attribution the recording gives ("Hamba Allah · perempuan, 29 · Jakarta
>   Pusat"), or `null` if none is stated. Don't invent one.
> - Skip anything graphic or identifying enough to embarrass a real person. These are real people
>   asking real questions on a public recording.
> - Aim for the substantial exchanges, not every aside. Seven or eight good pairs beats twenty
>   thin ones.
>
> Then verify: `npm run lint`, `npx next build`, and load `/events/<event-id>` to confirm the
> timestamps are ascending and each replay button seeks the embed to the right place.

## 3. Check it

```bash
npm run lint && npx next build
npm run dev   # then open /events/<your-event-id>
```

The list should read oldest-first with timestamps ascending down the page, and each ▶ button
should seek the embedded player rather than leaving for YouTube.

## Known sharp edges

- **Captions can't be fetched without `yt-dlp`.** YouTube's `timedtext` endpoint returns HTTP 200
  with a zero-byte body for an unauthenticated caller, so the caption URL scraped from the watch
  page is useless on its own. When `yt-dlp` breaks against a YouTube change, this script breaks.
- **Not every video has captions** in the language you asked for. The script says so and exits
  rather than writing an empty transcript.
- **Transcripts are committed on purpose.** Re-fetching is the fragile step, so the good copy is
  worth version-controlling — and it's the raw material for extracting more pairs later.
- **Republishing someone else's talk as text** is a different act from linking to it. Fine for
  these samples; worth settling properly before ingestion becomes a self-serve button.
