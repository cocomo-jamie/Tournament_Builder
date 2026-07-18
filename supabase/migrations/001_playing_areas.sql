-- Rename tables
ALTER TABLE courts RENAME TO playing_areas;
ALTER TABLE court_queue RENAME TO playing_area_queue;

-- Rename columns on events
ALTER TABLE events RENAME COLUMN court_count TO area_count;
ALTER TABLE events RENAME COLUMN court_label TO area_label;

-- Rename FK columns
ALTER TABLE matches RENAME COLUMN court_id TO playing_area_id;
ALTER TABLE playing_area_queue RENAME COLUMN court_id TO playing_area_id;

-- Rename indexes
ALTER INDEX idx_courts_event RENAME TO idx_playing_areas_event;
ALTER INDEX idx_court_queue_event RENAME TO idx_playing_area_queue_event;
ALTER INDEX idx_court_queue_waiting RENAME TO idx_playing_area_queue_waiting;
ALTER INDEX idx_matches_court RENAME TO idx_matches_playing_area;