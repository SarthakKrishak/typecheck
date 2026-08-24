# Security Policy — Typecheck

**No data leaves your browser.** Typecheck stores only in `localStorage` (`typing-settings-v7`, `typing-history-v2`, `typecraft_deck_v1`, `typecraft_race_rooms_v1`). No cookies, no backend, no analytics.

## Supported
- `main` branch — latest `1.0.0` — receives security fixes.

## Reporting
For sensitive issues (XSS via `customText`, `Race` link injection, `BroadcastChannel` spoofing):

- Email: `hello@typecheck.test` with `Subject: [SECURITY] …`
- Or GitHub **Security → Report a vulnerability** (private).

Please include `vite build` version, browser, and `localStorage` keys if relevant. Do **not** open a public issue for sensitive reports.

We aim to respond within 48h and patch within 7 days.

## Scope
- `src/lib/sound.ts` `fetch("/sounds/*.wav")` is local static only.
- `TypingArea` `fetch` for GitHub raw is opt-in (paste URL) — we sanitize via `text.slice(0,4000)`.

Thanks for helping keep typing private.
