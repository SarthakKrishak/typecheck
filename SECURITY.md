# Security Policy

typecheck runs entirely in your browser. There is no server, no database, no API to attack. Your typing data never leaves your device.

## Storage

All data is stored in `localStorage`:

| Key | Contents |
|---|---|
| `typing-settings-v9` | Theme, caret, sound, mode preferences |
| `typing-history-v2` | Test results (max 200) |
| `typecraft_deck_v1` | Vocabulary deck words |
| `typecraft_race_rooms_v1` | Race room configs (max 24) |
| `typecraft_daily_v1` | Daily challenge streak |
| `typecraft_card_name` | Name on FUT card |

Clearing browser data removes everything permanently.

## Reporting

For sensitive issues, email [security@typecheck.dev] or use [GitHub's private vulnerability reporting](https://github.com/SarthakKrishak/Typecraft/security/advisories/new). Do **not** open a public issue.

We aim to respond within 48 hours.
