# SDGGold AI Curriculum Architect — Large-Course Guide

## Quick start

Go to https://marcusdhaynes.github.io/SDGGold/ and choose **AI Architect**.

### Method A: First preprocess in ChatGPT or another AI

1. Download PREPROCESSING_TEMPLATE.md from the AI Architect screen.
2. Provide that entire instruction template to ChatGPT, then provide your books, notes, files, lectures, and other available sources.
3. Ask it to create strict JSONL batches: B001, B002, etc. Save each batch as a .jsonl file. It must keep source IDs S001, concept IDs C0001, and passage IDs stable between batches.
4. Import **every batch** into the same SDGGold Architect project using drag-and-drop, multi-file selection, or pasted JSONL.
5. Sign in with Google and choose Generate with AI to perform secondary semantic planning, deduplication, curriculum authoring, and source audit.
6. Review the complete report, especially missing sources, unverified inferences, prerequisite debates, contradictions, false quiz distractors and licensing restrictions.
7. Select Use in Learning Tree. This installs the generated course locally; it does not publish the course to the public.

### Method B: Import raw materials directly

Upload individual files, multiple files or a folder, paste text, or add a CORS-readable HTTP(S) page.

Direct extraction formats:
- Plain text, Markdown, HTML, XML, CSV/TSV, JSON, JSONL/NDJSON, subtitles, RTF, TeX, YAML, logs.
- PDFs with a text layer; unreadable scanned pages are rendered for queued AI image inspection when possible.
- DOCX, ODT, PPTX (slide text), XLSX (cell text), EPUB, and ZIPs of supported text resources.
- PNG/JPEG/WebP images within the small-image inspection limit, analyzed only after authenticated AI processing begins.

External imports may fail if the browser is offline, a document is malformed, or an optional parser cannot load. Files that cannot be read are flagged as gaps rather than silently ignored. Audio/video currently require a transcript or external AI preprocessing. Diagrams, tables and complex formulas must still be checked, even when a PDF's text layer was extracted.

Pinned on-demand browser libraries: PDF.js 4.10.38, JSZip 3.10.1, and supabase-js 2.57.0.

## What the pipeline actually does

1. Inspect queued images/scanned PDF pages and record OCR/vision uncertainty.
2. Extract atomic source-grounded concept candidates, each with a passage citation.
3. Deduplicate equivalent candidates and infer only justified prerequisite suggestions.
4. Ask an AI planner to propose minimally necessary prerequisite edges, meaningful branches and conceptual merges, without treating chapter groupings as learning dependencies.
5. Reconcile overlapping windows of large source batches and flag conceptual conflicts.
6. Deterministically eliminate cycles, check references, remove redundant transitive links, assign horizontal stages and generate a final synthesis milestone.
7. Author Learn, Recall, Practice, Test and Mastery Review with source-based lessons and distinct questions.
8. Produce an explicit report: missing citations, unprocessed passages, uncertain prerequisites, inferred foundations, malformed inputs, unsupported claims and authoring gaps.

Every unit of work is checkpointed locally to IndexedDB. An interrupted job resumes from the saved stage/index, not from zero. The browser must remain open while requests are actively processed; this is not a background cloud queue. Pause takes effect after the current model call finishes.

## Scale, limits, and honesty

- Passages are stored separately in IndexedDB rather than in the small app progress record.
- Text is split into ~6,500-character chunks. AI extracts one chunk at a time, plans up to 32 concepts per call, and authors up to two at a time.
- Up to 200 MB per individual source; up to 40 million archive characters per ZIP import. Text URLs are limited to 6 million characters.
- A single interactive mastery tree currently supports up to 1,000 nodes including the final milestone. Larger corpora need multiple course volumes; automatic federation of unlimited volumes is not implemented yet.
- The backend enforces 300 AI requests per user per UTC day by default (server configurable). A large course can require many paid calls over more than one day.
- The coverage percentage is **passage citation linkage**, not proof that every fact was identified or a concept was interpreted correctly.
- AI cannot guarantee perfect factual understanding or pedagogical dependencies. Human/source verification is required before the result should be published as authoritative learning material.

## Configure the dedicated AI service

The existing shared Supabase project is tbrqqjrzknhdnwcpkqro. The unique function sdggold-architect is deployed at:

https://tbrqqjrzknhdnwcpkqro.supabase.co/functions/v1/sdggold-architect

The function has JWT enforcement enabled, explicitly validates the caller as a signed-in user, and uses only the private app_sdggold.ai_usage database table for metering.

Required administrator setup:
- In Supabase Dashboard → Edge Functions → Secrets, set OPENAI_API_KEY to a real OpenAI API key. Never put it into a public GitHub repository, JavaScript, an HTML file, or a URL.
- Optional secret OPENAI_MODEL chooses the AI model, default gpt-5.5. Optional SDGGOLD_DAILY_AI_CALLS changes the daily budget (25 to 2,000).
- In Supabase Authentication → Providers, enable Google. Configure the Google OAuth client redirect URI:
  https://tbrqqjrzknhdnwcpkqro.supabase.co/auth/v1/callback
- In Supabase Authentication → URL Configuration, add the allowed app redirect URL:
  https://marcusdhaynes.github.io/SDGGold/
- The browser uses a publishable Supabase key only. The API secret is used server-side and never displayed to clients.

Until that configuration is complete, AI generation cannot actually run. You can still import preprocessing packets and produce an explicitly labeled **local draft** with basic questions, then export it or inspect its gaps.

## Privacy and isolation

Only the SDGGold GitHub repository, the dedicated app_sdggold schema and the unique sdggold-architect Edge Function are used by this implementation. None of the other app repositories, Supabase schemas or Edge Functions were modified.

Imported source passages live locally in the browser until an authenticated user expressly clicks Generate with AI. At that point, the selected source chunks are sent to the configured AI provider for extraction/authoring. Courses are not publicly published as a side effect of importing or generating them.

## Testing

GitHub Actions runs JavaScript syntax checks, a dependency-graph validator suite, large-chunking tests, malformed packet checks, and mock AI orchestration/resume tests. Mock tests do not charge model API usage and do not establish live Google OAuth, API billing, OCR accuracy, source truth, or student learning outcomes. A real authenticated end-to-end test is required after secrets and OAuth are configured.
