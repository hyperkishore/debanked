# PhantomBuster — Complete Integration Guide for EventIQ

Updated: 2026-02-27
Status: **LIVE** — API key configured, 9 agents created, validated end-to-end on Uplyft Capital

---

## 1) Current Setup

**API Key:** Configured in `eventiq/.env.local` as `PHANTOMBUSTER_API_KEY`
**Account:** 101 total agents, including 18 LinkedIn Outreach campaign workflows
**Plan limits:** Check via `GET /orgs/fetch-resources`

### Active Agents

| Agent | ID | Script | Status |
|-------|----|--------|--------|
| LinkedIn Search Export | 838622632619544 | LinkedIn Search Export.js | Working |
| Professional Email Finder | 8670599088931508 | Professional Email Finder.js | Working |
| LinkedIn Activity Extractor | 4809884505465873 | LinkedIn Activity Extractor.js | Working |
| Company Employees Export | 6954053187658116 | LinkedIn Company Employees Export.js | Working |
| Company Scraper | 1432983770785788 | LinkedIn Company Scraper.js | Working |
| Post Commenter & Liker Scraper | 6409876530287086 | LinkedIn Post Commenter and Liker Scraper.js | Blocked (workflow) |
| Profile Visitor | 2804590097428997 | LinkedIn Profile Viewer.js | Working |
| AI Profile Enricher | 6524671752088424 | AI LinkedIn Profile Enricher.js | Working |
| LinkedIn Profile Scraper | 791859282480955 | — | DELETED |

### LinkedIn Cookie Management

**Cookie:** `li_at` cookie from Chrome, decrypted via Chrome 145 format
**JSESSIONID:** `"ajax:0075598581418160660"` (for LinkedIn Voyager API Csrf-Token header)
**Verified as:** Kishore Natarajan, Co-Founder @ HyperVerge Inc.

Chrome 145 cookie encryption format: `v10(3 bytes) + nonce(16 bytes) + IV(16 bytes) + AES-128-CBC ciphertext`
Key derivation: PBKDF2-HMAC-SHA1, keychain password "Chrome Safe Storage", salt='saltysalt', 1003 iterations, 16-byte key

### Critical: `identities` Array Format

**All agents MUST use the `identities` array format.** Bare `sessionCookie` string does NOT work for newer Phantoms.

```json
{
  "identities": [{
    "identityId": "2537666466647976",
    "sessionCookie": "AQEDAQwI...",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  }],
  "sessionCookie": "AQEDAQwI..."
}
```

**Both fields required:** `identities` array for the Phantom engine + top-level `sessionCookie` for backward compatibility.

---

## 2) Complete API Reference

### Base URL & Auth
- Base: `https://api.phantombuster.com/api/v2`
- Header: `X-Phantombuster-Key: <api_key>`

### Core Endpoints

#### Agents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/agents/launch` | Launch agent with argument override |
| POST | `/agents/launch-sync` | Launch with real-time NDJSON streaming |
| POST | `/agents/launch-soon` | Schedule launch within N minutes |
| POST | `/agents/stop` | Terminate running agent |
| GET | `/agents/fetch?id={id}` | Get agent config (includes `orgS3Folder`, `s3Folder`) |
| GET | `/agents/fetch-all` | List all agents |
| GET | `/agents/fetch-output?id={id}` | Stream latest output with progress |
| POST | `/agents/save` | Create or update agent |
| POST | `/agents/delete` | Delete agent |

#### Containers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/containers/fetch?id={id}` | Get container metadata + output |
| GET | `/containers/fetch-all?agentId={id}` | List containers for agent |
| GET | `/containers/fetch-output?id={id}` | Get container output text |
| GET | `/containers/fetch-result-object?id={id}` | Get structured result data |

#### Org Storage — Leads & Lists
| Method | Path | Description |
|--------|------|-------------|
| POST | `/org-storage/leads/save` | Save a lead |
| POST | `/org-storage/leads/save-many` | Batch save leads |
| POST | `/org-storage/leads/by-list/{listId}` | Fetch leads by list |
| POST | `/org-storage/leads-objects/search` | Search leads with filters |
| GET | `/org-storage/lists/fetch-all` | List all lead lists |
| POST | `/org-storage/lists/save` | Create/update list |

