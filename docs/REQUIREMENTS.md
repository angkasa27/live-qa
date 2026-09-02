# Sual: product requirements

Requirement set for designing Sual's interface from scratch. It records what the system must do.
It records no existing interface decision: layout, copy, component choice and visual language are
open.

**Bar:** every requirement (P1–P7, A1–A8, S1–S3) reachable, every invariant intact, every row of
the visibility matrix expressible in the design.

Read [ROADMAP.md](../ROADMAP.md) for the reasoning behind a decision recorded here.

## Domain

A **majelis** is an Islamic study circle in Indonesia. A student writes a question on paper and
passes it forward to the speaker. Paper fails three ways:

1. Nobody carries a pen, so asking means borrowing paper from a stranger.
2. Passing forward spends part of a 10–30 minute Q&A window.
3. The queue outlasts the session, and the unanswered slips are lost with nothing telling the
   person who asked.

Failure 3 is the product. A question asked at minute 28 still gets an answer days later, and its
asker can find out. Treating the live session as the whole story is the primary way to design this
wrong.

A livestreamed majelis gets this free: a remote viewer submits through the same path as someone in
the room. Presence is not a condition of participating.

Interface language is Indonesian.

## Roles

| | Jamaah (attendee) | Admin (operator) | Pemateri (speaker) |
|---|---|---|---|
| **Identity** | No account. An opaque token in their own browser. | Account provisioned by hand. | Signed in on the shared admin account. |
| **Context** | Mosque floor in the evening, or at home on a stream. Phone, one hand. | Beside the room during the session; at home afterwards. Phone or laptop, both required. | On stage mid-teaching, holding a tablet handed over already open. |
| **Writes** | Questions. | Everything. | Nothing. Read-only. |

Recording answers is the admin's job. That is how it already works out loud in the room, and a
speaker who wants no extra task will not work a queue. Keep the speaker surface read-only (S1–S3).

Every admin sees every session. There is no per-admin ownership.

## Orthogonal pairs

Two pairs were each modelled as one value in an earlier draft and had to be separated. Recombining
them is the most likely way to get this wrong.

**Session state ⊥ video.** A livestreamed majelis is `live` *and* has video at once; an archived
one may have a recording or none. State never implies video; video never implies the session runs.

- state: `scheduled` · `live` · `archived`
- video: present · absent

**Moderation ⊥ answeredness.** A question can be approved *and* answered, and stays hideable after
it is answered. Two signals, never one combined status.

- moderation: `awaiting review` · `approved` · `hidden`
- answer: absent · published · revised · retracted

## Lifecycle

| State | Submissions | Meaning |
|---|---|---|
| `scheduled` | closed | Listed publicly with time, venue, speaker. |
| `live` | open | Running. Speaker surface in use. Remote and present attendees are identical. |
| `archived` | closed by default | Finished. Answers keep arriving. |

Derived rules:

- Questions are accepted **only while `live`**, unless an admin overrides it for that session. Show
  when the override is active rather than diverging silently from state.
- Answers are permitted in **every** state, always. This is what lets the queue outlive the session.
- Questions order **oldest first**. The order asked is the order the speaker works through them.

## Requirements: Jamaah

**P1 — Find the session I am attending.** Browsable without signing in. Each session carries name,
speaker, time, venue, state, and how many questions are already asked. A `live` session is
distinguishable from the others without reading. An optional cover image comes from the organiser
or the linked recording; the product works with none.

**P2 — Ask in well under a minute.** Submitting requires no account and no sign-in. Attribution is
**opt-in**: anonymous is the default, attaching a name is the extra step. Questions cap at 500
characters, communicated before the cap is hit rather than as a rejection after. The attendee may
optionally leave a contact address for notification (P7). Rate limiting keys on the browser, not
the network address — hundreds of phones share one venue address, and an address-keyed limit tight
enough to stop one spammer locks out the room.

**P3 — Know it arrived.** Confirmation states what happens next, and this **differs by review
mode**: published immediately, or held for admin review. Saying a question is queued for review is
what prevents duplicate submissions and the admin moderating the same question three times. Offer
a route onward to P6.

**P4 — Read what has been asked and answered.** Oldest first, paged. Updates are **on-demand**:
the audience's devices do not poll, and refreshing is an action the attendee takes. A revised
answer is marked as revised; the earlier wording stays private to the admin (A4). A retracted
answer leaves its question visible with no answer standing.

