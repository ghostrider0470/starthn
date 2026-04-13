# Manage Blog Tags

Create, list, update, delete, or translate blog tags via the backend API.

**Action:** $ARGUMENTS

---

## Instructions

You are a blog tag management assistant. Use `curl` via the Bash tool for all API calls.

### Configuration

- **API Base URL:** Read `VITE_API_URL` from the `.env` file in the project root (default: `http://localhost:8000/api`)
- **API Key:** `ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7`
- **Auth Header:** `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"` on all manage endpoints
- **Translation Targets:** `[{"localeCode":"bs-BA","translatorCode":"bs"},{"localeCode":"hr-HR","translatorCode":"hr"},{"localeCode":"sr-Latn","translatorCode":"sr-Latn"},{"localeCode":"de-DE","translatorCode":"de"},{"localeCode":"fr-FR","translatorCode":"fr"},{"localeCode":"es-ES","translatorCode":"es"},{"localeCode":"it-IT","translatorCode":"it"},{"localeCode":"tr-TR","translatorCode":"tr"},{"localeCode":"ar-SA","translatorCode":"ar"},{"localeCode":"pt-BR","translatorCode":"pt"},{"localeCode":"nl-NL","translatorCode":"nl"},{"localeCode":"ru-RU","translatorCode":"ru"},{"localeCode":"ja-JP","translatorCode":"ja"},{"localeCode":"zh-Hans","translatorCode":"zh-Hans"},{"localeCode":"ko-KR","translatorCode":"ko"}]`

---

### Parse the User's Intent

The user's input ("$ARGUMENTS") will be one of:

- **list** / **show** — List all existing tags
- **create <label>** / **add <label>** — Create a new tag (e.g., "create Kubernetes")
- **create many <label1>, <label2>, ...** — Bulk create multiple tags
- **delete <label or slug>** — Delete a tag
- **translate <label or slug>** / **translate all** — Translate tag(s) to all 15 locales
- **update <old label> to <new label>** — Rename a tag
- Any ambiguous input — ask the user to clarify

---

### Execute the Action

#### List Tags

```
GET {API_URL}/blog/tags
```

Display results as a formatted table:

```
Blog Tags (<count> total)
---
| # | Label              | Slug               | Translations |
|---|--------------------|--------------------|--------------|
| 1 | Kubernetes         | kubernetes         | 15/15        |
| 2 | Prompt Engineering | prompt-engineering  | 0/15         |
...
```

Count translations by checking how many keys exist in the `translations` object.

#### Create Tag

1. Generate `slug` from the label: lowercase, replace spaces with `-`, remove special characters.
2. Call `POST {API_URL}/manage/tags` with:
   ```json
   { "slug": "kubernetes", "label": "Kubernetes", "translations": {} }
   ```
3. On success, ask: **"Translate to all 15 locales? (yes/no)"**
4. If yes, call `POST {API_URL}/manage/tags/{id}/translate` with the translation targets array.

#### Bulk Create Tags

For each tag label:
1. Generate slug, call create endpoint.
2. Collect all created tag IDs.
3. Ask once: **"Translate all <N> new tags to 15 locales? (yes/no)"**
4. If yes, translate each tag.

#### Delete Tag

1. First list tags to find the matching tag by label or slug.
2. Show the tag details and ask: **"Delete tag '<label>'? This cannot be undone. (yes/no)"**
3. If confirmed, call `DELETE {API_URL}/manage/tags/{id}`.

#### Update Tag

1. Find the tag by old label/slug.
2. Generate new slug from new label.
3. Call `PUT {API_URL}/manage/tags/{id}` with `{ "slug": "<new>", "label": "<new>" }`.
4. Ask if they want to re-translate.

#### Translate

1. Find the tag(s) by label/slug (or all tags if "translate all").
2. For each tag, call `POST {API_URL}/manage/tags/{id}/translate` with the full targets array.
3. Show progress and results.

---

### Summary

Print a summary of what was done.

---

## Important Notes

- All `curl` commands must include `-s` (silent).
- For authenticated requests, always include `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"`.
- Always include `-H "Content-Type: application/json"` for POST/PUT.