#### Organizations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/orgs/fetch` | Org details (billing, proxies, CRM) |
| GET | `/orgs/fetch-resources` | Usage & limits (execution time, credits) |
| GET | `/orgs/fetch-running-containers` | Currently running containers |

### Result File Access
Results NOT returned in API body. Build S3 URL from agent fetch:
```
https://phantombuster.s3.amazonaws.com/{orgS3Folder}/{s3Folder}/result.csv
https://phantombuster.s3.amazonaws.com/{orgS3Folder}/{s3Folder}/result.json
```

### Key Constraints
1. **Workflows cannot be launched via API** — only individual Phantoms
2. Result files cannot be deleted via API
3. `argument` in launch **completely overrides** saved argument (no merge)
4. Agent ID must be string type in API calls

---

## 3) All Available Phantoms (130+ total)

### LinkedIn — Intelligence Gathering

| Phantom | What It Does | Daily Limit | Output Fields |
|---------|-------------|-------------|---------------|
| **Search Export** | Export profiles from search results | 1,000/search | Name, URL, headline, company + 13 fields |
| **Profile Scraper** | Full profile extraction | 1,500/day (750 with email) | 72+ fields including education, skills |
| **Company Scraper** | Company page data | 80/day (150 with Sales Nav) | Website, phone, industry, size + 15 fields |
| **Company Employees Export** | Employee list from company | 1,000/company (2,500 Sales Nav) | Name, title, URL, location |
| **Activity Extractor** | Posts/comments from profiles | Varies | Post URL, type, engagement + 19 fields |
| **Post Commenters Export** | Who commented on posts | Varies | Commenter profile data |
| **Post Likers Export** | Who liked posts | Varies | Liker profile data |
| **Event Guests Export** | Event attendees | 1,000/event (must join) | Profile URLs + 7 fields |
| **Group Members Export** | Group member extraction | Varies | Member profile data |
| **Job Scraper** | Job listing data | Varies | Titles, descriptions, companies |
| **Inbox Scraper** | Message/conversation data | Varies | Messages |
| **Connections Export** | 1st-degree connections | N/A | Name, URL |
| **Profile Follower Collector** | Profile followers | Varies | Follower data |

### LinkedIn — Engagement & Outreach

| Phantom | What It Does | Safe Daily Limit |
|---------|-------------|-----------------|
| **Profile Viewer** | View profiles (warm-up) | 150-300/day |
| **Auto Liker** | Like posts | 30-100/day |
| **Auto Commenter** | Comment on posts | 10-30/day |
| **Auto Follow** | Follow profiles | 20-50/day |
| **Auto Connect** | Send connection requests | 15-25/day, 60-100/week |
| **Message Sender** | DM 1st-degree connections | 40-80/day |
| **LinkedIn Outreach** | Multi-step sequence (connect + 3 follow-ups) | ~20 invites/day |
| **AI Message Writer** | Generate personalized messages | Uses AI credits |
| **AI Profile Enricher** | AI tone/role analysis | Uses AI credits |

### Sales Navigator

| Phantom | What It Does | Daily Limit |
|---------|-------------|-------------|
| **SN Search Export** | People search with advanced filters | 2,500/search |
| **SN Profile Scraper** | Detailed profiles via SN | 1,000/day |
| **SN List Export** | Export saved lead/account lists | 1,000/list |
| **SN Account Scraper** | Company details via SN | Varies |
| **SN Account Employees Export** | Employees via SN accounts | Varies |

### Other Platforms

| Platform | Phantoms | Key Limits |
|----------|----------|------------|
| **Twitter/X** | Profile Scraper, Follower/Following Collector, Tweet Extractor, Auto Follow, DM Sender, Search Export | 50-80 follows/day |
| **Instagram** | Follower Collector, Profile Scraper, Auto Follow, Hashtag Collector, Post Likers Export | ~40 follows/hour |
| **Facebook** | Group Members Export (4-5K/group), Profile Scraper (~5/hour), Page Likers Export | Strict limits |
| **Google Maps** | Search Export (120-200/search), Search to Contact Data | Region-by-region for scale |

