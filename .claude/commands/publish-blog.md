# Publish Blog Post

Research a topic, generate an SEO-optimized blog post with images, publish it via the backend API, and trigger auto-translation to 15 SEO priority locales.

**Topic:** $ARGUMENTS

---

## Instructions

You are a blog publishing assistant. Follow these steps exactly, using `curl` via the Bash tool for all API calls.

### Configuration

- **API Base URL:** Read `VITE_API_URL` from the `.env` file in the project root (default: `http://localhost:8000/api`)
- **API Key:** `ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7`
- **Auth Header:** `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"` on all manage endpoints
- **Translation Locales:** Translate to ALL supported languages. Fetch the full list by reading `src/lib/languages.ts` and extracting all `translatorCode` values (excluding `en`). There are ~136 languages. Pass them all in the translate API call — the backend handles batching internally.

---

### Step 1: Research the Topic

Use the WebSearch and WebFetch tools to research the topic thoroughly:

1. Search for 3-5 high-quality sources (recent articles, documentation, case studies) related to the topic.
2. Read the top results to gather key facts, statistics, expert opinions, and current trends.
3. Identify the primary keyword and 3-5 secondary keywords for SEO targeting.
4. Note any unique angles or insights that would differentiate this article from existing content.

Compile your research notes before proceeding. The final article must be **factually accurate and grounded in real sources** — never fabricate statistics, quotes, or case studies.

---

### Step 2: Find Images

Search for 2-3 relevant images to include in the article. Use two strategies:

#### Strategy A: Unsplash (preferred for hero/decorative images)
Search Unsplash for relevant photos. Use URLs in this format:
```
https://images.unsplash.com/photo-{ID}?w=1200&q=80&auto=format
```
These are direct-linkable and don't require upload.

#### Strategy B: Upload to self-hosted storage (preferred for diagrams, screenshots, technical images)
If you find a relevant image that should be self-hosted, download it and upload via:
```bash
# Download the image
curl -sL "https://example.com/image.jpg" -o /tmp/blog-image.jpg

# Upload to blob storage
curl -s -X POST "{API_URL}/manage/blog/upload-image" \
  -H "X-Authorization: Bearer {API_KEY}" \
  -F "image=@/tmp/blog-image.jpg" | jq -r '.url'
```
This returns a permanent Azure Blob Storage URL.

