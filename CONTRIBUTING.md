# Contributing to typecheck

Thanks for your interest in contributing. typecheck is MIT-licensed and 100% local — no backend, no tracking.

## Setup

```bash
git clone https://github.com/SarthakKrishak/Typecraft.git
cd Typecraft
npm install
npm run dev
```

## Before submitting a PR

```bash
npm run lint       # oxlint
npm run typecheck  # tsc --noEmit
npm run build      # tsc -b && vite build
```

All three must pass.

## Ground rules

- **No backend** — everything runs locally. No `fetch` to external APIs except Google Fonts and opt-in GitHub raw file fetch.
- **Design tokens** — use CSS custom properties from `src/index.css`. Don't hardcode colors.
- **A11y** — interactive elements need focus states. Use the `Tooltip` component instead of `title` attributes.
- **Performance** — avoid unnecessary re-renders. Use `React.memo` for list items.
- **No tracking** — no analytics, no telemetry, no phone-home.

## Code style

- Functional components with hooks
- Zustand stores with `persist` middleware
- CSS custom properties for theming (no inline hex values)
- `kbd` component for keyboard shortcuts

## Good first issues

- Add more code language keywords to `TypingArea.getTokenStyle`
- Add more quotes to `src/data/quotes.ts`
- Improve mobile responsiveness of the race mode
- Add more themes

## Questions

Open a [Discussion](https://github.com/SarthakKrishak/Typecraft/discussions) or reach out on X.
