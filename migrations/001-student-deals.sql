-- Additive migration; sponsor requests, campaigns and student listings are untouched.
CREATE TABLE IF NOT EXISTS student_deal_requests (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  benefit TEXT NOT NULL,
  conditions TEXT NOT NULL,
  category TEXT NOT NULL,
  school TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at TEXT,
  CHECK(end_at > start_at)
);
CREATE INDEX IF NOT EXISTS student_deal_request_email_date ON student_deal_requests(email,created_at);
CREATE TABLE IF NOT EXISTS student_deals (
  id TEXT PRIMARY KEY REFERENCES student_deal_requests(id),
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  benefit TEXT NOT NULL,
  conditions TEXT NOT NULL,
  category TEXT NOT NULL,
  school TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(end_at > start_at)
);
CREATE INDEX IF NOT EXISTS student_deals_public_window ON student_deals(active,end_at,school);
