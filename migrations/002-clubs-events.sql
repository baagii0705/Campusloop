-- Additive: school clubs and their events use existing Appwrite identities.
CREATE TABLE IF NOT EXISTS society_clubs (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 name TEXT NOT NULL,
 school TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL,
 summary TEXT NOT NULL,
 description TEXT NOT NULL,
 join_url TEXT NOT NULL DEFAULT '',
 meeting_info TEXT NOT NULL DEFAULT '',
 search_text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','archived')),
 review_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS society_clubs_public ON society_clubs(status,school,category,created_at);
CREATE INDEX IF NOT EXISTS society_clubs_owner ON society_clubs(owner_id,created_at);
CREATE TABLE IF NOT EXISTS society_events (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 club_id TEXT REFERENCES society_clubs(id),
 title TEXT NOT NULL,
 school TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL,
 description TEXT NOT NULL,
 location TEXT NOT NULL,
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 registration_url TEXT NOT NULL DEFAULT '',
 price_note TEXT NOT NULL DEFAULT '',
 search_text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','cancelled')),
 review_note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 reviewed_at TEXT,
 CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS society_events_public ON society_events(status,starts_at,ends_at,school);
CREATE INDEX IF NOT EXISTS society_events_club ON society_events(club_id,status,starts_at);
CREATE INDEX IF NOT EXISTS society_events_owner ON society_events(owner_id,created_at);
