# SDGGold Import Studio — Operator's Guide

## Purpose

SDGGold uses **external** ChatGPT or another AI to do all semantic curriculum work. The app only validates and stores a **fully authored** course package, then displays it in the learning tree. There is no hidden AI service, paid AI request, source summarizer or inference engine inside the app.

LIVE APP: https://marcusdhaynes.github.io/SDGGold/
EXTERNAL CHATGPT TEMPLATE: CHATGPT_COURSE_TEMPLATE.md
COMPLETE EXACT EXAMPLE: EXAMPLE_COMPLETE_COURSE.json
MULTIPART EXACT EXAMPLE: EXAMPLE_BATCH_B001.jsonl, EXAMPLE_BATCH_B002.jsonl and EXAMPLE_BATCH_B003.jsonl

## End-user workflow

1. Download the master template AND complete example from Import Studio.
2. In a separate ChatGPT conversation, attach both files and your raw learning material (documents, books, notes, slides, transcripts, images, etc.).
3. Ask ChatGPT to follow the master template. It must inspect what is available, identify every distinct teachable concept and exception, find the child-accessible foundations, determine the fewest justifiable tracks, connect all necessary prerequisites, write five complete phases for every node, and converge on one real mastery task.
4. ChatGPT must validate its JSON against the attached complete example and run a JSON parser and deterministic validator if available. It should explicitly say when it could not run actual code and identify source gaps.
5. ChatGPT delivers either ONE valid complete JSON package or ALL numbered JSONL batch files. For multipart output, do not upload an incomplete batch collection expecting the app to write missing lessons.
6. Open SDGGold → Import Studio; drop or select final files. It accepts .json, .jsonl and .ndjson. Paste is also supported.
7. Read the deterministic validation report. Invalid IDs, quizzes, references, dependency rationales, track definitions and graph endpoints appear as actionable errors. Fix them in ChatGPT or in the editable JSON box; the app will not use AI to fix them.
8. Choose **Use in Learning Tree**. The complete progress tree is immediately usable locally. Completing Learn, Recall, Practice, Test and Mastery Review turns a node gold and unlocks downstream nodes ONLY when ALL incoming prerequisites are gold.
9. To store and edit later, sign in using Google, choose private/unlisted/public and **Save / Update in Supabase**. Editing a locally loaded course and saving again creates another cloud revision. Cloud conflicts are rejected rather than silently replacing someone else's update.
10. Browse the public online collection anonymously or sign in and open **My Courses**. Owner-only Revision History lets you load an older snapshot for review or re-save it as a new revision.

## Complete JSON package

The canonical sdggold-course-v2 JSON object contains:
- schema — exact literal sdggold-course-v2
- course — stable ID, revision, title, subtitle, description, language, declared mastery ID and measurable outcomes
- tracks — uniquely justified paths with title, purpose and distinctness
- sources — original sources with exact locators and honest publishing-rights status
- coverage — one ledger per source of inspected ranges and missing ranges, status complete/partial
- quality — a twelve-point self-audit checklist with truthfully marked passed flags and unresolved questions
- nodes — ALL fully written concepts, each with id, tier, track_ids, prerequisites, prerequisite_rationales, learn, example, reinforce, practice, test, review, outcome_ids, source_refs and uncertainty

This is deterministic input. No text-to-JSON conversion is performed inside SDGGold.

## Large JSONL batches

Use the canonical three-file example to see what REAL valid numbered batches look like. The first course_manifest record includes a package with course, tracks, sources, coverage and quality metadata (without nodes). Each node record contains the ENTIRE lesson and five-phase unit. The final file ends with course_end, complete:true and accurate expected_nodes / expected_batches / expected_node_ids. The app rejects missing finals, duplicate node IDs, mismatched course/revision identity and incomplete counts.

Numbered JSONL files may be uploaded simultaneously or added sequentially; incomplete pending inputs remain in the browser's local IndexedDB for later completion. A single file can be up to 25 MB, while the application graph is designed for 2–1,000 complete nodes per course volume. Split a larger program into coherent volumes with unique course IDs; cross-volume prerequisite enforcement is not implemented.

Do not ask the app to turn raw images, PDFs, videos, or transcripts into lessons. Give them to the EXTERNAL ChatGPT session first.

## Formal validation versus semantic review

The non-AI validator can check graph ordering, references, multiple parents, one final mastery, disconnected ideas, duplicate IDs, missing phases, bad quiz answer indexes, repeated quiz questions, source-coverage ledger shape, unexplained track definitions and transitive redundant connections.

The validator **cannot prove** that a fact in a source is true, that the AI has actually read every page it claims to have read, that its prerequisite choices are pedagogically perfect, or that material is legally shareable. Those judgments depend on actual source verification and human review. Complete coverage is a statement by the external preprocessing process, not independent proof.

When any material is missing, mark coverage.partial. The app permits private study drafts but its server rejects publishing a course with incomplete declared coverage or missing rights declarations.

## Supabase Google OAuth — one-time account configuration

The app's project is tbrqqjrzknhdnwcpkqro and the dedicated library function is sdggold-courses. The function is NOT an AI provider and needs no OpenAI API key.

1. Enable Google under Supabase Dashboard → Authentication → Providers.
2. In your Google Cloud OAuth client, authorize the Supabase callback URL:
   https://tbrqqjrzknhdnwcpkqro.supabase.co/auth/v1/callback
3. Under Supabase → Authentication → URL Configuration, allow the app redirect:
   https://marcusdhaynes.github.io/SDGGold/
4. Return to SDGGold → Import Studio → Sign In With Google.
5. Save your valid course as Private. Confirm it appears in My Courses and that another signed-in user cannot change it. Change visibility only after source rights and content review.

The web page contains ONLY a public Supabase publishable key. No server keys are checked into GitHub.

## Isolated cloud data

The two new tables are within app_sdggold:
- course_documents: owner UUID, stable course key, title, visibility, version, JSON package and timestamps.
- course_revisions: immutable full JSON package snapshots for each server version.

The dedicated Edge Function gives everyone public read-only course listings and public/unlisted course downloads, but requires signed-in ownership for saving, updating, revision access, and deleting. Version checks protect against overwriting a newer course. Private packages are not returned to other users.

No other app schema or GitHub repository is used. The old in-app sdggold-architect function was retired (HTTP 410) and makes no model calls.

## Publishing considerations

A public or unlisted course must declare complete source coverage, no missing source ranges, rights values of original, licensed or public_domain for every source, a passed external preflight checklist and zero open questions. The owner must explicitly confirm review and sharing rights. No application can guarantee that a supplied rights declaration is genuine; owners must ensure accuracy.

## Restore and offline study

Imported packages and pending batch inputs are cached in local IndexedDB; the installed learning course and mastery progress are saved in browser storage. Do not clear browser storage before exporting or cloud-saving important data. Service-worker offline mode supports already cached study pages, not remote cloud interactions. The cloud library requires a working Internet connection and (for private owner operations) valid Google login.

## Support and diagnostics

Open GitHub Actions: https://github.com/marcusdhaynes/SDGGold/actions

The workflow checks JavaScript syntax, the full canonical example, published JSONL batch set, package validation rules, graph non-skipping properties, and a synthetic 1,000-node course. It cannot establish that external ChatGPT's source interpretations are correct. If Google sign-in fails, confirm the provider and redirect setup rather than adding any secret to the public repository.
