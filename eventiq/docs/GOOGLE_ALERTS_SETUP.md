# Google Alerts & News Ingestion Setup

Comprehensive guide to EventIQ's news signal ingestion pipelines, covering Google News RSS, Google Alerts RSS, deBanked RSS, Bing News API, and signal classification.

---

## 1. Overview

EventIQ runs three cron-based news ingestion pipelines to keep company intelligence fresh:

| Pipeline | Route | Schedule | What it does |
|----------|-------|----------|--------------|
| **ingest-signals** | `/api/cron/ingest-signals` | Daily 8 AM UTC | Primary pipeline. Runs Google News per-company searches for P0/P1, batch keyword searches for TAM coverage, deBanked RSS |
| **news-ingest** | `/api/cron/news-ingest` | Daily 9 AM UTC | Secondary pipeline. Reads Google Alert RSS feed(s) + deBanked RSS, uses fuzzy company matching |
| **research-refresh** | `/api/cron/research-refresh` | Weekly Monday 6 AM UTC | Finds stale P0-P2 companies (no news in 30 days), refreshes via Google News |

### Data Flow

```
                                ┌─────────────────────┐
                                │   Google News RSS    │
                                │ (per-company search) │
                                └──────────┬──────────┘
                                           │
┌─────────────────────┐         ┌──────────▼──────────┐
│  Google Alert RSS   │────────►│                     │
│  (industry alerts)  │         │    Fetch & Parse    │
└─────────────────────┘         │                     │
                                │    Match companies  │
┌─────────────────────┐         │    (fuzzy matching) │
│   deBanked RSS      │────────►│                     │
│ (debanked.com/feed) │         │   Classify signal   │
└─────────────────────┘         │   type + heat       │
                                │                     │
┌─────────────────────┐         │   Dedupe & upsert   │
│   Bing News API     │────────►│                     │
│   (optional)        │         └──────────┬──────────┘
└─────────────────────┘                    │
                                ┌──────────▼──────────┐
                                │   company_news      │
                                │   (Supabase table)  │
                                └──────────┬──────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐
                   │  Feed Tab   │  │  Command    │  │  Morning    │
                   │  (per co.)  │  │  Center     │  │  Briefings  │
                   └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. Google News RSS (Active)

**Used by:** `ingest-signals` pipeline (daily 8 AM UTC)

Uses the free Google News RSS endpoint — no API key required.

**Endpoint:** `https://news.google.com/rss/search?q=<query>&hl=en-US&gl=US&ceid=US:en`

### How it works

**P0/P1 companies** (priority <= 2) get individual name searches:
- Each company name is searched as a separate query
- Returns the 10 most recent results per company
- Rate limited: concurrency 5, 100ms delay between spawns

**TAM coverage** uses 6 hardcoded batch keyword searches:

| # | Keyword | Coverage |
|---|---------|----------|
| 1 | `MCA merchant cash advance funding` | Core MCA vertical |
| 2 | `small business lending fintech` | Broad SMB lending |
| 3 | `equipment finance leasing` | Equipment sub-vertical |
| 4 | `SBA lending 7a loan` | SBA sub-vertical |
| 5 | `factoring invoice financing` | Factoring sub-vertical |
| 6 | `revenue based financing` | RBF sub-vertical |

Each keyword query returns up to 10 results. Results are matched against all company names in the dataset.

**Code:** `src/lib/signal-ingest.ts` (lines 118-125 for batch keywords)

---

## 3. Google Alerts RSS Setup Guide

**Used by:** `news-ingest` pipeline (daily 9 AM UTC)

Google Alerts provides free, automated monitoring for specific keywords. Each alert can produce an RSS feed that EventIQ reads daily.

### Step-by-step setup

