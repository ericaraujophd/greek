-- 001_init.sql: the whole schema for the first release.
--
-- Design notes (read these before changing anything):
--
-- * COURSE CONTENT IS NOT IN THE DATABASE. Units, key ideas, paradigms and
--   word lists live in the repo (src/content/), versioned with the code.
--   The database only stores PEOPLE and what they DID: who may sign in,
--   their flashcard schedules, answers, scores and notes. That keeps the
--   database small and makes content edits ordinary git commits.
--
-- * Every per-student table has user_id as the first column of its key,
--   and every query in server/routes filters by the signed-in user's id.
--   (When this moves to production we can also add Postgres row-level
--   security as a second lock; the API is the first.)
--
-- * Ids for content (unit_id 'u06', card_id 'word:λόγος', check_id 'u06',
--   item_id 'alpha:nu') are plain text chosen by the frontend content
--   files. They must never be renamed once students have data under them.

-- People who are allowed in. A row here is an invitation. Signing in with
-- Google is only accepted for an email that has an un-revoked invitation
-- (or is listed in ADMIN_EMAILS, so the first admin can always get in).
CREATE TABLE IF NOT EXISTS invitations (
  email        text PRIMARY KEY,                 -- always stored lower-case
  invited_by   text,                             -- admin's email
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,                      -- first successful sign-in
  revoked_at   timestamptz                       -- set => cannot sign in
);

-- One row per person who has signed in at least once.
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,            -- lower-case
  name          text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

-- Spaced-repetition schedule per student per card. `data` is the FSRS card
-- (see src/lib/srs.ts, StoredCard). `due` is copied out of it so "what is
-- due today" is an indexed query instead of a scan of every JSON blob.
CREATE TABLE IF NOT EXISTS cards (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id     text NOT NULL,
  data        jsonb NOT NULL,
  due         timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS cards_due ON cards (user_id, due);

-- Every answer to every question, append-only. Accuracy per item, study
-- days, session length and "your 3rd miss this week" are all computed from
-- this log, so nothing has to be kept in sync by hand.
CREATE TABLE IF NOT EXISTS answers (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     text NOT NULL,      -- what was asked about, e.g. 'form:ἀνθρώποις'
  drill       text NOT NULL,      -- which activity, e.g. 'review', 'check:u06'
  correct     boolean NOT NULL,
  given       text,               -- what the student answered (for "why")
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_user_time ON answers (user_id, created_at);
CREATE INDEX IF NOT EXISTS answers_user_item ON answers (user_id, item_id);

-- Practice checks and practice quizzes. One row per attempt; the dashboard
-- shows the best attempt. No pass/fail: scores only.
CREATE TABLE IF NOT EXISTS scores (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_id   text NOT NULL,       -- 'u06' (unit check) or 'q2' (practice quiz)
  correct    integer NOT NULL,
  total      integer NOT NULL,
  detail     jsonb,               -- per-question results, for "what you missed"
  taken_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_user_check ON scores (user_id, check_id);

-- The student's own notes per unit ("My notes").
CREATE TABLE IF NOT EXISTS notes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id     text NOT NULL,
  body        text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit_id)
);

-- The "Before this page" checklist per unit (read chapter, overview,
-- workbook). Stored as a small JSON object: {"read": true, ...}.
CREATE TABLE IF NOT EXISTS unit_progress (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id     text NOT NULL,
  checklist   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit_id)
);

-- Review state of each piece of drafted content. Claude drafts, Eric checks.
-- Students only see parts whose status is 'checked'... except admins, who
-- see everything (they are the ones checking). part: ideas | words | check
CREATE TABLE IF NOT EXISTS content_status (
  unit_id     text NOT NULL,
  part        text NOT NULL CHECK (part IN ('ideas', 'words', 'check')),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'checked')),
  checked_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, part)
);
