-- Sual: application schema. See ROADMAP.md §4.
--
-- better-auth owns its own tables ("user", session, account, verification) and creates them
-- itself: `npm run auth:migrate`. Nothing here references them by foreign key except
-- events.created_by, which is deliberately ON DELETE SET NULL; deleting an admin must never
-- cascade into deleting a majelis.

create table if not exists events (
  id                  text primary key,
  name                text not null,
  starts_at           timestamptz not null,
  venue               text not null,
  speaker             text not null,

  -- Where the session is in its life. Orthogonal to whether it has video.
  status              text not null default 'scheduled'
                        check (status in ('scheduled', 'live', 'archived')),

  -- NULL = follow status (open only while live). true/false = admin override, which is what
  -- keeps an archived session taking questions when the organiser wants that. Read it as
  -- `coalesce(accepting_questions, status = 'live')`, see accepting_questions() below.
  accepting_questions boolean,

  moderation          text not null default 'auto' check (moderation in ('auto', 'manual')),
  public_archive      boolean not null default false,

  image               text,
  youtube_id          text,

  created_by          text,
  created_at          timestamptz not null default now()
);

create table if not exists questions (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null references events(id) on delete cascade,

  -- The DB is the trust boundary, not SubmitForm. This constraint is the one that counts.
  body         text not null check (length(btrim(body)) between 1 and 500),

  -- Moderation, one axis. Answeredness is derived from `answer is not null`, never stored as
  -- a status: a question can be approved *and* answered, and must stay hideable after it is.
  status       text not null default 'approved'
                 check (status in ('submitted', 'approved', 'hidden')),

  answer       text,
  answered_at  timestamptz,
  retracted    boolean not null default false,

  -- Display attribution, separate from identity. A student can leave contact detail and still
  -- show as anonymous.
  is_anonymous boolean not null default true,
  author       text,

  -- Never returned by any query the public can reach. See lib/queries.ts.
  contact      text,
  asker_token  text,   -- opaque per-browser id, so a student can find their own questions
  ip_hash      text,   -- salted hash, for rate limiting only

  source       text check (source in ('transcript')),
  video_start  integer check (video_start >= 0),

  created_at   timestamptz not null default now()
);

-- Keyset pagination reads (event_id, created_at, id) in that order; the other two indexes serve
-- the rate-limit count and the "my questions" lookup.
create index if not exists questions_page_idx  on questions (event_id, created_at, id);
create index if not exists questions_rate_idx  on questions (ip_hash, created_at desc);
create index if not exists questions_asker_idx on questions (asker_token, created_at desc);

-- Every answer edit, kept forever. Answers publish directly and are edited in place, so this is
-- the only record of what was previously attributed to the speaker. Nothing is ever deleted.
create table if not exists answer_revisions (
  id          bigserial primary key,
  question_id uuid not null references questions(id) on delete cascade,
  answer      text,
  retracted   boolean not null default false,
  edited_by   text,
  created_at  timestamptz not null default now()
);

create index if not exists answer_revisions_q_idx on answer_revisions (question_id, created_at desc);

-- Whether an event takes new questions right now. One expression, used by the insert path and
-- the UI both, so they can't disagree.
create or replace function accepting_questions(e events) returns boolean
  language sql immutable as
$$ select coalesce(e.accepting_questions, e.status = 'live') $$;
