-- Add source language field to categories and tags
ALTER TABLE categories ADD COLUMN lang TEXT NOT NULL DEFAULT 'en-US';
ALTER TABLE tags ADD COLUMN lang TEXT NOT NULL DEFAULT 'en-US';
