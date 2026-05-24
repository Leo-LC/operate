# Modules — Operate

For each module: a short purpose statement, the layout, components used, interactions,
and the corresponding prototype file. Read this *with* the prototype open.

---

## 01 · Overview (`prototype/modules/overview.jsx`)

**Purpose.** Léo's morning landing page. Greeting + the four numbers he actually checks +
"what needs my eye today" + supporting context.

**Layout (top → bottom).**

1. **Greeting hero** — left column has eyebrow (today's long date), display-serif H1
   greeting (time-of-day aware: "Good morning, Léo" etc.), and a one-line handwritten
   accent below in `--font-script` `--bronze` at 30px (e.g. "Slow morning, sharp eye on
   Pattaya."). Right column has two buttons: secondary "Log expense", primary "Today's
   check-in".
2. **4-up stat band** — Yesterday's revenue (with sparkline), Drafts to confirm, New
   reviews, Cash runway.
3. **Two-column grid (1.4fr / 1fr)**:
   - Left: "Today across shops" card — list of top-4 shops with progress bars +
     amounts + delta pills. Header has a "Reports →" button.
   - Right column has two stacked cards:
     - "Needs your eye" — 4 todo items (drafts, low-star review, lease expiring,
       animal on watch). Click any → navigates to the module.
     - Quote card — `--bronze-soft` background, display-serif italic copy. The brand
       reminder text (e.g. "We sell the 30 minutes — not the cup. Watch the average
       dwell time before the average ticket.").
4. **Two-column grid (1fr / 1fr)**:
   - "On shift right now" — 5 employees with avatar + name + shop + role + hours +
     status pill.
   - "Recent activity" — 5 events with icon pill + text + timestamp.

**Interactions.**
- Greeting is deterministic from `new Date()`. The handwritten accent is hardcoded
  per-day in the prototype; in production, rotate it based on the morning's notable
  signal (low rating yesterday → "sharp eye on Pattaya"; great Sat sales → "Sunday
  glow"; etc.). One sentence, voice-on-brand.
- Todo items navigate via the same router as the sidebar.

---

## 02 · Reviews (`prototype/modules/reviews.jsx`)

**Purpose.** Triage Google + TripAdvisor + direct feedback. Reply to anything ≤3★.

**Layout.**

1. Page header: eyebrow "{n} reviews · last 30 days", title "Reviews", actions "Sync"
   and "Open Google".
2. 4-up stat band: Avg rating, 5★, ≤3★, Unanswered.
3. Two-pane layout, list left (360px), detail right (1fr), full height minus header.
   - **List card** has a sticky filter row (All / Unreplied / ≤3★) and a scrollable
     list of review summary rows (stars, author, snippet clamped to 2 lines, shop +
     source).
   - **Detail card** shows the full review with avatar, header line (source · date ·
     shop), stars, then a large display-serif italic pull quote of the text in curly
     quotes. Below, an "Your reply" section: a textarea if unreplied, otherwise the
     posted reply in a `--good-soft` band.

**Interactions.**
- Active review row gets `--row-active` background + 2px left bronze indicator.
- "Draft for me" button reveals a generated draft in `--bronze-soft` below the
  textarea, voice-tuned to the review's star rating.
- "Post reply" enabled only when textarea has content.

---

## 03 · Scheduling (`prototype/modules/scheduling.jsx`)

**Purpose.** Set and read the weekly shift grid across all shops + all employees.

**Layout.**

1. Page header with eyebrow ("Week of 25 May → 31 May"), title, subtitle.
   Actions: segmented Week grid / List, ◀ / ▶ week paging, primary "New shift".
2. **Week grid view (default).** A 7-column grid + 200px first column for employee.
   Each cell is either `—` (off) or a coloured shift chip with start/end and shift
   type (Open/Close) + shop short code.
3. **List view.** Flat list: Day · Employee · Shop · Start · End · Type pill.

**Interactions.**
- Shift chips are draggable in spirit (hover reveals dashed outline). Real drag
  reordering is a follow-up — for v1, click-to-edit is enough.
- Shop short codes (`BKK Ekk`, `CNX`, `SMI`, …) are defined in `data.jsx` `SHOPS`.

---

## 04 · Attendance (`prototype/modules/attendance.jsx`)

**Purpose.** See who's been on time, late, or absent — at a glance, over 30 days.

**Layout.**

1. Header + 4-up stats (Present, Late, Absent, Off-duty).
2. **Heatmap card.** Header has the date range + a legend (Present / Late / Absent /
   Off colour squares). Body is a grid with rows = employees, columns = 30 days.
   Each cell is a small coloured square.

**Interactions.**
- Hovering any cell pops a fixed bottom-right floating panel with employee avatar,
  name, shop, day number, status pill, and (if late) the actual vs expected punch time.
- Hovered cell gets a 2px bronze border.

---

## 05 · Payments (`prototype/modules/payments.jsx`)

**Purpose.** Confirm payroll drafts, see the breakdown, send slips.

### View A — Refined Table (default)

1. Page header. Actions: segmented Table/Detail, secondary "New payment", primary
   "Confirm {n} drafts" (disabled if 0).
2. 4-up stat band: Total payroll, Drafts (with amount), Paid so far, Due in.
3. Filter row: segmented All / Drafts / Confirmed / Paid (sm size). Right side shows
   "{n} selected · " when rows are checked.
4. Table grouped by status. Group header strip in `--surface-2` with a status pill +
   count + group total.
5. Row columns: checkbox · Employee (avatar + name + joined date) · Shop · Hours ·
   Base · Tips (green) · Deduction (red) · Total · row actions.

### View B — Two-pane detail

1. Same header band. Segmented switched to Detail.
2. Left list pane (320px, scrollable): each row has avatar, name, shop, total, status
   pill. Active row gets bronze left indicator.
3. Right detail card:
   - Header: large avatar, name, role + shop + joined date, status pill.
   - Two columns:
     - **Comp stack** — Base salary, Tips pool, optional Bonus, Hours worked (raw
       text), optional Deduction in a `--bad-soft` box with "Why this deduction?"
       expander, then a bold Total payable line.
     - **Attendance pull** — 14-day heatmap squares, summary counts (on time / late /
       absent / off), then a 3-row recent payments mini-list.
   - Bottom action bar: primary Confirm, secondary Edit, secondary Slip PDF, then
     danger "Void draft" pushed right.

**Interactions.**
- "Why this deduction?" expander fades in a 240ms `--bronze-soft` box quoting the
  attendance log entry that caused the deduction.
- Bulk confirm uses the checkbox column.

---

## 06 · Animals (`prototype/modules/animals.jsx`)

**Purpose.** Roster of every animal — health, location, vet log.

**Layout.**

1. Header + 4-up stats (In our care, Vet visits · last 30d, On watch, Avg dwell).
2. Type filter (segmented, sm): All / Capybara / Meerkat / Otter / Sugar Glider.
3. **Grid view (default).** Cards in an auto-fill grid (220px min). Card:
   - Top half: espresso photo placeholder block, 120px tall, with a tiny "Photo"
     amber-eyebrow at bottom-left + a faint paw icon bottom-right.
   - Bottom half: animal name in display serif italic, species · age eyebrow, status
     pill, footer row with shop + last vet date.
4. **List view.** Standard table: Name (display) · Species · Location · Age · Last
   vet · Status pill.

---

## 07 · Documents (`prototype/modules/documents.jsx`)

**Purpose.** Leases, permits, SOPs, vet records — all searchable.

**Layout.**

1. Header. Actions: secondary "Upload", primary "New folder".
2. Search input (400px max) + type segmented (All / SOP / Lease / Vet / …).
3. Table: Title (icon + name) · Type pill · Shop · Owner (avatar + name) · Updated
   (mono) · Size (mono, right-aligned) · row menu.
4. Empty state if filter matches nothing: small centered message.

---

## 08 · Accounting (`prototype/modules/accounting.jsx`)

**Purpose.** The big one. Daily roll-up across 8 shops. Click any day to drill in.

### View A — Smart Table (default)

1. Page header. Actions: segmented Smart table / Focus day, "Filters", "Export".
2. **Smart table card.**
   - Header row: `Day` label + one **column header per metric** (Sales / Payments /
     Expenses / HR / Net). Each metric header is a stacked block: uppercase eyebrow
     label, then a 120×22 filled sparkline of the metric across the month, then the
     month total below. Hovering anywhere on the sparkline shows a mono tooltip
     `dN: ฿amount` positioned at the cursor.
   - Day rows: Day label (Mon/Tue/…) + date · 5 mono tabular metric columns ·
     rightmost cell empty until hover → reveals "Copy row as CSV" button. Click row
     → opens day drawer.
   - **Weekly subtotal rows** between week groups: `--bg-2` background, "Week N /
     subtotal" label + 5 totals.
   - **Month total** at the bottom: `--bronze-soft` background, "May total" label + 5
     totals in 600 weight.

### View B — Focus Day

1. Horizontal day strip (scrollable): one button per day with day label, date, and
   compact sales amount. Active day = bronze fill.
2. Two-column grid (1fr / 1fr):
   - Left card: eyebrow + huge net amount (44px mono), pills ("+12% vs last Tue",
     "Forecast met"), then 4 breakdown bars (Sales / Payments collected / Expenses /
     HR cost) with mono amounts.
   - Right card: "By shop" list with row = shop name + bar (proportional to max) + mono amount.

### Day Drawer (shared)

Opened by any day click in the Smart Table.

- Width 560px. Header: eyebrow "{Day} · breakdown", title "{Date}, 2026", and three
  controls — `k` (prev) Kbd, `j` (next) Kbd, close ×.
- Headline block (`--surface-2` band): 2-col grid — Net (32px mono) + Sessions.
- Five **collapsible sections**, default-open: Sales / Payments / Expenses / HR /
  Treasury. Each row has a leading colour-tinted icon pill, title, amount on the right.
  Expanded view shows 3–4 sub-line items with mono amounts (negative in red).
- Footer band (`--surface-2`): keyboard legend (`j` next · `k` prev · `esc` close) +
  "Open full ledger →" button.

**Interactions.**
- `j` / arrow-down: next day. `k` / arrow-up: previous day. `Esc`: close.
- Sparkline header tooltips track the mouse with `onMouseMove`.
- "Copy row as CSV" copies a 2-line CSV (`date,sales,...\n{date},{vals}`) to clipboard;
  the icon flips to a check + `--good` background for 1.4s as confirmation.

---

## 09 · Reports (`prototype/modules/reports.jsx`)

**Purpose.** Operations health (revenue, sessions, rating, uplift) + Treasury (12-month
cash forecast).

**Layout.** Tabs at top: Operations / Treasury.

### Operations tab

1. 4-up KPI hero cards: Revenue (12mo), Sessions, Avg rating, Drink uplift.
   - Each card: eyebrow + huge mono value + delta pill (good/bad arrow) + filled
     220×32 sparkline.
   - "Drink uplift" uses `downBad` — falling = bad, rising = good. The others use
     normal "up is good".
2. Two cards side-by-side (1.5fr / 1fr):
   - **Revenue by shop** — for each shop: name (80px) + horizontal bar (bronze) on a
     `--bg-2` last-year ghost bar + mono total + delta pill. Legend below.
   - **Revenue mix** — SVG donut chart with 4 slices (Animal experience, F&B, Merch,
     Events). Each colour-coded. Centre label "Mix / 100%". Legend below with
     swatches + percentages.
3. Two cards side-by-side (1fr / 1fr):
   - **Top performers · this month** — top 5 shops, ranked, with #1 in a bronze
     square.
   - **Customer signal** — large rating value (40px) + delta pill, then 5-row
     histogram (5★ / 4★ / 3★ / 2★ / 1★) with proportional bars + count.

### Treasury tab

1. **12-month projected cash curve** card.
   - Full-width 880×240 SVG line chart. Bronze line + 10% alpha area fill. Gridlines
     (dashed, 1px). A dashed `--bad` horizontal line at ฿800k labelled "danger ฿800k"
     in the top-right. Months below the line get red-fill dots with their value as a
     callout above.
   - Header has "Base case" pill (bronze) and "Stress test" pill (outline) — a future
     toggle, no behaviour wired yet.
2. Two cards side-by-side (1fr / 1fr):
   - **What's eating the lean months** — 5 cost categories with icon pill + title +
     proportional bar + mono total.
   - **Recommended actions** — 4 actions with status pill + title + hint + impact
     delta (`+฿180k` green, `-฿45k/mo` red).

---

## 10 · Contacts (`prototype/modules/contacts.jsx`)

**Purpose.** Landlords, suppliers, vets, accountant.

**Layout.**

1. Header + primary "Add contact" action.
2. Search input (400px max).
3. Table: Name (avatar + name) · Role · Phone (mono) · Email · Shop pill.
4. When "Add contact" is clicked, a 360px side card slides in (right column) with
   a form: Name, Role, Phone, Email, Tied to shop, Notes. Save disabled until Name
   + Role filled.

---

## 11 · Wiki (`prototype/modules/wiki.jsx`)

**Purpose.** Internal handbook — SOPs, policies, voice rules.

**Layout.**

1. Header. Actions: "Search", primary "New page".
2. Two-column layout, full height minus header.
   - **Left sidebar (260px):** search input at top, then a grouped list — section
     name as eyebrow, pages indented below. Active page gets `--row-active`.
   - **Right article:** generous padding (`--s-7`), eyebrow section, display-serif H1
     (34px), update meta, then a 56×2 amber rule, then the article body.
3. Article body is rendered Markdown-ish (in production: real MDX or whatever the
   codebase uses). Includes a closing **`--surface-2` card** with a display-serif
   italic pull-quote ("One line to remember").

---

## 12 · Brand (`prototype/modules/brand.jsx`)

**Purpose.** Reference page — palette, type, voice rules. Read-only.

**Layout.** Stacked cards, each with an "0N — TITLE" eyebrow:

1. **01 — Mark** — three "mark on background" swatches (cream / espresso / amber).
   Mark is rendered as a circular outline with a display-italic 'C' for the
   prototype; production should swap in the real capy mark PNG/SVG.
2. **02 — Colour system** — 4 swatches (Cream / Espresso / Amber / Sage) with hex
   on the colour block + role description below.
3. **03 — Typography** — 4 rows, each showing family + weight + role on the left and
   a live specimen on the right (Cabinet Grotesk display, Next Southerland Serif,
   Next Southerland Script, Satoshi body).
4. **04 — Voice** — 2×2 grid of 4 voice rule cards.

---

## 13 · Admin (`prototype/modules/admin.jsx`)

**Purpose.** Workspace settings, members, integrations, audit log.

**Layout.** Tabs: General / Members / Integrations / Audit log.

### General

Stacked cards (max width 720px):
- **Workspace** — Org name, Currency, Week starts on, Timezone (2-col fields).
- **Notifications** — Three toggle rows (Daily summary, Weekly email digest, Slack
  low-rating).
- **Data** — Three buttons inline: Export, Archive, Delete (danger).

### Members

Card with header ("{n} members" + primary "Invite member") and a table:
Name (avatar + name + email) · Role · Shop · Access pill (Owner/Manager/Member) · menu.

### Integrations

2-up grid of integration cards: icon block + name + hint + "Connected" pill or
"Connect" button.

### Audit log

Table card: Who (avatar + first name) · What · When (right-aligned).
