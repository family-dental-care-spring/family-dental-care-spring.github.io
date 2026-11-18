-- Family Dental Care of Spring — booking database (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference     TEXT NOT NULL UNIQUE,
  kind          TEXT NOT NULL DEFAULT 'appointment',  -- 'appointment' or 'lab'
  doctor        TEXT NOT NULL,                        -- key from DOCTORS_JSON
  date          TEXT NOT NULL,                         -- 'YYYY-MM-DD' (India local date)
  time          TEXT NOT NULL,                         -- 'HH:MM' (India local time, 24h)
  start_ts      INTEGER NOT NULL,                      -- UTC unix seconds of appointment start
  patient_name  TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  language      TEXT NOT NULL DEFAULT 'en',             -- 'en' or 'hi'
  details       TEXT,                                   -- JSON blob: reason, notes, etc.
  status        TEXT NOT NULL DEFAULT 'booked',          -- 'booked' | 'cancelled' | 'reminded'
  created_at    INTEGER NOT NULL,

  -- One slot cannot be booked twice.
  UNIQUE (kind, doctor, date, time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_start_ts ON bookings (start_ts);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_lookup    ON bookings (kind, doctor, date);
