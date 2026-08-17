# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

No code has been scaffolded yet — the repository currently contains only the project spec and design docs. There is no `package.json`, no build tooling, and no commands to run. Once the project is scaffolded (TypeScript + Vite, per the design doc below), update this file with the actual build/lint/test/dev commands.

## Source of truth

- [SPEC.md](SPEC.md) — project brief: goal, input/output, architectural constraints and their justifications, roadmap (v1/v2/v3), explicit out-of-scope items, expected README content.
- [docs/superpowers/specs/2026-08-17-generateur-images-responsive-design.md](docs/superpowers/specs/2026-08-17-generateur-images-responsive-design.md) — v1 technical design: stack decision and rationale, module architecture, data flow, error handling, test plan.

Read both before making architectural changes — SPEC.md defines *what and why*, the design doc defines *how*.

## Key constraints that shape any implementation decision

- **100% client-side, no backend.** Image conversion happens entirely via the Canvas API (`canvas.toBlob()`), because the project is hosted on GitHub Pages (static hosting only) and confidentiality (no image upload) is a deliberate selling point.
- **TypeScript + Vite, no UI framework.** Chosen specifically to demonstrate DOM/Canvas API fundamentals rather than framework usage — see the design doc's "Contexte de la décision de stack" for the full reasoning. Do not introduce React/Vue/Svelte without re-confirming this decision with the user first.
- **WebP encoding support is not guaranteed** by the spec (only PNG is mandatory for `canvas.toBlob()`). Runtime capability detection (`webpSupport.ts`) is required, with an explicit user-facing message on absence — never a silent failure.
- **The JPEG output is unconditional.** It is not an internal fallback for WebP encoding failure — it's the `<img>` fallback inside the generated `<picture>` element, for end users of *the developer's* site who lack WebP support. It must always be generated regardless of whether this tool's own WebP encoding succeeds. The 3 WebP variants (small/medium/large) are the ones that depend on `webpSupport.ts`.
- **The `<picture>` snippet is generated dynamically** from the filenames/widths actually produced — never a static/generic example, and the `sizes` attribute is never omitted (an omitted `sizes` silently defaults to `100vw`, which the project treats as bad practice to model).
- **Accessibility is explicitly out of scope** as a dedicated feature. Generated markup still includes `alt=""` because it's HTML-required, not because it's an accessibility feature — this distinction must stay honest in the README, not be spun as more than it is.

## Planned module architecture (from the design doc)

```
src/
├── main.ts                # entry point, UI orchestration
├── ui/                     # DOM orchestration only — no conversion logic
│   ├── dropzone.ts
│   ├── sizesSelector.ts
│   └── resultView.ts
└── core/                   # pure logic, framework-agnostic, independently testable
    ├── imageProcessor.ts   # Canvas API: resizing + toBlob (WebP/JPEG)
    ├── webpSupport.ts      # runtime WebP encoding capability detection
    └── snippetGenerator.ts # pure function: (filenames, widths, sizes choice) -> <picture> HTML
```

`core/` modules must stay free of DOM orchestration concerns beyond the `<canvas>` they create internally, so they remain unit-testable with Vitest in isolation from `ui/`.

## CI/CD

GitHub Actions is expected to run lint + build + tests, then deploy to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages` on every push to the default branch. No workflow file exists yet.
