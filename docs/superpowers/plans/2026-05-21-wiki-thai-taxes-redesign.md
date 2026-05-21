# Wiki & Thai Taxes Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TipTap/DB wiki with static TSX articles and build a comprehensive interactive Thai tax overview page with 6 detail sub-pages.

**Architecture:** Static Next.js routes per article under `app/dashboard/wiki/thai-taxes/`. Shared UI components in `src/modules/wiki/components/`. Wiki index driven by a hardcoded registry instead of Supabase. All content coded directly in TSX — no CMS, no editor.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `cn()` from `@/lib/utils`, DM Mono (already in project via Google Fonts).

**Spec & visual reference:**
- `docs/superpowers/specs/2026-05-21-wiki-thai-taxes-redesign.md`
- `.superpowers/brainstorm/11077-1779361222/content/hifi-overview.html` (approved hi-fi mockup)
- `features_ideas/thailand_finance_wiki_page.html` (content tone reference)

---

## File map

**Create:**
- `src/modules/wiki/components/TaxCard.tsx` — clickable card: icon, rate (monospace), name, desc, tags, deadline, amber hover
- `src/modules/wiki/components/SectionHeader.tsx` — amber dot + uppercase label + divider line + optional count
- `src/modules/wiki/components/NoteBox.tsx` — amber left-border info box
- `src/modules/wiki/components/FormulaHero.tsx` — dark hero: CA − Expenses = Profit → CIT, 4 colored chips
- `src/modules/wiki/components/WikiDetailLayout.tsx` — wrapper for detail pages: breadcrumb + dark hero block + section primitives (DetailSection, FormulaBlock, ExampleBlock, ExampleFlow, ThresholdTable, DeadlineCards, RelatedCards)
- `src/modules/wiki/components/CalendarStrip.tsx` — 4-column table: monthly / quarterly / mid-year / annual deadlines
- `src/modules/wiki/components/WikiProse.tsx` — simple prose template for future plain-text articles
- `src/modules/wiki/registry.ts` — hardcoded array of article metadata (slug, href, title, desc, category, updatedAt)
- `src/app/dashboard/wiki/thai-taxes/page.tsx` — overview: formula hero + 6 sections of TaxCards
- `src/app/dashboard/wiki/thai-taxes/vat/page.tsx` — VAT detail page
- `src/app/dashboard/wiki/thai-taxes/wht/page.tsx` — WHT detail page
- `src/app/dashboard/wiki/thai-taxes/cit/page.tsx` — CIT detail page
- `src/app/dashboard/wiki/thai-taxes/payroll/page.tsx` — Payroll & SSF detail page
- `src/app/dashboard/wiki/thai-taxes/dividends/page.tsx` — Dividends detail page
- `src/app/dashboard/wiki/thai-taxes/declarations/page.tsx` — Declaration calendar detail page

**Rewrite:**
- `src/app/dashboard/wiki/page.tsx` — registry-driven index (no Supabase, no TipTap)

**Delete:**
- `src/app/dashboard/wiki/[slug]/` (entire folder — viewer + editor)
- `src/app/dashboard/wiki/new/page.tsx`
- `src/modules/wiki/components/WikiEditorClient.tsx`
- `src/modules/wiki/components/WikiPageClient.tsx`
- `src/modules/wiki/components/WikiIndexClient.tsx`
- `src/app/api/wiki/` (entire folder — no longer needed)
- `src/lib/wiki-helpers.ts` (if nothing else imports it)
- `src/modules/wiki/types.ts` (if nothing else imports it)

---

## Task 1 — Gitignore

- [ ] Add `.superpowers/` to `.gitignore`
- [ ] `git commit -m "chore: ignore .superpowers brainstorm dir"`

---

## Task 2 — Shared UI components

Build all 7 shared components. Each is a standalone TSX file with no external dependencies beyond `cn()` and `next/link`.

**Design tokens to use throughout:**
- Primary amber: `#B9854E`
- Background cream: `#F7F2E9`
- Dark foreground: `#2F2823`
- Secondary beige: `#EDE5D5`
- Muted text: `#7a6a5a`
- Card border: `#E8DDD0`, hover → `#B9854E`
- Border radius: `rounded-[11px]` for cards, `rounded-[14px]` for heroes
- Monospace font class: `font-mono` (DM Mono)
- Hover lift: `hover:-translate-y-px`

