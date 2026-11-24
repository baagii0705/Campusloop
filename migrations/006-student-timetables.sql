CREATE TABLE IF NOT EXISTS student_timetables (
  owner_id TEXT PRIMARY KEY,
  lessons_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
