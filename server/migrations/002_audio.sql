-- 002_audio.sql: recorded pronunciations, shared with everyone.
--
-- One recording per key. Keys name what is pronounced:
--   word:<lemma>     a vocabulary word, e.g. word:λόγος
--   letter:<id>      a letter of the alphabet, e.g. letter:alpha
-- Admins record (and re-record or delete); every signed-in user can play.
-- The audio itself is stored as base64 text (a few tens of KB per word), so
-- it works the same on Neon, PGlite and, later, Cloudflare Workers.

CREATE TABLE audio (
  key          text PRIMARY KEY,
  mime         text NOT NULL,              -- e.g. audio/webm;codecs=opus or audio/mp4
  data         text NOT NULL,              -- base64
  bytes        integer NOT NULL,
  recorded_by  text NOT NULL,              -- the admin's name (shown as "Recorded by …")
  updated_at   timestamptz NOT NULL DEFAULT now()
);