**Image guidelines:**
- Use 1-2 images per article (don't overdo it)
- Place images after the first `<h2>` section or between sections to break up text
- Always include `alt` text describing the image for SEO and accessibility
- Use `style="max-width:100%;height:auto;border-radius:8px;margin:1.5rem 0"` for consistent display
- Prefer landscape/wide images (16:9 or similar)

---

### Step 3: Fetch Categories & Tags

Make these two calls (no auth needed — public endpoints):

- `GET {API_URL}/blog/categories` -> returns `Category[]` where each has `id`, `slug`, `label`, and `parentId` fields
- `GET {API_URL}/blog/tags` -> returns `Tag[]` where each has `id`, `slug`, and `label` fields

Store the results for use in content generation.

---

### Step 4: Generate SEO-Optimized Blog Post

Using the topic provided by the user ("$ARGUMENTS") and your research from Step 1, generate a complete blog post with these SEO constraints:

#### Metadata
- **title**: 50-60 characters, primary keyword near the start
- **slug**: Derived from title — lowercase, hyphenated, no stop words (a, the, is, for, with, etc.)
- **excerpt**: Exactly 150-155 characters (this becomes meta description and og:description — character count matters for SERP display)
- **author**: Do NOT set this field. The backend automatically resolves the author name from the authenticated API key's user profile. If you include `author` in the payload it will be overridden server-side.
- **readTime**: Calculate based on ~200 words per minute (e.g., "6 min read")
- **publishedAt**: Today's date in `YYYY-MM-DD` format
- **isPublished**: `true`
- **isFeatured**: `false`

#### Category & Tags
- **category**: Pick the single best-matching category `slug` from the fetched categories. If no good match exists, tell the user and ask them to pick or offer to create one.
- **subcategory**: If the category has subcategories (children with matching `parentId`), pick the best subcategory `slug`. Otherwise omit.
- **tags**: Pick 3-5 relevant tag `slug` values from the fetched tags. If fewer than 3 good matches exist, tell the user which tags are available and offer to create missing ones.

#### Content
- **content**: A single-element string array `["<html content>"]` containing the full article as one HTML string. This matches how the rich text editor saves content.
- The HTML content must include:
  - 3-4 `<h2>` subheadings for scannability and SEO structure
  - `<p>` paragraphs with natural keyword placement
  - `<strong>` and `<em>` for keyword emphasis (use sparingly, 2-3 times)
  - At least one `<ul>` or `<ol>` list for featured snippet eligibility
  - 1-2 `<img>` tags from Step 2 placed between sections — use the Unsplash URL or uploaded blob URL. Format: `<img src="URL" alt="descriptive alt text" style="max-width:100%;height:auto;border-radius:8px;margin:1.5rem 0" />`
  - 800-1200 words total
- Write in a professional, authoritative tone consistent with the existing blog posts (see `src/data/blog-posts.ts` for tone reference — informative, practical, no fluff)
- Ground claims in your research. Reference real technologies, frameworks, or methodologies — not hypothetical ones.
- **MANDATORY: End the HTML with a `<h2>Sources</h2>` section** containing a `<ul>` of `<li>` items, each with an `<a href="..." target="_blank" rel="noopener noreferrer">` link to the research sources used. Every claim must be traceable to a source. Format: `<li><a href="URL">Source Title</a> — Publisher</li>`
- Do NOT include `<h1>` (the title is rendered separately)
- Do NOT include `<script>` or `<style>` tags

#### Cover Image (optional)
- If you found a particularly good hero image, set `coverImage` in the post payload to its URL. This is displayed on blog cards in the listing page.
- Use a landscape image (16:9 ratio preferred). Either an Unsplash URL or an uploaded blob URL.

---

### Step 5: Present for User Review

Display a formatted summary:

```
Blog Post Preview
---

Title:    <title> (<char count> chars)
Slug:     <slug>
Excerpt:  <excerpt> (<char count> chars)
Category: <category label> (<category slug>)
Tags:     <tag labels> (<tag slugs>)
Author:   (auto-resolved from API key)
Read Time: <readTime>
Date:     <publishedAt>
Cover:    <coverImage URL or "none">
Images:   <count> inline image(s)

Research Sources:
- <source 1 title> (<url>)
- <source 2 title> (<url>)
...

Content Summary:
- Word count: <count>
- Subheadings: <list of h2 texts>
- Lists: <count> list(s)
- Primary keyword: <keyword>
```

Then ask: **"Ready to publish? (yes / no / edit)"**

- **yes**: Proceed to Step 6
- **no**: Stop
- **edit**: Ask what to change, regenerate the affected parts, and show the preview again

---

### Step 6: Publish

Call `POST {API_URL}/manage/blog` with the full post payload.

**Request body:**
```json
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "publishedAt": "YYYY-MM-DD",
  "readTime": "X min read",
  "category": "category-slug",
  "subcategory": "subcategory-slug-or-omit",
  "tags": ["tag-slug-1", "tag-slug-2"],
  "content": ["<h2>...</h2><p>...</p><img src='...' alt='...' />..."],
  "isPublished": true,
  "isFeatured": false,
  "coverImage": "https://... or null"
}
```

**Handle errors:**
- **409 (duplicate slug):** Append `-2` to the slug and retry once.
- **401:** API key invalid — inform the user and stop.
- **Other errors:** Show the error message and stop.

Extract the `slug` from the successful response for the next step.

---

### Step 7: Translations (Automatic)

**Translations happen automatically in the background** when a blog post is published or updated. The backend detects the new/changed content and translates to all 136 supported languages via Azure Cognitive Services Translator. You do NOT need to call the translate endpoint manually.

The LLM publishing flow is: create post → response returned immediately → translations happen in background.

If you need to force a re-translation (e.g., after fixing content), call:
```bash
curl -s -X POST "{API_URL}/manage/blog/{slug}/translate" \
  -H "Content-Type: application/json" \
  -H "X-Authorization: Bearer {API_KEY}" \
  -d '{"languages":["af","am","ar","as","az","ba","be","bg","bho","bn","bo","brx","bs","ca","cs","cy","da","de","doi","dsb","dv","el","es","et","eu","fa","fi","fil","fj","fo","fr","fr-CA","ga","gl","gom","gu","ha","he","hi","hne","hr","hsb","ht","hu","hy","id","ig","ikt","is","it","iu","iu-Latn","ja","ka","kk","km","kmr","kn","ko","ks","ku","ky","lb","ln","lo","lt","lug","lv","lzh","mai","mg","mi","mk","ml","mn-Cyrl","mn-Mong","mni","mr","ms","mt","mww","my","nb","ne","nl","nso","nya","or","otq","pa","pl","prs","ps","pt","pt-PT","ro","ru","run","rw","sd","si","sk","sl","sm","sn","so","sq","sr-Cyrl","sr-Latn","st","sv","sw","ta","te","th","ti","tk","tlh-Latn","tlh-Piqd","tn","to","tr","tt","ty","ug","uk","ur","uz","vi","xh","yo","yua","yue","zh-Hans","zh-Hant","zu"]}' --max-time 120
```

---

### Step 8: Summary

Print a final summary:

```
Blog Post Published & Translated
---

Title:        <title>
Slug:         <slug>
Status:       Published
Cover Image:  <yes/no>
Inline Images: <count>
Translations: 15 locales

API Endpoint: GET {API_URL}/blog/<slug>
```

---

## Important Notes

- All `curl` commands must include `-s` (silent) to suppress progress output.
- For POST/PUT requests, always include `-H "Content-Type: application/json"`.
- For authenticated requests, always include `-H "X-Authorization: Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7"` (NOT `Authorization` — SWA proxy strips it).
- For image uploads, use `-F "image=@/path/to/file"` (multipart form data, NOT JSON). No size limit.
- When sending JSON with `curl`, use `-d` with the JSON payload. Escape special characters properly.
- Never add "Co-Authored-By: Claude" to any commits.
- Clean up downloaded images from `/tmp/` after uploading.
