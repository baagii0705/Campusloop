CREATE TABLE IF NOT EXISTS saved_listing_searches (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  term TEXT NOT NULL,
  search_key TEXT NOT NULL,
  terms_json TEXT NOT NULL,
  school TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (owner_id, search_key, school)
);

CREATE INDEX IF NOT EXISTS saved_listing_searches_school
  ON saved_listing_searches (school, created_at);

CREATE TABLE IF NOT EXISTS listing_match_notifications (
  owner_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  PRIMARY KEY (owner_id, listing_id)
);

CREATE INDEX IF NOT EXISTS listing_matches_inbox
  ON listing_match_notifications (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listing_match_scan (
  owner_id TEXT PRIMARY KEY,
  through_at TEXT NOT NULL,
  through_id TEXT NOT NULL
);
