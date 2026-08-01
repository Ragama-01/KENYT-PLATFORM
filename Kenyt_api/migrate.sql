

CREATE TABLE IF NOT EXISTS truck_positions (
  truck_id            INTEGER PRIMARY KEY REFERENCES trucks(id),
  control_tech_unit_id BIGINT NOT NULL,
  latitude             DOUBLE PRECISION NOT NULL,
  longitude            DOUBLE PRECISION NOT NULL,
  speed_kmh            DOUBLE PRECISION,
  heading_deg          DOUBLE PRECISION,
  satellites            INTEGER,
  reported_at           TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add this column to your existing trucks table if it isn't there yet,
-- so we can map Control-Tech's unit IDs to your truck records:
-- ALTER TABLE trucks ADD COLUMN control_tech_unit_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_truck_positions_reported_at ON truck_positions (reported_at);