### Enrichment & CRM

| Phantom | What It Does |
|---------|-------------|
| **Professional Email Finder** | Email from name + company (uses Dropcontact) |
| **Data Scraping Crawler** | General web scraper (emails, phones, social from any URL) |
| **HubSpot Contact Sender** | Push enriched data to HubSpot |
| **Salesforce CRM Enricher** | Push to Salesforce |
| **Pipedrive CRM Enricher** | Push to Pipedrive |

---

## 4) LinkedIn Safety Limits

### By Account Age
| Action | New (< 90 days) | Aged (90+ days) |
|--------|-----------------|-----------------|
| Connection requests | 10-15/day, 40-60/week | 15-25/day, 60-100/week |
| Messages | 20-40/day | 40-80/day |
| Profile views | 100-200/day | 150-300/day |

### Critical Rules
- Maintain 30%+ acceptance rate on connection requests
- Keep messages under 300-500 characters
- Space follow-ups 3-5 days apart
- Premium/Sales Nav do NOT raise weekly invitation limits
- Start new accounts at 15-20 daily actions, scale 10-20% weekly
- Schedule during business hours
- Monthly cleanup of pending connection requests

---

## 5) Integration Capabilities

### Webhooks
- Configure per-agent: Agent settings → Advanced → Webhook URL
- POST on completion with: `agentId`, `containerId`, `resultObject`, `exitCode`, `exitMessage`
- 11s timeout (5s connect + 5s headers + 1s body)
- Auto-disabled on 4xx errors

### CRM Integrations
| CRM | Direction | Phantom |
|-----|-----------|---------|
| **HubSpot** | Bidirectional | HubSpot Contact Sender, HubSpot Contact LinkedIn Outreach |
| **Salesforce** | One-way push | Salesforce CRM Enricher |
| **Pipedrive** | One-way push | Pipedrive CRM Enricher |

### External Automation
- **Zapier:** Triggers (new output, completion) + Actions (launch phantom)
- **Make (Integromat):** Visual workflow builder with PhantomBuster node
- **n8n:** HTTP node for API calls (workflows cannot be launched)
- **Google Sheets:** Direct input/output for all Phantoms

---

## 6) EventIQ-Specific Workflows

### A. Full Company Enrichment Pipeline (Proven on Uplyft Capital)

```
Step 1: Company Scraper → company details (location, phone, industry, size, growth, tenure)
Step 2: Company Employees Export → full org chart (26+ profiles)
Step 3: Activity Extractor → leader post history, engagement patterns
Step 4: AI Profile Enricher → tone of voice analysis, role classification
Step 5: Profile Visitor → warm-up notifications ("who viewed your profile")
Step 6: Professional Email Finder → verified business emails
```

### B. Pre-Meeting Intelligence Gathering

```
1. Activity Extractor on target person → recent posts, interests, conversation topics
2. Post Commenter & Liker Scraper → who engages with them (mutual connections?)
3. AI Profile Enricher → preferred communication tone
4. Profile Visitor → trigger "who viewed" notification before meeting
```

### C. Event Attendee Enrichment (DeBanked CONNECT)

```
1. Event Guests Export → attendee list from LinkedIn event page
2. Cross-reference with EventIQ dataset
3. Profile Scraper → enrich unknown attendees
4. AI Profile Enricher → prioritize by ICP fit
5. Profile Visitor + Auto Liker → pre-event warm-up
```

### D. Competitive Intelligence

```
1. Activity Extractor on competitor company pages → their content strategy
2. Post Commenters/Likers Export → identify prospects engaging with competitors
3. Company Employees Export → track competitor hiring/departures
4. Cross-reference with EventIQ TAM list
```

### E. Signal Monitoring (Weekly Cron)

```
1. Sales Nav Search → "Changed jobs in past 90 days" filter
2. Cross-reference with EventIQ leaders
3. Flag job changes for immediate outreach
4. Activity Extractor on company pages → detect announcements
```

### F. Warm-Up Sequence Before Outreach

```
Week 1: Profile Visitor (Day 1) → Auto Follow (Day 2) → Auto Liker x2-3 posts (Days 3-4) → Auto Comment x1 (Day 5)
Week 2: Auto Connect with personalized note (Day 8) → Value message on accept (Day 11) → Content share (Day 16) → Meeting ask (Day 23)
```

