CREATE TABLE IF NOT EXISTS processed_images (
  path TEXT PRIMARY KEY,
  format TEXT NOT NULL DEFAULT 'webp',
  widths TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  source TEXT NOT NULL
);
