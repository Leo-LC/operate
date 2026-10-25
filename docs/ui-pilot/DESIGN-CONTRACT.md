# Approved Operate direction

The sole approved visual reference is `approved-reference.png`. Earlier explorations and the rejected hybrid are not implementation references. The user liked the last dark Finance screen substantially more after removing conflicting colors and improving organization. Preserve its hierarchy, clarity and restraint; adapt content honestly to Reviews.

## Layout, in reading order

1. Retain the app's existing global shell, sidebar and theme switch during this pilot. Within the content area, add a small real breadcrumb such as Reviews / Stats. Do not invent a Home link unless its route exists.
2. Compact `Reviews` title beside the existing module navigation rendered as pill links. Stats is active; actual sibling routes and role visibility remain. No giant heading, explanatory hero or second global tab bar. Branch and date-period controls should be easy to find nearby without duplicating controls.
3. At wide desktop widths, a roughly 40/60 split: four KPI cards in a 2×2 grid on the left and one dominant Reviews trend chart on the right. Give the chart enough width for readable axes and dates. KPI card anatomy: short label, prominent number, concise comparison or explanation. Avoid decorative icon badges on every card.
4. Below: roughly 70/30 split with the sortable branch comparison table left and a compact overall star-distribution panel right, derived from `overall.distribution`. Use horizontal labelled bars for 5★ through 1★ with explicit counts/shares. Preserve per-branch distribution and expandable trends; eliminate duplication only if all existing information remains available.
5. Tablet: stack major regions when widths become cramped; keep the KPI grid 2×2 where readable. Mobile: compact header/filters, KPI grid or single column as needed, chart, branch table, distribution. Table may scroll inside its own labelled region; the whole page must not scroll horizontally. Do not shrink text to fit.

## Visual rules

- Dark: graphite background, subtly differentiated charcoal panels, quiet borders, high-contrast off-white primary text, readable neutral secondary text. Avoid extreme black/white glare and excessive cards within cards.
- Light: warm/off-white canvas, white panels, dark neutral text, visible boundaries. Same hierarchy and component behavior as dark mode.
- One main accent family: muted emerald/green. Small warm amber/orange touches only for a relevant action or warning. Neutral icons by default. No blue, purple, rainbow charts, gradient backgrounds or glowing effects.
- Color encodes meaning consistently: emerald for active/positive, amber for caution, restrained red for actual negative/error conditions. Do not mark every chart series with a loud different color. A neutral line with distinct shape can contrast with green bars.
- Active pill has a clear but restrained surface and border; inactive pills stay quiet. Color alone must not identify the active item.
- Keep existing app typography/fonts. Use a consistent type/spacing scale, tabular numbers for comparison and comfortable table rows. Most useful labels should be readable without hover. Do not repeat the existing tiny uppercase labels as a default everywhere.
- Consistent panel radii, aligned edges, meaningful section titles, restrained shadows. Spacing should group related information and separate unrelated information. Avoid both empty decorative space and dense undifferentiated data.

## Real content only

Finance mockup labels, data, dates and percentages are illustrative. Reviews KPIs are review count, average rating, public reply rate and 1–3★ share. Do not create revenue/expenses, fake growth or fictitious recent-activity widgets to imitate the screenshot. Empty/null values need honest labels. An explicit sync is different from loading cached stats: preserve this distinction in labels and errors.

## What this pilot proves

Information hierarchy, pills, panels, KPI anatomy, chart legibility, table density, filters, light/dark colors, responsive rules, states and scoped CSS. Sidebar/global header redesign and site-wide token migration happen only after real-screen approval. Keep a small candidate-token inventory for that later phase.
