# typecheck

<p align="center">
  <strong>Type faster. Race anyone.</strong><br/>
  The open-source typing test that lives in your browser.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/></a>
  <a href="https://github.com/SarthakKrishak/Typecraft"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React 19"/></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-8-646CFF.svg" alt="Vite 8"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6.svg" alt="TypeScript strict"/></a>
</p>

---

Typecheck is a minimalist, open-source typing test. No login, no ads, no tracking — everything runs locally in your browser and your data never leaves your device.

## Features

- **5 test modes** — Time (15/30/60/120s), Words (10/25/50/100), Quote, Zen, Custom
- **Race mode** — public and private rooms with passcodes, real-time cross-tab sync
- **Analytics** — WPM trend, per-second speed chart, keyboard error heatmap, finger-level breakdown
- **Weak-key coach** — identifies your weakest keys and bigrams, generates targeted drills
- **Smart sentences** — auto-generates practice sentences packed with your weak patterns
- **Replay theater** — scrub through any past test keystroke-by-keystroke
- **Daily challenge** — same seeded words worldwide, local streak tracking
- **FUT card** — FIFA-style season card with your stats, downloadable as PNG
- **Mechanical sound** — pre-warmed WebAudio, key thocks and word chimes, individually toggleable
- **Ghost pace** — race against your best run, keystroke-for-keystroke
- **Adaptive difficulty** — auto-adjusts length and complexity based on accuracy
- **Accessibility** — dyslexia font, high-contrast mode, focus mode, breathing bar
- **Vocabulary deck** — save weak words, auto-inject 30% into future tests
- **PWA** — installable, works offline
- **5 themes** — Graphite (default), Ink, Paper, Midnight, Forest, Rose

## Quick Start

```bash
git clone https://github.com/SarthakKrishak/Typecraft.git
cd Typecraft
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start typing.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | TypeScript only (no emit) |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + Enter` | Restart test |
| `Tab + Enter` | Restart (alternate) |
| `Ctrl/⌘ + Backspace` | Clear current word |
| `Backspace` (at word start) | Edit previous word |
| `Ctrl/⌘ + S` | Toggle sound |
| `Ctrl/⌘ + J` | Cycle theme |
| `Ctrl/⌘ + R` | Go to Race |
| `Ctrl/⌘ + E` | Go to Analytics |
| `Ctrl/⌘ + /` | Shortcuts panel |
| `Esc` | Close / unfocus |

## Tech Stack

- **React 19** + **TypeScript 6** (strict)
- **Vite 8** with PWA plugin (Workbox)
- **Tailwind CSS 4** + CSS custom properties
- **Zustand** with localStorage persistence
- **Recharts** for analytics graphs
- **Web Audio API** for mechanical keyboard sounds

## How Calculations Work

| Metric | Formula |
|---|---|
| **WPM** | `(correct characters ÷ 5) ÷ (time ÷ 60)` |
| **Raw WPM** | `(all typed characters ÷ 5) ÷ (time ÷ 60)` |
| **Accuracy** | `correct ÷ (correct + incorrect + extra + missed) × 100` |
| **Consistency** | `(1 − std-dev ÷ mean) × 100` of per-second WPM |
| **Burst** | `max(single-second WPM)` |

All calculations run locally. No data is sent anywhere.

## Privacy

Typecheck stores everything in your browser's `localStorage`. There are no cookies, no server calls, no analytics, no account system. Close the tab and your data stays. Clear your browser data and it's gone.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome — please run `npm run lint` and `npm run build` before submitting.

## Security

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © [Sarthak Krishak](https://github.com/SarthakKrishak)
