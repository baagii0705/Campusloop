-- Existing sponsor schema, retained here so fresh/local databases are reproducible.
-- IF NOT EXISTS preserves all production campaigns, requests and statistics.
CREATE TABLE IF NOT EXISTS sponsor_requests (
 id TEXT PRIMARY KEY,company TEXT NOT NULL,contact_name TEXT NOT NULL,email TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',image_url TEXT NOT NULL DEFAULT '',target_url TEXT NOT NULL DEFAULT '',
 start_at TEXT,end_at TEXT,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 admin_notes TEXT NOT NULL DEFAULT '',campaign_id TEXT,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),reviewed_at TEXT,
 placement TEXT NOT NULL DEFAULT 'both',duration_days INTEGER NOT NULL DEFAULT 7,quoted_price INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sponsor_campaigns (
 id TEXT PRIMARY KEY,request_id TEXT,company TEXT NOT NULL,image_url TEXT NOT NULL,target_url TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),start_at TEXT,end_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 placement TEXT NOT NULL DEFAULT 'both',quoted_price INTEGER NOT NULL DEFAULT 0,duration_days INTEGER NOT NULL DEFAULT 7
);
CREATE TABLE IF NOT EXISTS sponsor_events (
 campaign_id TEXT NOT NULL,day TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('view','click')),session_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),PRIMARY KEY(campaign_id,day,kind,session_id)
);
