# EventIQ — MCA Market Intelligence Tool

## Project Overview
Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui application for HyperVerge's BD team. Internal tool for MCA market intelligence at events like DeBanked CONNECT 2026.

**Version:** 2.1.00
**Dev server:** `npm run dev` → http://localhost:3000
**Build:** `npm run build` → static export to `out/`

---

## Testing Checklist

### 1. Dev Server Startup
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3000 loads the app
- [ ] No console errors on initial load

### 2. Desktop Layout (viewport > 900px)
- [ ] Left sidebar visible with nav items: Companies, Schedule, Pitch, Checklist
- [ ] Sidebar shows "EventIQ" branding, met count, progress bar
- [ ] Sidebar has keyboard shortcut hints section
- [ ] 3-column layout: Sidebar | Company List | Detail Panel
- [ ] ResizableHandle between list and detail panels — drag to resize
- [ ] "Select a company to view details" placeholder in right panel when nothing selected
- [ ] Sidebar collapses/expands properly

### 3. Company List (Left Panel)
- [ ] All 225 companies render in card view (default)
- [ ] Cards show: company name, type badge (SQO=red, Client=gold, ICP=green), contact names, icebreaker preview
- [ ] Color-coded left border on cards: SQO=red, Client=gold, ICP=green
- [ ] CLEAR badge shows on companies with `clear: true` (BriteCap, Spartan Capital, Fox Funding, Lendini, LCF Group, Credibly)
- [ ] Booth indicator dot on companies with booths
- [ ] Count text shows "225 of 225 companies"
- [ ] Clicking a card highlights it and opens detail in right panel

### 4. Filter Bar
- [ ] Toggle filters: All / SQO / Client / ICP / Met / CLEAR
- [ ] SQO filter shows 4 companies (Bitty, BriteCap, PIRS Capital, Wing Lake)
- [ ] Client filter shows 2 companies (Fundfi, FundKite)
- [ ] ICP filter shows 219 companies
- [ ] CLEAR filter shows 6 companies
- [ ] Met filter shows only companies marked as met (initially empty)
- [ ] Sort button cycles: Priority → Name → Type → Phase
- [ ] View toggle switches between cards and table view
- [ ] Count updates correctly when filtering

### 5. Table View
- [ ] Toggle to table view with the table icon button
- [ ] Columns: Company, Type, Contacts, News count, Met
- [ ] Clicking a row opens detail panel
- [ ] Met button in table toggles met status

### 6. Company Detail Panel (Right Panel on Desktop)
- [ ] Header: Company name, type badge, CLEAR badge, BOOTH badge
- [ ] "Mark Met" button toggles to "Met" state
- [ ] Contacts section: Shows leaders with LinkedIn links, title, background, hooks
- [ ] Icebreakers section: Shows first icebreaker, "Next icebreaker" button shuffles
- [ ] About section: Company description and internal notes
- [ ] Recent News section: News headlines with source and description
- [ ] Talking Points section: Bullet points for conversation
- [ ] The Ask section: Blue-highlighted ask prompt
- [ ] Your Notes section: Editable textarea that persists in localStorage
- [ ] All sections scroll within the panel via ScrollArea

### 7. Search / Command Palette (Cmd+K)
- [ ] Pressing Cmd+K (or Ctrl+K) opens command palette overlay
- [ ] Pressing "/" key also opens search
- [ ] Search bar at top of palette
- [ ] Typing filters companies by name AND contact names
- [ ] Results grouped by type (SQO, Client, ICP)
- [ ] Selecting a result opens the company detail
- [ ] Escape closes the palette
- [ ] Searching "Craig" should find Bitty (contact: Craig Hecker)
- [ ] Searching "Harvard" should NOT match (searches name/contacts only, not descriptions)

### 8. Rating Dialog
- [ ] Clicking "Mark Met" on an un-met company opens the rating dialog
- [ ] Dialog shows company name in title
- [ ] Temperature selection: Hot / Warm / Cold (color-coded)
- [ ] Follow-up actions: Schedule Demo / Send Email / Got Intro / No Action (multi-select)
- [ ] Capture fields: What they care about, What you promised, Personal detail
- [ ] "Save" persists rating data to localStorage
- [ ] "Skip" closes without saving rating but keeps met status
- [ ] Met badge updates to show rating (e.g., "MET·HOT")

### 9. Keyboard Navigation
- [ ] `j` or `ArrowDown` — move selection down in company list
- [ ] `k` or `ArrowUp` — move selection up
- [ ] `Enter` — open detail (on mobile opens Sheet)
- [ ] `Escape` — close detail/search/deselect
- [ ] `/` — focus search / open command palette
- [ ] `Cmd+K` — open command palette
- [ ] `m` — toggle met status on selected company
- [ ] Keys don't trigger when typing in an input/textarea

### 10. Schedule Tab
- [ ] Click "Schedule" in sidebar (desktop) or bottom nav (mobile)
- [ ] Official Event Program section with 3 sessions: Keynote, Panel, Tech Demo
- [ ] Each speaker row is clickable → jumps to that company in Companies tab
- [ ] Type badges (SQO/Client/ICP) on relevant speakers
- [ ] Booth Visit Plan with 5 phases (11AM–5PM)
- [ ] Phase items clickable → jumps to company
- [ ] Color-coded dots on phase items by company type