**TaxCard** — renders as a `<Link>`. Props: `icon`, `rate`, `name`, `subtitle?`, `description`, `tags[]` (label + variant: green/amber/red/blue/purple/muted), `deadline?`, `href`, `variant?: default|dark|highlighted`. Full card is clickable. Footer: deadline left, "Voir détails →" right.

**SectionHeader** — `● TITLE ──── n taxes`. Dot + uppercase amber label + flex-1 divider + optional count.

**NoteBox** — amber left border (`border-l-2 border-l-[#B9854E]`), light yellow bg (`#fff8ee`), icon + children.

**FormulaHero** — dark bg `#2F2823`, 4 colored chips (CA blue, Expenses amber, Profit green, CIT red) in a flex row with `−`, `=`, `→` operators. Explanatory note below in smaller text.

**WikiDetailLayout** — accepts `breadcrumbs[]`, `hero` (rate, name, subtitle, tags[]), `children`. Renders breadcrumb nav + dark hero block + children. Also exports these section primitives used inside detail pages:
- `DetailSection` — titled section with amber label + divider
- `FormulaBlock` — monospace code-style box
- `ExampleBlock` — cream bg box with a label
- `ExampleFlow` — pill items connected by → arrows
- `ThresholdTable` — borderless table, muted headers, light row dividers
- `DeadlineCards` — horizontal row of small info cards (label / value / sub)
- `RelatedCards` — 3-col grid of linked cards with icon + label + →

**CalendarStrip** — hardcoded data, 4 columns (monthly / quarterly / mid-year / annual), dark header row, content rows with amber bullets. Content: PP.30, PP.1/PP.3, PND.1, SSF (monthly); PND.51 (mid-year); PND.50, PND.1 Kor, États financiers (annual).

**WikiProse** — accepts `title`, `eyebrow?`, `subtitle?`, `sections[]` (heading + body string), `updatedAt?`. Simple readable layout for future plain-text articles.

- [ ] Create all 7 component files
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `git commit -m "feat(wiki): add shared UI components"`

---

## Task 3 — Article registry & wiki index

**registry.ts** — export `WIKI_ARTICLES: ArticleMeta[]` (interface: slug, href, title, description, category, updatedAt, type: 'rich'|'prose'). First entry: Thai Taxes article. Export `WIKI_CATEGORIES` derived from articles.

**wiki/page.tsx** (rewrite) — server component, no Supabase call. Groups articles by category using the registry. Renders same visual structure as existing index (category label + divider + 2-col grid of article links). Remove "New page" button and search (only one article for now — add search back when >5 articles).

- [ ] Create `registry.ts`
- [ ] Rewrite `app/dashboard/wiki/page.tsx`
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Open `/dashboard/wiki` — article appears, link works
- [ ] `git commit -m "feat(wiki): replace DB-driven index with hardcoded registry"`

---

## Task 4 — Thai taxes overview page

File: `src/app/dashboard/wiki/thai-taxes/page.tsx`

Server component (no data fetching needed). Composes shared components into 6 sections. Research all rates/forms/thresholds before writing — accuracy is critical.

**Layout:**
1. Breadcrumb → Wiki › Thai Taxes
2. Page header: eyebrow "Guide comptable", h1 "Comptabilité & Taxes en Thaïlande", subtitle, last-updated right-aligned
3. `<FormulaHero />`
4. Section 1 — "Taxes sur les ventes & les achats" (3 cards: VAT 7%, SBT 3–3.3%, Stamp Duty 0.1%)
5. Section 2 — "Retenues à la source — WHT" with `<NoteBox>` explaining the mechanic, then 4-col grid (1%/3%/5%/10%) + full-width card for 15–20% non-residents
6. Section 3 — "Impôt sur les sociétés — CIT" (3 cards: grande société 20%, PME 0-15-20%, PND.51 advance)
7. Section 4 — "Charges sociales & Payroll" (3 cards: SSF 5%, PIT 0-35%, WCF 0.2-1%)
8. Section 5 — "Dividendes & distributions" (3 cards: WHT 10% résidents, inter-co exonération, étrangers 10-20%)
9. Section 6 — "Calendrier des déclarations" + `<CalendarStrip />`