**P5 — Hear the answer in the speaker's own words.** An answer may carry a replay position into the
session recording. The position marks where the **answer** begins, not where the question is read
out — otherwise the viewer sits through the question again. With a player present, replay happens
in place; without one it opens the recording at that moment. Archived sessions carry a standing
statement that the written answer is an admin's summary and the recording is the authority.

**P6 — Find out later whether mine was answered.** This capability is why the product exists;
it is not secondary. Works with no account, bound to the submitting browser — state plainly that
clearing browser data or changing device loses the list. Each entry shows its session and its
standing: answered, awaiting review, approved but unanswered, or not displayed. A question hidden
*after* being answered still shows its asker where it stands. A session withdrawn from public view
still shows its name to the asker, without a working link.

**P7 — Be told when my answer lands.** Notification on answer publication, to the address left at
submission. Contact detail never reaches any public surface and is separate from display
attribution in every respect. **Unbuilt**; addresses are already collected and stored.

## Requirements: Admin

**A1 — See where the work is.** Sessions grouped by state, `live` first. Each shows how many
questions await review and how many are unanswered; during a live session the review count is the
only number demanding immediate action. A session closed to submissions reads as closed.

**A2 — Create and configure a session.** Required: name, time, venue, speaker. Optional: cover
image, livestream or recording link. The video link accepts the several forms a YouTube URL takes,
including a bare identifier.

**A3 — Moderate and answer in one pass.** Filter by what needs doing: awaiting review, unanswered,
answered, all. Default to the work — unanswered — not the full archive. Approving and hiding are
single actions, and hiding is reversible. Unanswered questions surface above answered ones so the
operator never hunts for work. This surface is **self-updating**: it is one of two or three
devices per event that poll. Operable on a phone as well as a laptop; an admin does not always
have a laptop at the venue.

**A4 — Correct a wrong answer as fast as I published it.** Answers publish directly; there is no
approval queue in front of them. **Fatwa risk** is why: an answer is attributed to a named
religious scholar, so a mistyped or misheard ruling is the highest-consequence failure in the
system, above downtime. The correction path is never slower than the publication path. Withdrawing
an answer is a distinct outcome from never having answered — the question remains, the answer is
retracted. Revisions are retained; the public sees only that a revision happened, and full history
is an admin capability.

**A5 — Change session behaviour while it runs.** Four independent controls: session state ·
submissions open · review mode (automatic or manual) · archive publicly reachable. Submissions
normally follow state; an override is visible and reversible back to following it. Review mode is
the pressure valve — if volume spikes past what manual approval absorbs, switching is instant and
obvious. These controls do not compete with the questions for attention during a live session.

**A6 — Draft answers from the session's own recording.** Available only for sessions with a
recording. Runs once for the whole session, not per question. Output is **advisory**: proposals
offered for acceptance, staying distinguishable from the admin's own writing until a human accepts
one. Requirements:

- Most questions return no proposal, and that is the correct outcome — the speaker reaches only
  part of the queue. Report it as a normal result with a count.
- Every proposal carries its evidence: the position in the recording, and a short quote of what
  the speaker said taking that question up, so the match is checkable.
- A partial or merged match is expressible; questions are often answered alongside another rather
  than individually.
- The operation takes a minute or more and can fail, including when the recording is not publicly
  reachable. Both need real handling.
- Accepting a proposal also sets the answer's replay position, feeding P5.

**A7 — Hand the device to the speaker.** The speaker surface opens from the session the admin is
already running. There is no shareable speaker link and no second credential to maintain.

**A8 — Put the session on paper.** Question, attribution and answer, without application
furniture. Serves both timings: the finished Q&A afterwards, and the pending queue at the start.
**Unbuilt.**

## Requirements: Pemateri

**S1 — Read one question at a time.** One question occupies the surface. Advancing is a single
gesture, and also works from keyboard or pointer. A long question stays fully readable without the
speaker scrolling or manipulating the view. Attribution accompanies it — a name where given,
otherwise anonymous. A recorded answer may accompany the question for reference. **Only approved
questions reach this surface**: a question awaiting review must never appear on a display the room
can see, which is the entire purpose of moderation.

**S2 — Know how much is left.** Position and total available without competing with the question.
Where more questions exist than are loaded, the total presents as approximate rather than as a
false exact figure. Arriving questions do not disturb the question being read.

