# SDGGold — Student Development Guide Gold

An original, lightweight, responsive learning application with a **Civilization-style, left-to-right progression tree**. Explore foundations, split into focused branches, and merge back into increasingly advanced understanding. Its workflow is inspired by the generic study pattern used in PDG GOLD: **Learn → Reinforce → Test**. No PDG GOLD content, visual assets, or copyrighted questions are included.

## Live site
GitHub Pages is deployed by [GitHub Actions](.github/workflows/deploy.yml) after an update to `main`, provided Pages is configured in Repository Settings → Pages → Source: **GitHub Actions**. Intended site: https://marcusdhaynes.github.io/SDGGold/

## Core mechanics
- Horizontal scrolling concept map. Tier 0 contains accessible foundations; increasing tiers move progressively toward mastery.
- Every concept has prerequisites; a concept with multiple parents unlocks **only after all parents are mastered**.
- Each concept has three sequential phases: (1) Learn using child-accessible explanations and familiar examples, (2) Reinforce with active recall and a revealed answer, (3) Test through a multiple-choice question.
- Correct test answers mark a concept mastered and immediately unlock descendants when all necessary dependencies are complete.
- Locked topics remain inspectable with a precise list of missing prerequisites.
- Responsive desktop/mobile design. Course and progress persist in localStorage; no server or login is required for the demonstration.
- Import custom JSON graph courses through upload or paste; export the current course and progress as JSON.
- Input validation checks unique IDs, content, missing dependencies, valid question answers, dependency ordering, and a maximum of 1,000 concepts. Directed tiers disallow circular paths.

## Course structure
```json
{
  "version": 1,
  "title": "My Course",
  "nodes": [
    {
      "id": "foundation",
      "tier": 0,
      "title": "An idea anyone can understand",
      "icon": "🌱",
      "prerequisites": [],
      "learn": "Explain simply, accurately, using common words.",
      "example": "A real-world example",
      "reinforce": {"question": "What is the main idea?", "answer": "The essential concept"},
      "test": {
        "question": "Which answer is correct?",
        "choices": ["Correct", "Incorrect"],
        "correct": 0,
        "explanation": "Explain why"
      }
    }
  ]
}
```

Use two or more IDs in `prerequisites` to create conceptual convergence; one ancestor can support multiple downstream branches to create a split. Preserve meaningful distinctions: avoid adding unnecessary branches or requiring every branch for unrelated topics.

## Safety and boundaries
This repository is a standalone prototype. It makes **no writes to Supabase** or other applications. The separate `app_sdggold` schema created for this app remains untouched by this client until secure connectivity and OAuth are configured. The existing shared Supabase schemas belonging to other projects are not altered.

## Remaining work
This is a functioning **web prototype**, not a finished native cross-platform app or full PDG GOLD feature clone. Features such as Google login, cloud collection and sharing, multi-format document parsing (PDF/DOCX/CSV), authoring assistance that automatically builds minimal prerequisite graphs, spaced repetition, adaptive exams, richer game modes, collaborative editing, offline sync conflict management, and desktop/mobile native packaging require further engineering. A static Pages site cannot securely store third-party API secrets. Google OAuth should be handled with the Supabase Auth configuration and dedicated callback URLs, and writes must obey the RLS isolation policies.

For academic content, do not present AI-generated foundations as verified without editorial and subject-matter review.
