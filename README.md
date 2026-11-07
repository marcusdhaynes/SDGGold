# SDGGold — Student Development Guide Gold

**Live web app:** https://marcusdhaynes.github.io/SDGGold/

A standalone, lightweight, responsive learning app inspired by the flow of Civilization technology trees and multi-stage mastery buttons. This project is a **functional recreation of the user-approved custom interface**, not a copy of PDG GOLD's proprietary artwork, commercial question bank, or code.

## Visual design

The learning canvas deliberately follows the approved design concept:
- Deep navy header and side navigation, parchment-toned map canvas, gold architectural detailing and academic line art.
- Horizontal, scrolling, split-and-merge dependency tree with fully outlined capsule progression nodes.
- Circular concept icons and five mastery indicators inside each capsule.
- **Gold:** all five checkpoints mastered. **Cyan:** in-progress mastery. **Blue:** ready to start. **Gray:** locked.
- Clear gold/blue/slate connectors, zoom and fit-to-screen controls, search, subject/stage/type filters, and status toggles.
- Bottom progress rail displaying total mastered, current focus, and next prerequisite milestone.
- Phone, tablet, and desktop responsive layout, standalone PWA manifest, and offline cache.

## Critical no-skipping guarantee

Every concept has its own explicit `prerequisites` array. Unlocking requires **all** of them to have five completed mastery checkpoints. An ancestor cannot be bypassed by completing a different branch. The final mastery node is reachable only through all required branches. When resetting a mastered concept, the app automatically resets **all its descendants** to prevent invalid progress.

Imported courses are validated: unique IDs, earlier-tier dependencies, quizzes with valid answers, no broken references, no detached branch, and exactly one terminal mastery node.

## Five progressive mastery checkpoints

1. **Learn:** read an accurate, simple explanation with a familiar example.
2. **Recall:** answer an active-recall flashcard, then reveal the answer.
3. **Practice:** answer a practice item correctly.
4. **Test:** pass the concept question.
5. **Mastery Review:** pass a final review question; the entire pill turns gold.

Failed practice/test attempts never advance a checkpoint. Learning, mastery, and filters are stored locally. The included **demonstration course starts with clearly documented sample progress** to show the intended visual states; reset it in Tree Options for a blank journey.

## Authoring and data

Use **Tree Options → Import Course** to choose a JSON file or paste text. The import format accepts `title`, `nodes`, and optional `subtitle`. A node has:
```json
{
  "id": "foundation",
  "tier": 0,
  "lane": 2.5,
  "title": "Fundamental Concept",
  "icon": "◉",
  "kind": "concept",
  "subject": "General",
  "prerequisites": [],
  "learn": "Use plain language and familiar examples.",
  "example": "A child-understandable example.",
  "reinforce": {
    "question": "Explain the idea.",
    "answer": "The core understanding."
  },
  "practice": {
    "question": "Choose the best description.",
    "choices": ["Correct", "Incorrect"],
    "correct": 0,
    "explanation": "Why the answer is correct."
  },
  "test": {
    "question": "Test understanding.",
    "choices": ["Correct", "Incorrect"],
    "correct": 0,
    "explanation": "Reasoning"
  },
  "review": {
    "question": "Final mastery check.",
    "choices": ["Correct", "Incorrect"],
    "correct": 0,
    "explanation": "Reasoning"
  }
}
```

`tier` is the horizontal level; `lane` is an optional vertical alignment for editorially curated courses. Add a concept ID to multiple downstream prerequisite arrays to **split**; use multiple prerequisite IDs on one downstream concept to **merge**. If `practice` or `review` is omitted, the app uses `test` as a fallback; authored distinct questions are strongly preferred.

**Export** creates a JSON copy of your course and progress. Multi-format PDF/DOCX/image ingestion, automated concept decomposition, native installers, Google OAuth, and cloud sharing are **not implemented by this UI redesign**.

## Code architecture

- `index.html`: responsive semantic application shell and decorative SVG line art
- `styles.css`: visual system; gold/blue/gray capsule states and responsive styles
- `app.js`: dependency-graph validation, unlock logic, study engine, filters, import/export, local persistence
- `manifest.webmanifest`, `sw.js`, `icon.svg`: installable and offline-capable web app
- `tests/graph.test.cjs`: validation of convergence, invalid dependencies, and no skipping
- `.github/workflows/deploy.yml`: automated validation and GitHub Pages deployment on `main`

The source is dependency-free JavaScript except for the optional Google Fonts stylesheet. Core functionality remains available with system fonts offline.

## Deployment

In repository Settings → Pages select **GitHub Actions** as the publishing source. Push to `main`, check [Actions](https://github.com/marcusdhaynes/SDGGold/actions), and visit https://marcusdhaynes.github.io/SDGGold/ after the deploy job succeeds.

## Isolation and remaining integration work

This design update writes **only to this repository**. It does not connect to Supabase or modify any other applications or their schemas. A dedicated `app_sdggold` schema was created in the existing shared database earlier, but the current app does not write to it. Do not insert a Supabase secret key into public frontend files. Google login and cloud collection require explicitly scoped Auth/RLS integration and configuration.

The app is an original educational interface and study workflow, not a pixel-identical rendering of an image or an official Air Force/McMillan product.
