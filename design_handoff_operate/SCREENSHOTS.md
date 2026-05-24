# Screenshots

The `screenshots/` folder contains 32 PNG captures of the hi-fi prototype — every module
in both themes plus six interaction-state captures. Use these as visual reference when
implementing.

## Modules — light

| # | File | Module |
|---|---|---|
| 01 | `01-overview-light.png`   | Overview · greeting hero |
| 02 | `02-reviews-light.png`    | Reviews · list + detail |
| 03 | `03-scheduling-light.png` | Scheduling · week grid |
| 04 | `04-attendance-light.png` | Attendance · heatmap |
| 05 | `05-payments-light.png`   | Payments · refined table |
| 06 | `06-animals-light.png`    | Animals · grid view |
| 07 | `07-documents-light.png`  | Documents · filterable list |
| 08 | `08-accounting-light.png` | Accounting · smart table with sparkline headers |
| 09 | `09-reports-light.png`    | Reports · Operations tab |
| 10 | `10-contacts-light.png`   | Contacts · list |
| 11 | `11-wiki-light.png`       | Wiki · two-pane reader |
| 12 | `12-brand-light.png`      | Brand · system reference |
| 13 | `13-admin-light.png`      | Admin · General tab |

## Modules — dark

| # | File | Module |
|---|---|---|
| 14 | `14-overview-dark.png`   | Overview |
| 15 | `15-reviews-dark.png`    | Reviews |
| 16 | `16-scheduling-dark.png` | Scheduling |
| 17 | `17-attendance-dark.png` | Attendance |
| 18 | `18-payments-dark.png`   | Payments |
| 19 | `19-animals-dark.png`    | Animals |
| 20 | `20-documents-dark.png`  | Documents |
| 21 | `21-accounting-dark.png` | Accounting |
| 22 | `22-reports-dark.png`    | Reports |
| 23 | `23-contacts-dark.png`   | Contacts |
| 24 | `24-wiki-dark.png`       | Wiki |
| 25 | `25-brand-dark.png`      | Brand |
| 26 | `26-admin-dark.png`      | Admin |

## Interaction states

| # | File | What it shows |
|---|---|---|
| 27 | `27-accounting-smart-table.png` | Sparkline column headers · daily rows with mono numerals · the layout to nail first |
| 28 | `28-accounting-focus-day.png` | Day strip + net hero + by-shop list — the second Accounting view |
| 29 | `29-payments-detail-view.png` | Two-pane: list left, comp stack + attendance pull right |
| 30 | `30-reports-treasury.png` | Treasury tab with the 12-month cash curve (danger line + monsoon-dip area) |
| 31 | `31-command-palette.png` | ⌘K palette open over Overview |
| 32 | `32-keyboard-shortcuts.png` | `?` overlay listing all keyboard shortcuts |

## Notes for the implementer

- Screenshots are 914×553 — captured at the prototype's natural viewport during design
  review. They show the **top** of each module. Use the live prototype (in `prototype/`)
  for anything below the fold, scroll behaviour, hover states, and animations.
- The Accounting day drawer (right-side panel with grouped Sales/Payments/Expenses/HR/
  Treasury sections) couldn't be captured cleanly in a static screenshot. Open
  `prototype/index.html`, navigate to Accounting, and click any day row to see it live.
- Dark mode is a true warm-dark, not a colour-inverted light mode. Don't try to derive
  it algorithmically — every token is hand-picked in `tokens.css` under
  `[data-theme="dark"]`.
