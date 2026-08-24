# Contributing to Typecheck

Thanks for considering contributing — Typecheck is MIT, 100% local, no tracking.

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

## Ground Rules
- **No backend:** keep `localStorage` only (`typing-settings-v7`, `typing-history-v2`). No `fetch` to external APIs except `fonts.googleapis.com` and `fetch` for GitHub raw (opt-in).
- **Design tokens:** `Instrument Sans / Geist Mono`, `--bg #0A0A0B`, `--primary #5E6AD2`, `panel 10px` — see `src/index.css`.
- **A11y:** `kbd` for shortcuts, `aria-label="typing input"`, `focus-visible` required.
- **Performance:** `chunkSizeWarningLimit 800`, `manualChunks: vendor` already in `vite.config.ts`.

## Pull Request
1. Fork → branch `feat/your-feature`
2. `npm run lint` passes, `npm run build` passes
3. Describe **why** not just **what** — no forceful gamification.
4. Add to `README` features table if user-facing.

## Good First Issues
- More `code` language keywords in `TypingArea.getTokenStyle`
- Additional `QWERTY` finger heatmap languages
- `Race` assignment: support `.txt` upload

## Code of Conduct
See `CODE_OF_CONDUCT.md`. Be kind, no harassment.

## Security
See `SECURITY.md` — email `hello@typecheck.test` for sensitive reports, not public issues.