**Card hrefs:** VAT → `/…/vat`, WHT cards → `/…/wht`, CIT cards → `/…/cit`, Payroll → `/…/payroll`, Dividends → `/…/dividends`, Calendar → `/…/declarations`. SBT and Stamp Duty (no dedicated page yet) → link back to `/dashboard/wiki/thai-taxes`.

**Accurate tax data to use:**
- VAT: 7%, seuil 1.8M THB, PP.30 before 15th (23rd e-filing)
- SBT: banking 3%, real estate 3.3%, life insurance 2.5%, PP.40
- WHT 1%: goods/transport; 3%: services; 5%: rent; 10%: dividends residents; 15%: dividends/royalties/interest non-residents; 20%: other non-resident
- CIT SME (capital ≤5M THB AND revenue ≤30M THB): 0% on ≤300k, 15% on 300k–3M, 20% above; large: flat 20%
- SSF: 5%+5%, cap 750 THB/month each (base max 15k THB)
- WHT dividends residents: 10%, PP.3 within 7 days
- Inter-co exemption: ≥25% held ≥3 months

- [ ] Create `thai-taxes/page.tsx`
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Open `/dashboard/wiki/thai-taxes` — all 6 sections, formula hero, all cards with correct rates
- [ ] `git commit -m "feat(wiki): add Thai taxes overview page"`

---

## Task 5 — VAT detail page

File: `src/app/dashboard/wiki/thai-taxes/vat/page.tsx`

Uses `WikiDetailLayout` + all section primitives. Sections in order:

1. **Principe** — VAT is collected for the state, input VAT is deductible. Formula: `VAT à payer = Output VAT − Input VAT`. Credit carry-forward or refund if input > output.
2. **Qui est concerné** — `ThresholdTable`: mandatory if CA > 1.8M THB (register within 30 days), optional below, zero-rated for exports and services to foreign entities outside Thailand.
3. **Catégories exemptées** — unprocessed agricultural products, books, education, healthcare, domestic road/rail transport, religious services, residential real estate. Note: exempt = no input VAT recovery.
4. **Calcul — exemple concret** — `ExampleBlock`: sell 10,000 THB service → invoice 10,700 → CA = 10,000, 700 goes to state. Then monthly calc: output 7,000 − input 2,000 = 5,000 THB owed via PP.30.
5. **Déclaration** — `DeadlineCards`: PP.30 / 15th standard / 23rd e-filing / monthly or quarterly (SME option).
6. **Points importants** — Tax Invoice requirement for input VAT recovery; mandatory output/input registers kept 5 years; late penalty 2%/month + 1.5%/month interest; SBT replaces VAT for certain sectors.
7. **Concepts liés** — WHT, Declarations, overview.

- [ ] Create `thai-taxes/vat/page.tsx`
- [ ] Open `/dashboard/wiki/thai-taxes/vat` — breadcrumb, hero, all sections, related links work
- [ ] `git commit -m "feat(wiki): add VAT detail page"`

---

## Task 6 — WHT detail page

File: `src/app/dashboard/wiki/thai-taxes/wht/page.tsx`

Hero: rate "1–15%", name "Withholding Tax — Retenue à la source"

Sections:
1. **Principe** — payer deducts WHT and sends it to Revenue Dept; payee gets a WHT certificate (หนังสือรับรองการหักภาษี ณ ที่จ่าย) deductible against their CIT/PIT. Formula: `Paiement net = Montant brut − WHT`. NoteBox: WHT is a prepayment on tax for the recipient, not a double tax.
2. **Tableau des taux** — `ThresholdTable` with 9 rows: 1% goods/transport PP.1, 3% services PP.1, 5% rent PP.1, 10% dividends residents PP.3, 10–15% dividends non-residents PND.54, 15% royalties non-residents PND.54, 15% interest non-residents PND.54, 20% other non-resident payments PND.54.
3. **Exemple concret** — two `ExampleBlock`s: (a) 100,000 THB consulting → retain 3,000 → pay 97,000; (b) 50,000 THB rent to individual → retain 2,500 → pay 47,500.
4. **Déclaration** — `DeadlineCards`: PP.1 companies / PP.3 individuals / 7th of following month / PND.54 non-residents 7 days.
5. **Points importants** — 1,000 THB threshold (no WHT below, except dividends); WHT certificates received from clients reduce your own CIT; DTA treaties can reduce non-resident rates; omitting WHT = you owe the amount + 100% penalty + interest.
6. **Concepts liés** — VAT, CIT, Dividends.

