CREATE TABLE IF NOT EXISTS vip_requests (listing_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rejected')), requested_at TEXT NOT NULL, expires_at TEXT);
CREATE INDEX IF NOT EXISTS vip_active ON vip_requests(status,expires_at);
