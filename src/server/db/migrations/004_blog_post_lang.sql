-- Add source language field to blog_posts
ALTER TABLE blog_posts ADD COLUMN lang TEXT NOT NULL DEFAULT 'en-US';