- [ ] Create `thai-taxes/wht/page.tsx`
- [ ] Open page, verify table has all 9 rows
- [ ] `git commit -m "feat(wiki): add WHT detail page"`

---

## Task 7 — CIT detail page

File: `src/app/dashboard/wiki/thai-taxes/cit/page.tsx`

Hero: rate "20%", name "Corporate Income Tax — Impôt sur les sociétés"

Sections:
1. **Taux applicables** — `ThresholdTable`: PME (capital ≤5M THB AND revenue ≤30M THB) → 0% on 0–300k, 15% on 300k–3M, 20% above; large company → flat 20% on all profit. Note: both conditions must be met simultaneously for SME rates.
2. **Base imposable** — formula `Bénéfice imposable = CA − Charges déductibles − Amortissements`. List deductible (salaries, rent, raw materials, marketing, financial costs, depreciation, employer SSF) vs non-deductible (fines, income tax itself, personal expenses).
3. **Acompte mi-année — PND.51** — 50% of estimated annual CIT, due within 2 months after end of 6th month. NoteBox: underestimating by >25% triggers a 20% penalty on the shortfall.
4. **Exemple concret** — PME with 2,500,000 THB net profit: 0–300k = 0 THB; 300k–2.5M (= 2.2M) × 15% = 330,000 THB total CIT vs 500,000 THB at full rate.
5. **Déclaration annuelle — PND.50** — `DeadlineCards`: PND.50 / 150 days after year-end / example May 30 for Dec year-end / simultaneous DBD financial statement filing (5 months).
6. **Concepts liés** — WHT (advance on CIT), Dividends, Declarations.

- [ ] Create `thai-taxes/cit/page.tsx`
- [ ] Open page, verify SME tiers table
- [ ] `git commit -m "feat(wiki): add CIT detail page"`

---

## Task 8 — Payroll detail page

File: `src/app/dashboard/wiki/thai-taxes/payroll/page.tsx`

Hero: rate "5% + 5%", name "Payroll — Charges sociales & retenue PIT"

Sections:
1. **Social Security Fund (SSF)** — 5% employee + 5% employer on salary up to 15,000 THB (max 750 THB each/month). Formula `Max = 15,000 × 5% = 750 THB`. `ThresholdTable` of 6 benefits: health, maternity, disability, unemployment (50% salary max 180d/year), retirement pension (from age 55), death.
2. **Personal Income Tax — retenue employeur** — employer calculates annual PIT estimate and withholds 1/12 monthly. `ThresholdTable` of 8 PIT brackets: 0% (0–150k), 5% (150k–300k), 10% (300k–500k), 15% (500k–750k), 20% (750k–1M), 25% (1M–2M), 30% (2M–5M), 35% (>5M). Note common deductions: 50% of employment income (max 100k), personal allowance 60k, spouse 60k, life insurance up to 100k.
3. **Workmen's Compensation Fund (WCF)** — employer only, 0.2%–1% of annual salary by risk sector. `ExampleBlock`: office/commerce at 0.2% → 2.4M THB payroll × 0.2% = 4,800 THB/year.
4. **Déclarations** — `DeadlineCards`: SSF before 15th / PND.1 before 7th / PND.1 Kor end of Feb / WCF annual.
5. **Concepts liés** — WHT, CIT, Declarations.

- [ ] Create `thai-taxes/payroll/page.tsx`
- [ ] `git commit -m "feat(wiki): add Payroll & SSF detail page"`

---

## Task 9 — Dividends detail page

File: `src/app/dashboard/wiki/thai-taxes/dividends/page.tsx`

Hero: rate "10%", name "Dividendes — Distribution aux actionnaires"

