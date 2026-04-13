# Manage Blog Categories

Create, list, update, delete, or translate blog categories and subcategories via the backend API.

**Action:** $ARGUMENTS

---

## Instructions

You are a blog category management assistant. Use `curl` via the Bash tool for all API calls.

### Configuration

- **API Base URL:** Read `VITE_API_URL` from the `.env` file in the project root (default: `http://localhost:8000/api`)
- **API Key:** `ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7`
- **Auth Header:** `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"` on all manage endpoints
- **Translation Targets:** `[{"localeCode":"bs-BA","translatorCode":"bs"},{"localeCode":"hr-HR","translatorCode":"hr"},{"localeCode":"sr-Latn","translatorCode":"sr-Latn"},{"localeCode":"de-DE","translatorCode":"de"},{"localeCode":"fr-FR","translatorCode":"fr"},{"localeCode":"es-ES","translatorCode":"es"},{"localeCode":"it-IT","translatorCode":"it"},{"localeCode":"tr-TR","translatorCode":"tr"},{"localeCode":"ar-SA","translatorCode":"ar"},{"localeCode":"pt-BR","translatorCode":"pt"},{"localeCode":"nl-NL","translatorCode":"nl"},{"localeCode":"ru-RU","translatorCode":"ru"},{"localeCode":"ja-JP","translatorCode":"ja"},{"localeCode":"zh-Hans","translatorCode":"zh-Hans"},{"localeCode":"ko-KR","translatorCode":"ko"}]`

---

### Parse the User's Intent

The user's input ("$ARGUMENTS") will be one of:

- **list** / **show** — List all categories with their subcategories as a tree
- **create <label>** / **add <label>** — Create a top-level category
- **create sub <label> under <parent label>** — Create a subcategory under a parent
- **create many <label1>, <label2>, ...** — Bulk create top-level categories
- **delete <label or slug>** — Delete a category (warns if it has subcategories)
- **translate <label or slug>** / **translate all** — Translate category(ies) to all 15 locales
- **update <old label> to <new label>** — Rename a category
- Any ambiguous input — ask the user to clarify

---

### Execute the Action

#### List Categories

```
GET {API_URL}/blog/categories
```

Display results as a tree showing parent-child relationships:

```
Blog Categories (<count> total)
---
1. AI Engineering (ai-engineering) [15/15 translations]
   - LLM Ops (llm-ops) [15/15]
   - Prompt Engineering (prompt-engineering) [0/15]
2. Enterprise Architecture (enterprise-architecture) [15/15]
3. Cloud & DevOps (cloud-devops) [15/15]
   - Kubernetes (kubernetes) [0/15]
...
```

Group by `parentId`: items with `parentId: null` are top-level, others are nested under their parent.

#### Create Category

1. Generate `slug` from the label: lowercase, replace spaces with `-`, remove special characters, replace `&` with `and`.
2. Call `POST {API_URL}/manage/categories` with:
   ```json
   { "slug": "ai-engineering", "label": "AI Engineering", "translations": {}, "parentId": null }
   ```
3. On success, ask: **"Translate to all 15 locales? (yes/no)"**
4. If yes, call `POST {API_URL}/manage/categories/{id}/translate` with the translation targets array.

#### Create Subcategory

1. First list categories to find the parent by label or slug.
2. Generate slug for the subcategory.
3. Call `POST {API_URL}/manage/categories` with `parentId` set to the parent's `id`.
4. Offer to translate.

#### Delete Category

1. List categories to find the match.
2. Check if it has children (subcategories with matching `parentId`).
3. If it has children, warn: **"This category has <N> subcategories that will be orphaned. Continue? (yes/no)"**
4. If confirmed, call `DELETE {API_URL}/manage/categories/{id}`.

#### Update Category

1. Find the category by old label/slug.
2. Generate new slug from new label.
3. Call `PUT {API_URL}/manage/categories/{id}` with `{ "slug": "<new>", "label": "<new>" }`.
4. Ask if they want to re-translate.

#### Translate

1. Find the category(ies) by label/slug (or all if "translate all").
2. For each, call `POST {API_URL}/manage/categories/{id}/translate` with the full targets array.
3. Show progress and results.

---

### Summary

Print a summary of what was done.

---

## Important Notes

- All `curl` commands must include `-s` (silent).
- For authenticated requests, always include `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"`.
- Always include `-H "Content-Type: application/json"` for POST/PUT.
