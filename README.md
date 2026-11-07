# SDGGold — Student Development Guide Gold

A beautiful, dependency-accurate, gold-fill mastery learning application with a Civilization-inspired horizontal progression tree and five study checkpoints per concept.

**Live:** https://marcusdhaynes.github.io/SDGGold/

## Design principle: ChatGPT stays OUTSIDE the app

The application performs **NO AI curriculum processing**. Your course content is authored externally in ChatGPT (or another AI) with the exact master instruction template and canonical examples below.

- **[MASTER CHATGPT COURSE TEMPLATE](CHATGPT_COURSE_TEMPLATE.md)** — thorough external instructions for reviewing sources, choosing minimal tracks, building fundamental-to-mastery dependencies, writing complete five-phase learning units and self-auditing.
- **[Complete valid single-file course example](EXAMPLE_COMPLETE_COURSE.json)** — a ten-concept original course, two fundamental roots, three justified tracks, genuine splits and merges, all five phases and one final mastery milestone.
- **Full valid multipart JSONL example:** [B001](EXAMPLE_BATCH_B001.jsonl) · [B002](EXAMPLE_BATCH_B002.jsonl) · [B003](EXAMPLE_BATCH_B003.jsonl). Import all three files at once or sequentially.
- **[Import Studio operating guide](IMPORT_STUDIO_GUIDE.md)** — formatting, size limits, validation, Google sign-in, cloud saving, versioning, public sharing and setup.

### Templates & Examples inside Settings

Select the **⚙ Settings** icon in the app header (also accessible from **Tree Options → Settings · Templates & Examples**). The built-in reader contains:

- The complete external ChatGPT master prompt.
- The fully authored and validated single-file JSON example course.
- All three actual JSONL batches illustrating large-course imports.
- The formal machine-readable package schema.

Choose **Copy Everything** to copy all six full files with clear `BEGIN FILE`/`END FILE` delimiters in one clipboard action. Each file also has **Open**, **Copy**, and **Download** controls, and can be read within the app without leaving the page. **Download Complete Set** saves all six as one text file. The references are included in SDGGold's offline application cache for use after the app has been installed and cached.

### How to use

1. Copy/download the master ChatGPT template and the complete example. Give both to ChatGPT outside SDGGold, along with all course learning material you want analyzed.
2. ChatGPT does ALL of the understanding: precise atomic concepts, unique source coverage, intuitive fundamentals, fewest defensible tracks, hierarchy, every justified split/merge, complete five-phase lessons/questions, and single integrative mastery.
3. ChatGPT produces a finished, thoroughly checked sdggold-course-v2 JSON package (or multiple numbered JSONL batches for big courses).
4. Open SDGGold → **Import Studio**. Upload the JSON or all batches. The deterministic validator checks source IDs, duplicate concepts, five complete learning phases, quiz answers, prerequisite necessity rationales, track memberships, graph cycles, every path's connection to ONE final milestone, and formal coverage checklists.
5. Use the course in the live progression tree immediately. **No AI calls** occur.
6. Optionally sign into Google and save/update the validated package in the isolated SDGGold Supabase library. Each cloud update creates a new version. Browse public courses or load your private courses and historical versions.

## Five mastery checkpoints

- **Learn:** fully written explanation with an example.
- **Recall:** active recall flashcard with answer.
- **Practice:** a meaningful application question.
- **Test:** a distinct comprehension/reasoning question.
- **Mastery Review:** a distinct transfer/integration question.

A node becomes gold after all five checkpoints. A downstream node remains locked until **every immediate predecessor** is gold. Roots can be multiple when the material genuinely warrants distinct foundations. All paths terminate at one authentic mastery milestone.

## Data model and safety

Validated packages use schema **sdggold-course-v2** and contain all teaching content, metadata, source inventories, per-source coverage, justified track definitions, learning outcomes and dependency rationales.

The importer is deterministic; it cannot verify whether a source is factually true, whether an AI's educational judgment is truly optimal, or whether a copyright owner has authorized public sharing. It raises review warnings and requires explicit owner confirmation before publication.

Cloud persistence is restricted to:
- The original shared Supabase project, **only within app_sdggold**.
- Dedicated tables **app_sdggold.course_documents** and **app_sdggold.course_revisions**, with Row Level Security and no anonymous direct table privileges.
- A dedicated **sdggold-courses** Edge Function that permits public read-only collection browsing, private owner reads, authenticated owner writes, optimistic version checks and immutable revision history.
- The former sdggold-architect endpoint has been retired and returns 410. It makes **no AI calls**. No user API key is required for SDGGold learning/import.

No other app's GitHub repository, Supabase tables/schemas, or Edge Functions were edited. The existing app_sdggold.ai_usage table is now unused and remains isolated.

## Installation and deployment

Source is dependency-light vanilla HTML, CSS and JavaScript, with optional Google Fonts and Supabase auth downloaded only as needed. A service worker caches the core UI for offline study. GitHub Actions checks JavaScript and course-graph tests, then deploys GitHub Pages from the main branch.

### Current limits

One displayed course volume supports **up to 1,000 concept nodes** including the final milestone. For larger corpora, split into course volumes, each with a separate course_id and complete local mastery. Automatic cross-volume mastery prerequisite enforcement is not yet supported; do not claim a single global graph across volumes.

The JSONL importer accepts many numbered files and preserves partial inputs in browser IndexedDB until final assembly. Google login depends on Supabase Auth Google provider configuration and an allowed GitHub Pages redirect. Cloud operations cannot be confirmed to work for a real user until OAuth is configured and tested. Public catalog reading requires no login.
