# Manage Blog Posts

List, update, delete, feature, unpublish, or translate existing blog posts via the backend API.

**Action:** $ARGUMENTS

---

## Instructions

You are a blog management assistant. Use `curl` via the Bash tool for all API calls.

### Configuration

- **API Base URL:** Read `VITE_API_URL` from the `.env` file in the project root (default: `http://localhost:8000/api`)
- **API Key:** `ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7`
- **Auth Header:** `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"` on all manage endpoints
- **Translation Locales:** ALL supported languages (~136). Read `src/lib/languages.ts` and extract all `translatorCode` values excluding `en`.

---

### Parse the User's Intent

The user's input ("$ARGUMENTS") will be one of:

- **list** / **show** — List all blog posts with status
- **show <slug or title>** — Show full details of a specific post
- **delete <slug or title>** — Delete a blog post
- **unpublish <slug or title>** — Set a post to draft
- **publish <slug or title>** — Set a draft to published
- **feature <slug or title>** — Toggle featured status
- **translate <slug or title>** — Translate a post to all 15 locales
- **translate all** — Translate ALL posts to all 15 locales
- **update <slug or title>** — Interactively update post fields (ask what to change)
- **seed** — Seed the database from static blog posts in `src/data/blog-posts.ts`
- Any ambiguous input — ask the user to clarify

---

### Execute the Action

#### List Posts

Call `GET {API_URL}/manage/blog` (admin, shows draft/published status) or `GET {API_URL}/blog` (public).

Display as a table:

```
Blog Posts (<count> total)
---
| # | Title                                          | Slug                              | Category         | Status    | Featured | Date       |
|---|------------------------------------------------|-----------------------------------|------------------|-----------|----------|------------|
| 1 | Shipping AI Features with Guardrails           | shipping-ai-features-with...      | AI Engineering   | Published | *        | 2026-02-23 |
| 2 | Platform Golden Paths for Cloud Delivery       | platform-golden-paths...          | Cloud & DevOps   | Draft     |          | 2026-02-18 |
...
```

#### Show Post Details

Find the post by slug or partial title match. Display all metadata, word count, tags, and translation status.

#### Delete Post

1. Find the post, show its title and slug.
2. Ask: **"Delete '<title>'? This cannot be undone. (yes/no)"**
3. If confirmed, call `DELETE {API_URL}/manage/blog/{slug}`.

#### Publish / Unpublish

Call `PUT {API_URL}/manage/blog/{slug}` with `{ "isPublished": true }` or `{ "isPublished": false }`.

#### Feature

Call `PUT {API_URL}/manage/blog/{slug}` with `{ "isFeatured": true }` (or `false` to unfeature — toggle based on current state).

#### Translate

Call `POST {API_URL}/manage/blog/{slug}/translate` with ALL ~136 language codes (read from `src/lib/languages.ts` translatorCode values, excluding `en`). Use a 120-second timeout.

Use a 60-second timeout. For "translate all", iterate over each post.

#### Update

1. Find the post, show current values.
2. Ask the user which fields to change (title, excerpt, category, tags, content, etc.).
3. Call `PUT {API_URL}/manage/blog/{slug}` with only the changed fields.

#### Seed

1. Read `src/data/blog-posts.ts` to understand the static posts.
2. Call `POST {API_URL}/manage/blog/seed` with the posts array (map to `CreateBlogPostDto` format with `isPublished: true`).
3. Show how many were inserted.

---

### Summary

Print a summary of what was done.

---

## Important Notes

- All `curl` commands must include `-s` (silent).
- For authenticated requests, always include `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"`.
- Always include `-H "Content-Type: application/json"` for POST/PUT.
- Never add "Co-Authored-By: Claude" to any commits.
