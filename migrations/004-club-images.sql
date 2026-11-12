-- Additive: optional public club image. Existing clubs remain valid without one.
ALTER TABLE society_clubs ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
