-- 003_audio_students.sql: students' own recordings, and submissions.
--
-- audio_mine         each user's private recordings, to compare their own
--                    pronunciation with the shared one. One per user per key.
-- audio_submissions  a student offers their recording as the shared one.
--                    An admin listens and accepts (it replaces the shared
--                    recording in `audio`, credited to the student) or
--                    declines. Keys are the same as in `audio`
--                    (word:<lemma>, letter:<id>).

CREATE TABLE audio_mine (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key         text NOT NULL,
  mime        text NOT NULL,
  data        text NOT NULL,                 -- base64
  bytes       integer NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE audio_submissions (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key          text NOT NULL,
  mime         text NOT NULL,
  data         text NOT NULL,                -- base64, a copy taken at submit time
  bytes        integer NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewed_by  text
);
CREATE INDEX audio_submissions_pending ON audio_submissions (status, created_at);
