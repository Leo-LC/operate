# Wiki & Thai Taxes Article — Redesign Spec

**Date:** 2026-05-21  
**Status:** Approved by user  

---

## Context

The current wiki module stores articles as HTML in Supabase via a TipTap rich-text editor. For the Thai taxes article specifically — and for the wiki in general — this approach is too limiting: complex interactive layouts, custom card grids, animated components, and precise typography are not expressible through a WYSIWYG editor.

The goal is to:
1. **Rebuild the wiki as hardcoded TSX**, consistent with how all other modules in the app are built.
2. **Create a comprehensive, visual, and interactive Thai tax/accounting article** that is pedagogically clear, accurate, and covers every relevant accounting concept for a Thai company.

The existing draft at `features_ideas/thailand_finance_wiki_page.html` is the design reference for tone, clarity, and information flow. The approved hi-fi mockup in `.superpowers/brainstorm/` is the visual reference.

---

## Part 1 — Wiki Architecture

### Decision: Static named routes, TSX-only content

Abandon TipTap and Supabase content storage. Every article is a Next.js page file (TSX) living in the `app/dashboard/wiki/` tree. No dynamic `[slug]` routing for content — each article has its own dedicated folder.

**Route structure:**
```
app/dashboard/wiki/
  page.tsx                          → Wiki index (list all articles by category)
  thai-taxes/
    page.tsx                        → Thai taxes overview (rich interactive)
    vat/page.tsx                    → VAT detail page
    wht/page.tsx                    → Withholding Tax detail page
    cit/page.tsx                    → Corporate Income Tax detail page
    payroll/page.tsx                → Payroll & Social detail page
    dividends/page.tsx              → Dividends detail page
    declarations/page.tsx           → Declaration calendar detail page
  [future-article]/
    page.tsx                        → Simple prose article using WikiProse component
```

### Two article flavors

**Flavor 1 — Rich interactive** (Thai taxes and similar): Full custom TSX component, can have animations, card grids, formula visualizations, etc. No shared template — each is its own component.

**Flavor 2 — Simple prose** (Wikipedia-like articles): Use a shared `WikiProse` component that accepts structured content props (title, sections with headings and paragraphs). Writing a new simple article = adding a new page file with ~20 lines of TSX. Equally fast to write and edit via Claude Code as a DB entry would be.

### Wiki index page

The wiki index (`app/dashboard/wiki/page.tsx`) is a hardcoded registry — a constant array of article metadata (title, slug, category, description, last updated) that renders the existing card list UI. Adding an article = adding one entry to the array + creating the page file.

### What happens to the existing DB schema

Keep `wiki_pages` and `wiki_categories` tables in Supabase for now (no migration needed). They are simply unused by the new TSX-driven wiki. If role-based access per article is needed in the future, the schema is already there.

---

## Part 2 — Thai Taxes Overview Page

### Visual structure (Option D — Hybrid)

```
Breadcrumb
Page header (eyebrow + title + subtitle + last-updated)
Formula Hero (dark card: CA − Expenses = Profit → CIT)
─────────────────────────────────────────────────────
Section 1 · Taxes sur les ventes & les achats         [VAT, SBT, Stamp Duty]
Section 2 · Retenues à la source — WHT                [1%, 3%, 5%, 10%, 15-20%]
Section 3 · Impôt sur les sociétés — CIT              [SME tiers, PND.51]
Section 4 · Charges sociales & Payroll                [SSF, PIT withholding, WCF]
Section 5 · Dividendes & distributions                [10% WHT, inter-co, foreign]
Section 6 · Calendrier des déclarations               [calendar strip]
```

### Formula Hero

Dark background (`#2F2823`), four colored chips in a row:
- **CA** (blue) — "hors VAT · top line"
- **minus Expenses** (amber) — "salaires, loyers, fournisseurs…"
- **equals Profit** (green) — "bottom line · base imposable"
- **arrow CIT** (red) — "15–20% selon seuils"

Below the chips: a one-paragraph note explaining that VAT is not CA and that only profit is taxed.

### Card design

Each tax card shows — without any click required:
- Icon + rate (prominent, monospace font)
- Full name + subtitle
- 2-line description
- 2–3 contextual tags (green/amber/red/blue pills)
- Footer: deadline label + "Voir détails →" link

Cards are clickable links. The entire card is a `<Link href="...">`. No expand/collapse. Hover state: slight lift + amber border.

### Card grids per section

- **Section 1** (Sales taxes): 3-col grid — VAT, SBT, Stamp Duty
- **Section 2** (WHT): 4-col grid for 1%/3%/5%/10% rates + full-width card for non-residents 15–20%
- **Section 3** (CIT): 3-col grid — Large company 20%, SME tiers 0-15-20%, PND.51 advance payment
- **Section 4** (Payroll): 3-col grid — SSF, PIT withholding, Workmen's Compensation Fund
- **Section 5** (Dividends): 3-col grid — Thai individuals 10%, inter-company exemption, foreign shareholders
- **Section 6** (Calendar): Full-width calendar strip (4 columns: monthly / quarterly / mid-year / annual)

### Section header pattern

```
● SECTION TITLE ─────────────────── n taxes
```
Amber dot + uppercase label + amber color + divider line + count.