Sections:
1. **Principe** — dividends come from post-CIT profit, require AGM approval (annual) or board resolution (interim). Formula: `Dividende net = Dividende brut − WHT (10%)`.
2. **Taux WHT par type d'actionnaire** — `ThresholdTable`: Thai individual → 10% libératoire; Thai company <25% → 10% deductible from CIT; Thai company ≥25% held ≥3 months → exempt; foreign individual → 10–15% per DTA; foreign company without DTA → 20%; foreign company with DTA → typically 10%.
3. **Exonération inter-sociétés** — NoteBox: two conditions simultaneously: ≥25% shareholding AND held for ≥3 consecutive months before distribution date. Note: different rules may apply for SET-listed companies.
4. **Conventions DTA** — `ThresholdTable` with 5 example countries: France (10% if ≥10%, else 15%), UK (10% if ≥25%, else 15%), Singapore (10%), Germany (10% if ≥25%, else 15%), no DTA (20%).
5. **Processus de distribution** — numbered list: board resolution → 30 days to pay → withhold WHT at payment → PP.3 within 7 days → issue WHT certificate.
6. **Déclaration** — `DeadlineCards`: PP.3 / within 7 days of payment month / resolution-to-payment max 30 days.
7. **Concepts liés** — CIT (source of dividends), WHT, Declarations.

- [ ] Create `thai-taxes/dividends/page.tsx`
- [ ] `git commit -m "feat(wiki): add Dividends detail page"`

---

## Task 10 — Declarations calendar detail page

File: `src/app/dashboard/wiki/thai-taxes/declarations/page.tsx`

Hero: rate "📅", name "Calendrier fiscal — Toutes les déclarations"

Sections:
1. **Vue d'ensemble** — render `<CalendarStrip />` (already built in Task 2)
2. **Déclarations mensuelles — Revenue Department** — `ThresholdTable`: PP.30 (VAT, 15th/23rd, penalty 2%/month), PP.1 (WHT companies, 7th, penalty 100%+interest), PP.3 (WHT individuals + dividends, 7th/7-day, same penalty), PND.1 (PIT salaries, 7th).
3. **Déclarations — Social Security Office** — SSF monthly before 15th; WCF annual before Jan 31 next year.
4. **Déclarations annuelles — Revenue Department** — PND.51 (end Aug for Dec year-end), PND.50 (May 30 for Dec year-end), PND.1 Kor (end Feb).
5. **Obligations DBD** — financial statements within 5 months of year-end; AGM within 4 months; shareholder list update (BOJ 5) if changes.
6. NoteBox: e-filing adds 8 calendar days to all Revenue Dept deadlines (PP.30: 15→23; PP.1/PP.3/PND.1: 7→15).
7. **Concepts liés** — VAT, WHT, CIT.

- [ ] Create `thai-taxes/declarations/page.tsx`
- [ ] `git commit -m "feat(wiki): add Declarations calendar detail page"`

---

## Task 11 — Delete old TipTap routes & cleanup

- [ ] `rm -rf src/app/dashboard/wiki/\[slug\] src/app/dashboard/wiki/new`
- [ ] `rm src/modules/wiki/components/WikiEditorClient.tsx src/modules/wiki/components/WikiPageClient.tsx src/modules/wiki/components/WikiIndexClient.tsx`
- [ ] Check API routes: `grep -r "wiki" src/app/api --include="*.ts" -l` — if only `src/app/api/wiki/` found, `rm -rf src/app/api/wiki`
- [ ] Check for orphaned imports: `grep -r "wiki-helpers\|modules/wiki/types" src --include="*.ts" --include="*.tsx" -l` — remove files only if nothing outside deleted files imports them
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `git add -A && git commit -m "chore(wiki): remove TipTap editor, old dynamic routes, unused API"`

---

## Task 12 — Final verification

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Visual check — open each URL, confirm renders correctly:
  - `/dashboard/wiki` — article listed, link works
  - `/dashboard/wiki/thai-taxes` — 6 sections, correct rates, all links resolve
  - `/dashboard/wiki/thai-taxes/vat` — hero 7%, 7 sections, breadcrumb
  - `/dashboard/wiki/thai-taxes/wht` — hero 1–15%, 9-row rate table
  - `/dashboard/wiki/thai-taxes/cit` — SME tiers 0/15/20%
  - `/dashboard/wiki/thai-taxes/payroll` — SSF + PIT brackets
  - `/dashboard/wiki/thai-taxes/dividends` — DTA table, exemption conditions
  - `/dashboard/wiki/thai-taxes/declarations` — CalendarStrip + form tables
- [ ] `git status | grep superpowers` — empty (gitignored)
- [ ] `git commit -m "feat(wiki): complete Thai taxes wiki redesign"`