1. Go to [https://www.google.com/alerts](https://www.google.com/alerts)
2. Enter a keyword (e.g., `"merchant cash advance"`)
3. Click **"Show options"** to expand settings
4. Set **"Deliver to"** to **RSS feed** (default is email — you must change this)
5. Optionally adjust:
   - **How often:** As-it-happens (recommended) or Once a day
   - **Sources:** Automatic (recommended) or specific source types
   - **Language:** English
   - **Region:** United States (or your target market)
   - **How many:** All results (recommended) or Only the best results
6. Click **"Create Alert"**
7. Copy the RSS feed URL — it starts with `https://www.google.com/alerts/feeds/...`
8. Repeat for each keyword you want to monitor
9. Set all feed URLs in Vercel as the `GOOGLE_ALERT_RSS_URLS` environment variable (comma-separated)

### Recommended alert keywords

| Alert Keyword | Rationale |
|---|---|
| `"merchant cash advance"` | Core MCA vertical |
| `"small business lending" OR "SMB lending"` | Broad industry coverage |
| `"equipment finance" OR "equipment leasing"` | Equipment sub-vertical |
| `"SBA loan" OR "SBA lender"` | SBA sub-vertical |
| `"invoice factoring"` | Factoring sub-vertical |
| `"revenue based financing"` | RBF sub-vertical |
| `"fintech lending" OR "alternative lending"` | Industry trends |
| `"underwriting automation" OR "lending technology"` | Competitive landscape |

### Setting the environment variable

```bash
# Single feed
npx vercel env add GOOGLE_ALERT_RSS_URLS production --scope hv-one
# Paste the feed URL when prompted

# Multiple feeds (comma-separated, no spaces around commas)
# https://www.google.com/alerts/feeds/abc123,https://www.google.com/alerts/feeds/def456
```

The `news-ingest` pipeline reads all configured feeds in parallel, merges the articles, and matches them against your company dataset.

**Backward compatibility:** The code also checks the old `GOOGLE_ALERT_RSS_URL` (singular) env var name. If you have the old name set, it will still work.

---

## 4. deBanked RSS (Active, no setup needed)

**Used by:** Both `ingest-signals` and `news-ingest` pipelines

**URL:** `https://debanked.com/feed/` (hardcoded, no configuration needed)

deBanked is the primary industry publication covering merchant cash advance, small business lending, and alternative finance. Their RSS feed is fetched daily by both pipelines.

- `ingest-signals`: Fetches deBanked RSS and matches all company names against article text
- `news-ingest`: Fetches the 30 most recent articles and runs fuzzy company matching

No environment variables or setup required — this source is always active.

---

## 5. Bing News API (Optional)

**Used by:** `ingest-signals` pipeline (when configured)

Provides additional news coverage beyond Google News. Uses Microsoft's Bing News Search API.

**Env var:** `BING_NEWS_API_KEY`

### Setup

1. Create a free Azure account at [https://portal.azure.com](https://portal.azure.com)
2. Create a Bing Search v7 resource
3. Copy the API key from the resource's Keys section
4. Set in Vercel: `BING_NEWS_API_KEY`

**Free tier:** 1,000 queries per month (3 queries/day is sufficient for P0/P1 companies)

When configured, the `ingest-signals` pipeline runs Bing News searches alongside Google News for all P0/P1 companies (same concurrency and rate limiting).

---

## 6. Signal Classification Reference

Every ingested article is classified by **signal type** and **heat level**.

### Signal Type Classification

Articles are classified using regex pattern matching against the combined headline + description text (case-insensitive):

| Type | Keywords (regex patterns) |
|---|---|
| **funding** | `securitiz`, `ABS`, `credit facilit`, `funding round`, `raise`, `series [a-f]`, `warehouse`, `capital`, `million`, `billion`, `$` + digit |
| **partnership** | `partner`, `integrat`, `collaborat`, `alliance`, `joined`, `embedded`, `API` |
| **product** | `launch`, `new product`, `new feature`, `platform`, `tool`, `service`, `division` |
| **hiring** | `hire`, `appoint`, `CEO`, `CRO`, `CISO`, `CMO`, `chief`, `new leadership`, `new head` |
| **regulatory** | `regulat`, `compliance`, `law`, `bill`, `act`, `FDA`, `FCC`, `FDIC`, `SBA`, `FTC`, `settlement` |
| **milestone** | `milestone`, `surpass`, `record`, `award`, `ranked`, `best`, `fastest` |
| **general** | Everything that does not match the above patterns |

Classification is first-match: if an article matches multiple types, the first match in the order above wins.

**Code:** `classifySignalType()` in both `src/app/api/cron/news-ingest/route.ts` and `src/lib/signal-ingest.ts`

### Heat Classification

Heat indicates how actionable a signal is for sales/BD teams:

| Heat | Criteria |
|---|---|
| **hot** | SQO/Client companies (any article), OR ICP companies with recent articles, OR recent articles with high-signal keywords (`securitiz`, `ABS`, `million`, `billion`, `launch`, `ai`, `patent`) |
| **warm** | Recent articles (within 7 days for `news-ingest`, within 180 days for `ingest-signals`) for lower-priority companies |
| **cool** | Everything else |

**Note:** The two pipelines have slightly different heat logic:
- `news-ingest` (`classifyHeat`): Uses priority <= 2 as hot, priority <= 4 + recent as warm
- `ingest-signals` (`classifySignalHeat`): Uses company type (SQO/Client/ICP) and keyword matching for more nuanced classification

---

## 7. Company Matching Logic

When articles are ingested, they must be matched to companies in the dataset. The `news-ingest` pipeline uses fuzzy matching; the `ingest-signals` pipeline uses exact matching from Google News search results.

### Normalization (`news-matcher.ts`)

1. Convert to lowercase
2. Strip common suffixes: `inc`, `llc`, `corp`, `ltd`, `co`, `group`, `holdings`, `capital`, `financial`, `services`, `lending`
3. Remove punctuation: `.,'"!?()`
4. Collapse whitespace

### Matching rules

- **Minimum length:** 4 characters after normalization (shorter names are skipped to avoid false positives)
- **Two-pass matching:**
  1. **Normalized substring match:** Check if normalized company name appears anywhere in normalized article text
  2. **Case-insensitive original name match:** For names 5+ characters, check if the original company name (lowercased) appears in the article text

### Match results

- An article can match multiple companies (e.g., an article about a partnership between two companies in the dataset)
- Matches are sorted by priority (lower priority number = more important)
- Each match produces a separate `company_news` row

**Code:** `src/lib/news-matcher.ts`

---

## 8. Managing Keywords

### Batch keywords (ingest-signals pipeline)

The 6 batch keywords are hardcoded in `src/lib/signal-ingest.ts` (lines 118-125):

```typescript
const batchKeywords = [
  "MCA merchant cash advance funding",
  "small business lending fintech",
  "equipment finance leasing",
  "SBA lending 7a loan",
  "factoring invoice financing",
  "revenue based financing",
];
```

To change these keywords: edit the array in `signal-ingest.ts` and redeploy.

### Google Alert RSS feeds (news-ingest pipeline)

Configured via the `GOOGLE_ALERT_RSS_URLS` environment variable:
- Comma-separated list of Google Alert RSS feed URLs
- Each URL starts with `https://www.google.com/alerts/feeds/...`
- Add/remove feeds by updating the env var in Vercel

```bash
# View current value
npx vercel env ls --scope hv-one

# Update (will prompt for new value)
npx vercel env rm GOOGLE_ALERT_RSS_URLS production --scope hv-one
npx vercel env add GOOGLE_ALERT_RSS_URLS production --scope hv-one
```

### deBanked RSS

Hardcoded URL: `https://debanked.com/feed/`. No configuration needed or possible.

---

## 9. Environment Variables

| Env Var | Required | Description |
|---|---|---|
| `CRON_SECRET` | Yes | Vercel cron authentication token. Set automatically by Vercel for cron jobs, but must also be set manually if calling endpoints directly. |
| `GOOGLE_ALERT_RSS_URLS` | No | Comma-separated Google Alert RSS feed URLs. Create alerts at https://www.google.com/alerts with "Deliver to: RSS feed". See Section 3 for setup. |
| `GOOGLE_ALERT_RSS_URL` | No | Legacy singular form (backward compatible). Use `GOOGLE_ALERT_RSS_URLS` for new setups. |
| `BING_NEWS_API_KEY` | No | Bing News Search API key. Free tier provides 1,000 queries/month. See Section 5 for setup. |

All env vars are set in Vercel:
```bash
npx vercel env add <VAR_NAME> production --scope hv-one
```

---

## 10. Troubleshooting

### Check ingestion history

Query the `signal_ingestion_log` table in Supabase to see run history:

```sql
SELECT * FROM signal_ingestion_log
ORDER BY created_at DESC
LIMIT 20;
```

Each row shows: source, companies searched, signals found, signals new, duration.

### Test a Google Alert RSS URL

```bash
# Should return valid XML with <entry> elements
curl -s "https://www.google.com/alerts/feeds/YOUR_FEED_ID" | head -50
```

If the response is empty or returns an error page, the alert may have been deleted or the URL is malformed.

### Manually trigger a pipeline

```bash
# news-ingest pipeline
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://us.hyperverge.space/api/cron/news-ingest

# ingest-signals pipeline
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://us.hyperverge.space/api/cron/ingest-signals

# research-refresh pipeline
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://us.hyperverge.space/api/cron/research-refresh
```

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| No articles from Google Alerts | Feed URL not set or invalid | Check `GOOGLE_ALERT_RSS_URLS` env var. Test the URL with curl. |
| Empty Google Alert feed | Keyword too narrow, or alert too new | Wait 24-48 hours for Google to index. Broaden the keyword. |
| Too many false positives | Company names too short or generic (e.g., "ACE", "One") | Names < 4 chars are already skipped. For generic names, consider adding them to an exclusion list. |
| Stale data / no new signals | Cron not running | Check Vercel cron logs. Verify `CRON_SECRET` is set. Check `vercel.json` has the cron schedule. |
| Duplicate articles | Same article matched by multiple pipelines | Deduplication is handled by the `company_id,headline` unique constraint on `company_news`. Duplicates are silently ignored. |
| Google News rate limited | Too many concurrent requests | The pipeline uses concurrency 5 with 100ms delay. If you hit limits, reduce concurrency in `signal-ingest.ts`. |
| Bing News not working | API key missing or expired | Check `BING_NEWS_API_KEY` env var. Verify the Azure resource is active and has remaining quota. |
| `news-ingest` returns 401 | Missing or wrong cron secret | Ensure `CRON_SECRET` env var matches the `Authorization: Bearer` header. |