### 11. Pitch Tab
- [ ] Click "Pitch" in sidebar/nav
- [ ] 30-Second Pitch card with blue accent border
- [ ] HyperVerge keywords highlighted in blue (HyperVerge, 40 minutes to under 5, 450+, PIRS Capital)
- [ ] Value Propositions table (6 rows)
- [ ] Social Proof bullet list (4 items)
- [ ] Objection Responses: 5 expandable cards (click to toggle open/close)
- [ ] Demo Videos & Collateral: 7 items in 2-column grid with links
- [ ] Referral Map: 7 referral cards showing from→to connections

### 12. Checklist Tab
- [ ] 6 end-of-day checklist items with checkboxes
- [ ] Clicking toggles checkbox with strikethrough + dimming
- [ ] Completion counter updates (e.g., "3/6")
- [ ] Check state persists in localStorage across refreshes
- [ ] Quick Notes textarea — persists in localStorage
- [ ] "Copy All Notes to Clipboard" button — copies all met companies + notes + quick notes
- [ ] Toast notification appears on successful copy

### 13. Mobile Layout (viewport < 768px)
- [ ] Sidebar hidden, bottom tab nav visible (Companies, Schedule, Pitch, Checklist)
- [ ] Mobile header shows "EventIQ" + met count + search button
- [ ] Clicking search button opens command palette
- [ ] Company list fills screen with bottom padding for nav
- [ ] Clicking a company opens a Sheet (slides up from bottom, 85vh height)
- [ ] Sheet shows full company detail with close button
- [ ] All tabs (Schedule, Pitch, Checklist) render in single column
- [ ] Bottom nav highlights active tab

### 14. Data Persistence (localStorage)
- [ ] Mark a company as met → refresh page → still marked
- [ ] Add notes to a company → refresh → notes persist
- [ ] Rate a company → refresh → rating persists
- [ ] Check checklist items → refresh → still checked
- [ ] Quick notes → refresh → text persists
- [ ] LocalStorage keys: `eventiq_met`, `eventiq_ratings`, `eventiq_notes`, `eventiq_checks`, `eventiq_quick_notes`

### 15. PWA / Offline
- [ ] `public/manifest.json` exists with correct app metadata
- [ ] `public/sw.js` service worker exists
- [ ] Static build (`npm run build`) produces `out/` directory
- [ ] `out/index.html` contains full app + embedded company data

### 16. Data Integrity
- [ ] 225 companies total (4 SQO + 2 Client + 219 ICP)
- [ ] All companies have: id, name, type, priority, phase, contacts, desc, ice, tp, ask
- [ ] Leaders with LinkedIn links open in new tab
- [ ] News items have headline, source, description
- [ ] Icebreakers array present on all detailed companies (ids 1-22)

### 17. Visual / Theme
- [ ] Dark theme by default (dark background #0c0c12-ish)
- [ ] SQO = red/destructive accent
- [ ] Client = gold/amber accent
- [ ] ICP = green accent
- [ ] Primary/accent = blue (#5b8def-ish)
- [ ] Custom scrollbars (thin, dark)
- [ ] No white flash on load

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout, providers, PWA meta
│   ├── page.tsx            # Main app — state management, responsive layout
│   └── globals.css         # Dark theme, type colors, scrollbar
├── components/
│   ├── ui/                 # shadcn/ui primitives (18 components)
│   ├── app-sidebar.tsx     # Desktop sidebar navigation
│   ├── company-list.tsx    # Company list with filtering/sorting
│   ├── company-card.tsx    # Individual company card
│   ├── company-detail.tsx  # Detail panel (right side desktop, Sheet mobile)
│   ├── company-table.tsx   # Table view alternative
│   ├── search-command.tsx  # Cmd+K command palette
│   ├── filter-bar.tsx      # Filter toggles + sort + view switch
│   ├── rating-dialog.tsx   # Post-meeting rating modal
│   ├── mobile-nav.tsx      # Bottom tab navigation (mobile)
│   ├── pitch-tab.tsx       # HyperVerge pitch content
│   ├── schedule-tab.tsx    # Event schedule + booth plan
│   └── checklist-tab.tsx   # End-of-day checklist
├── data/
│   └── companies.json      # 225 companies (64 original + 161 researched)
├── hooks/
│   ├── use-keyboard.ts     # Keyboard shortcut handler
│   ├── use-local-storage.ts # Persistent state hook
│   └── use-mobile.ts       # Mobile breakpoint detection (shadcn)
└── lib/
    ├── types.ts            # TypeScript interfaces
    └── utils.ts            # cn() utility (shadcn)
```

## Key shadcn/ui Components
Sidebar, Card, Command, Sheet, Dialog, Tabs, Badge, ScrollArea, Resizable, ToggleGroup, Input, Tooltip, Sonner, Button, Toggle, Separator, Skeleton

## Data Flow
- All company data: `src/data/companies.json` → imported at build time
- User state (met/notes/ratings/checks): localStorage via `useLocalStorage` hook
- No backend/API — fully static, offline-capable