### Note boxes

Used before the WHT section to explain the withholding mechanic (you deduct from the payment, the recipient gets a certificate). Amber left border, light yellow background.

---

## Part 3 — Detail Pages

### Structure (Option B — Long scrolling page with anchored sections)

Every detail page follows the same section order:

```
Breadcrumb (Wiki › Thai Taxes › [Article])
Hero block (dark, rate prominent + name + tags)
─────────────
§ Principe          — what it is and why it exists
§ Qui est concerné  — thresholds, conditions, who must register
§ Calcul            — formula, step-by-step, with monospace formula block
§ Exemple concret   — worked numeric example with flow visualization
§ Déclaration       — form name, deadline, online filing bonus days
§ Points importants — common mistakes, edge cases, tips
§ Concepts liés     — 2–4 cards linking to related articles
```

Not every section is mandatory — if a detail doesn't apply (e.g. Stamp Duty has no registration threshold), the section is omitted.

### Hero block

Same dark background as the formula hero. Large rate in amber monospace (top right), full name + subtitle top left, tags row below. Consistent across all detail pages.

### Worked example style

Light cream background box. Label "Exemple concret" in uppercase. Flow items in pill format connected by arrows (→ + =). Note below explaining what the numbers mean in context.

### Concepts liés

3-col grid of small cards at the bottom. Each card: icon + name + "→". Links to sibling detail pages or back to the overview.

---

## Part 4 — Content Research Requirements

**This is critical.** The content must be accurate and complete. Before writing article TSX, do a thorough research pass covering at minimum:

- **VAT**: 7% standard rate, zero-rated (exports), exempt categories (education, healthcare, unprocessed agricultural products), input VAT credit/refund mechanics, PP.30 form, e-filing deadline extension (+8 days), threshold 1,800,000 THB/year
- **SBT**: Specific Business Tax — sectors (banking 3%, finance 3%, life insurance 2.5%, real estate 3.3%), why it replaces VAT, PP.40 form
- **WHT rates**: Complete table — 1% (transport, goods from companies), 3% (services, professional fees), 5% (rent), 10% (dividends Thai residents), 15% (dividends non-residents in some cases, royalties, interest to foreign companies), 20% (other payments to foreign companies without DTA); PP.1 vs PP.3 forms; 7-day rule for dividends
- **CIT SME tiers**: Capital paid-up ≤ 5M THB AND revenue ≤ 30M THB → 0% on first 300k THB profit, 15% on 300k–3M THB, 20% above 3M THB. Large companies: flat 20%. Listed companies may have different rates. PND.50 (annual), PND.51 (mid-year advance = 50% of estimated annual tax)
- **PIT withholding on salaries**: Progressive 0–35% brackets (0% up to 150k THB, 5%, 10%, 15%, 20%, 25%, 30%, 35%), PND.1 form, due 7th of following month
- **SSF**: 5% employee + 5% employer, capped at 750 THB/month each (based on max 15,000 THB salary), benefits (health, accident, maternity, unemployment, retirement), monthly contribution
- **Workmen's Compensation Fund**: 0.2%–1% employer only, depends on industry risk category, annual payment
- **Dividends**: WHT 10% for Thai individual shareholders (final tax, no further PIT), WHT 10–20% for foreigners (reduced by DTA), inter-company exemption conditions (≥25% holding, ≥3 months), PP.3 form, 7-day filing window
- **Stamp Duty**: Key instruments — loan agreements 0.05%, share transfer 0.1%, lease agreements fixed baht per term, service contracts 0.1%
- **Declaration calendar**: All forms, all deadlines, e-filing extensions, penalties for late filing

---

## Part 5 — Design Tokens

Use existing Capybara Coffee brand tokens (from `globals.css`):
- Primary: `#B9854E` (amber)
- Background: `#F7F2E9` (cream)
- Foreground: `#2F2823` (dark brown)
- Secondary: `#EDE5D5` (light beige)
- Monospace font: DM Mono (already in project via Google Fonts)
- Border radius: `0.6rem` (standard), `11–14px` for cards
- Transitions: `150ms ease` for hover states, `translateY(-1px)` lift on card hover

Cards: white background, `#E8DDD0` border, amber border + shadow on hover. Dark cards: `#2F2823` background for formula hero and section cards that need emphasis.

---

## Part 6 — Verification

After implementation:

1. **Smoke test the overview page** — open `/dashboard/wiki/thai-taxes`, verify all 6 sections render, formula hero is correct, all "Voir détails →" links resolve to valid routes
2. **Test detail pages** — open at least VAT, WHT, CIT detail pages; verify hero, all sections present, worked examples display correctly, "Concepts liés" links work
3. **Verify wiki index** — open `/dashboard/wiki`, confirm Thai Taxes article appears in the list with correct metadata
4. **Responsive check** — overview and detail pages readable on narrow viewport (the card grids should collapse gracefully)
5. **Accuracy spot-check** — verify CIT SME tiers (0/15/20%), WHT rates table, SSF cap (750 THB), dividend WHT (10%), SBT sectors
6. **Navigation** — breadcrumb links work at all levels; back navigation from detail page returns to overview