**S3 — An empty queue that reads as calm.** An empty queue is the expected condition at the start
of every session, not an exception. It offers a way back without the speaker navigating anything.

## Flows

Each crosses more than one role and has a fork to design.

**A question asked and answered in the room**

1. Attendee submits (P2).
2. **Fork on review mode** — automatic: immediately public. Manual: held, visible only to its
   asker, marked pending.
3. Admin approves (A3). Only from here can it reach the speaker.
4. Speaker reads it aloud and answers (S1). Nothing is written on this surface.
5. Admin records the answer (A3). Published directly, immediately visible, immediately correctable.
6. Attendee sees it — session list (P4), own submissions (P6), or notification (P7).

**A question the session ran out of time for**

1. Session archived. Submissions close; unanswered questions stay open indefinitely.
2. Admin works the backlog later. **Fork** — with a recording, answers may be drafted for
   acceptance (A6); without one, the admin composes from notes.
3. Answer published against the archived session. Permitted in every state; this step is the core
   promise.
4. Attendee told by notification (P7), or on next checking their own submissions (P6).

**An answer that turns out to be wrong**

1. Error noticed by admin, speaker, or reader. Highest-consequence path in the system — see fatwa
   risk (A4).
2. **Fork** — revise the wording, or retract entirely, leaving the question with no answer standing.
3. Prior version retained. Public sees only that a revision occurred.
4. Correction is live immediately; no approval queue stands in front of it.

## Visibility matrix

Correctness requirement, not a presentation preference.

| Question state | Its asker | Other attendees | Speaker | Admin |
|---|---|---|---|---|
| awaiting review | visible, marked pending | hidden | hidden | visible, actionable |
| approved | visible | visible | visible | visible |
| hidden | visible, marked not displayed | hidden | hidden | visible, reversible |
| answer published | answer shown | answer shown | answer shown | answer editable |
| answer revised | marked revised | marked revised | current version | full history |
| answer retracted | question stands, answer withdrawn | question stands, answer withdrawn | question only | history intact |
| contact address | never displayed | never displayed | never displayed | never displayed |

Also design: a session with no questions, a session withdrawn from public view, a failed
submission, a queue longer than one page, and a question long enough to stress every length
assumption.

## Invariants

Each can read as friction or clutter, and each is load-bearing. Trading one away is an argued
decision, not a simplification. Cross-references name the requirements each constrains.

| Invariant | Why |
|---|---|
| Anonymity is display, not identity (P2, P7) | An attendee can leave a contact address and still appear anonymous. Separate concerns; collapsing them into one choice breaks notification or breaks privacy. |
| A pending question is visible to its asker (P3, P6) | Submitting into a void produces repeat submissions and the admin moderating one question several times. |
| Answers publish directly and stay correctable (A4) | Fatwa risk. Correction must never be slower than publication. |
| The system is **append-only** (A3, A4) | Hiding is reversible, retraction is a state, revisions are retained. No destructive action exists anywhere in the product. |
| Machine drafts stay **advisory** (A6) | A proposal carries visible evidence and awaits human acceptance. Once it is indistinguishable from the admin's own writing, the safeguard is gone. |
| The audience is **on-demand**; admin and speaker are **self-updating** (P4, A3, S2) | Two or three polling devices per event rather than several thousand keeps the system deployable in a venue on shared wifi. |
| Oldest first (P4, S1) | The order asked is the order the speaker works through them. Ranking by popularity or recency breaks the room's real sequence. |
| Classification reorders; humans hide | If automatic triage arrives it may reorder and annotate. Burying a sincere question in a religious setting is a serious failure, not a ranking miss. |
| Attendee identity is a browser token (P2, P6) | A sign-in wall in front of asking defeats the premise. Admin accounts are provisioned by hand. |
| The archive is reachable by link only, not indexed (P5) | A searchable public archive of a named scholar's answers, written from memory by a volunteer, is a fatwa database. The summary-versus-recording statement is part of the content. |

## Out of scope

Deliberate exclusions. Leave no room for them.

Voting or upvoting · threaded replies · a speaker-facing answering capability · attendee accounts
or profiles · public sign-up · multi-organisation separation · presence or typing indicators ·
automatic triage and duplicate grouping · WhatsApp notifications · archive search · editing or
deleting a submitted question · extracting Q&A from third-party recordings.

P7 and A8 are committed and unbuilt; their requirements are above. Everything else in this section
is genuinely absent.