---

## 7) Lessons Learned from Uplyft Capital Enrichment

### What Worked
1. **Company Scraper** provided critical business intelligence (growth trends, dept distribution, avg tenure, phone number)
2. **Company Employees Export** found 26 employees across 5 pages — full org chart
3. **Activity Extractor** revealed that Michael Massa is LinkedIn-dormant (last post Jan 2020) — crucial for outreach channel selection
4. **AI Profile Enricher** provided actionable tone-of-voice guidance for personalized messaging
5. **Profile Visitor** successfully triggered "who viewed" notifications on all 4 targets
6. **Email Finder** found verified emails for Brian Scott and Eric Kigathi

### What Failed / Issues
1. **Bare `sessionCookie` doesn't work** — must use `identities` array with `identityId` + `userAgent`
2. **Workflow-linked agents can't be API-launched** — Post Commenter & Liker Scraper was blocked because it was part of a stopped workflow
3. **`argument` at launch completely overrides saved config** — must pass ALL required fields, not just the ones you want to change
4. **William Acuna was wrong company** — "UpLyft" (medical devices) vs "Uplyft Capital" (MCA funder). LinkedIn name matching is unreliable for similar company names.
5. **LinkedIn Search Export returns 0 for niche companies** — small companies like Uplyft Capital don't appear in keyword searches. Use Company Employees Export with direct company URL instead.
6. **Org storage 100K leads limit** — Email Finder can hit storage limits. Use CSV/Google Sheet input as workaround.

### Data Quality Notes
- LinkedIn "Founded" year (2010) differs from founder's profile (Aug 2012) — always cross-reference
- Brian Scott has only 6 LinkedIn connections — his LinkedIn profile has old recruitment firm copy, not Uplyft content
- Eric Kigathi has parallel advisory roles (AfroForm Global, encaptiv) — may indicate he's not full-time at Uplyft

---

## 8) Account Limits & Pricing

| Feature | Start ($69/mo) | Grow ($159/mo) | Scale ($439/mo) |
|---------|----------------|----------------|-----------------|
| Execution Time | 20 hrs/mo | 80 hrs/mo | 300 hrs/mo |
| Concurrent Slots | 5 | 15 | 50 |
| AI Credits | 10K/mo | 30K/mo | 90K/mo |
| Email Credits | 500/mo | 2,500/mo | 10K/mo |
| Storage | 1 GB | 10 GB | 50 GB |
| LinkedIn Accounts | Up to 100 | Up to 100 | Up to 100 |

---

## 9) Creating New Agents via API

```bash
curl -X POST https://api.phantombuster.com/api/v2/agents/save \
  -H "X-Phantombuster-Key: $PHANTOMBUSTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "org": "phantombuster",
    "script": "LinkedIn Company Employees Export.js",
    "name": "My Company Export Agent",
    "argument": {
      "numberOfResultsPerCompany": 1000,
      "companies": ["https://www.linkedin.com/company/example/"],
      "identities": [{
        "identityId": "2537666466647976",
        "sessionCookie": "...",
        "userAgent": "Mozilla/5.0 ..."
      }],
      "sessionCookie": "..."
    }
  }'
```

**Key:** `"org": "phantombuster"` is required. Use exact script filename from PhantomBuster's library.

---

## Sources

- [PhantomBuster API Docs](https://hub.phantombuster.com/docs/api)
- [LinkedIn Safe Limits 2026](https://phantombuster.com/blog/linkedin-automation/linkedin-automation-safe-limits-2026/)
- [PhantomBuster Pricing](https://phantombuster.com/blog/ai-automation/phantombuster-pricing-explained/)
- [PhantomBuster Integrations](https://phantombuster.com/blog/ai-automation/phantombuster-integrations/)
- [ABM Automation](https://phantombuster.com/blog/ai-automation/abm-automation-with-phantombuster/)
- [Webhook Configuration](https://hub.phantombuster.com/docs/using-webhooks)
- [Result Files via API](https://support.phantombuster.com/hc/en-us/articles/23117755693458)
