# typecheck

<p align="center">
  <strong>Type faster. Race anyone.</strong><br/>
  The open-source typing test that lives in your browser.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/></a>
  <a href="https://github.com/SarthakKrishak/Typecraft/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React 19"/></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-8-646CFF.svg" alt="Vite 8"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6.svg" alt="TypeScript strict"/></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-4-38BDF8.svg" alt="Tailwind 4"/></a>
</p>

---

**typecheck** is a free, open-source typing test. No login, no ads, no tracking — everything runs locally in your browser and your data never leaves your device.

## Why typecheck?

Most typing tests either lock features behind a paywall, flood you with ads, or require an account. typecheck does none of that. It's a single-page app that works offline, respects your privacy, and gives you detailed analytics without asking for anything in return.

## Features

### Core
- **5 test modes** — Time (15/30/60/120s), Words (10/25/50/100), Quote, Zen, Custom text
- **Real WPM** — net WPM, raw WPM, accuracy, consistency, burst — all calculated locally
- **Smart backspace** — Ctrl+Backspace clears a word, Backspace at word start edits the previous word
- **Caps Lock detection** — live warning banner so you never mistype a full word

### Compete
- **Race mode** — public rooms (anyone can join) and private rooms (passcode-protected), with owner-set player limits
- **Real-time sync** — BroadcastChannel-based, works across tabs with zero server
- **Daily challenge** — same seeded words for everyone, local streak tracking, shareable results
- **Ghost pace** — race against your own best run, replayed keystroke-for-keystroke

### Improve
- **Weak-key coach** — keyboard heatmap showing your error hotspots, with targeted drills
- **Smart sentences** — auto-generates practice sentences packed with your weak bigrams
- **Adaptive difficulty** — auto-adjusts test length and complexity based on your accuracy
- **Vocabulary deck** — save weak words, auto-inject 30% into future tests
- **Replay theater** — scrub through any past test keystroke-by-keystroke with a timeline

### Feel
- **Mechanical sound** — pre-warmed WebAudio thock on every key, chime on perfect words
- **FUT season card** — FIFA-style player card with your stats, downloadable as PNG
- **Hand guide** — SVG hands showing which finger to use for the next key
- **Rhythm mode** — 90 BPM metronome with beat pulse indicator
- **6 themes** — Graphite (default), Ink, Paper, Midnight, Forest, Rose

### Privacy & Access
- **PWA** — installable, works fully offline
- **Accessibility** — dyslexia-friendly font, high-contrast mode, focus mode, breathing bar
- **Streamer overlay** — transparent `/overlay` route for OBS
- **No account** — no login, no email, no cookies, no server

## Quick Start

```bash
git clone https://github.com/SarthakKrishak/Typecraft.git
cd Typecraft
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start typing. That's it — no configuration, no signup.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | TypeScript type-check only |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> | Restart test |
| <kbd>Tab</kbd> + <kbd>Enter</kbd> | Restart (alternate) |
| <kbd>Ctrl/⌘</kbd> + <kbd>Backspace</kbd> | Clear current word |
| <kbd>Backspace</kbd> (at word start) | Edit previous word |
| <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> | Toggle sound |
| <kbd>Ctrl/⌘</kbd> + <kbd>J</kbd> | Cycle theme |
| <kbd>Ctrl/⌘</kbd> + <kbd>R</kbd> | Go to Race |
| <kbd>Ctrl/⌘</kbd> + <kbd>E</kbd> | Go to Analytics |
| <kbd>Ctrl/⌘</kbd> + <kbd>/</kbd> | Shortcuts panel |
| <kbd>Esc</kbd> | Close dropdown / unfocus |

## How Calculations Work

| Metric | Formula |
|---|---|
| **WPM** | `(correct characters ÷ 5) ÷ (time in minutes)` |
| **Raw WPM** | `(all typed characters ÷ 5) ÷ (time in minutes)` |
| **Accuracy** | `correct ÷ (correct + incorrect + extra + missed) × 100` |
| **Consistency** | `(1 − std-dev ÷ mean) × 100` of per-second WPM |
| **Burst** | `max(single-second WPM)` |

All calculations run locally. A "How we calculate" panel in the Analytics page explains each formula in plain English.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + TypeScript 6 (strict) |
| Build | Vite 8 + PWA plugin (Workbox) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| State | Zustand with localStorage persistence |
| Charts | Recharts |
| Sound | Web Audio API (pre-warmed AudioContext) |
| Fonts | Instrument Sans, Geist Mono, Lexend |

## Project Structure

```
src/
├── components/       # 18 React components
│   ├── TypingArea    # Core typing engine + caret + ghost
│   ├── Race          # Multiplayer race rooms
│   ├── Result        # Post-test results + chart
│   ├── Wrapped       # FIFA-style FUT card (canvas → PNG)
│   ├── ReplayTheater # Keystroke-level playback
│   ├── KeyboardDiagram # Error heatmap on QWERTY layout
│   ├── WeakKeyCoach  # Targeted practice suggestions
│   ├── CoachInsights # Rule-based natural language tips
│   ├── DailyChallenge# Seeded daily words + streaks
│   └── ...
├── engine/           # Pure calculation functions (WPM, accuracy, consistency)
├── store/            # Zustand stores (settings, history, deck, daily)
├── data/             # Word lists and quotes
└── lib/              # Sound engine (WebAudio)
```

## Privacy

Typecheck stores everything in your browser's `localStorage`. There are no cookies, no server calls, no analytics, no account system. Your typing data is yours.

## Contributing

PRs are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing`)
3. Run `npm run lint && npm run build`
4. Commit and push
5. Open a Pull Request

## License

[MIT](LICENSE) © [Sarthak Krishak](https://github.com/SarthakKrishak)

---

<p align="center">
  <a href="https://github.com/SarthakKrishak/Typecraft">⭐ Star this repo</a> if you find it useful
</p>
