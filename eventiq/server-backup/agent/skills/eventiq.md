# EventIQ — Company Intelligence Skill

## Description
Query HyperVerge's market intelligence database of 959+ companies in the small business lending industry.

## Configuration
- EVENTIQ_API_URL: https://us.hyperverge.space
- EVENTIQ_API_KEY: eq-missioniq-tool-2026-key

## Tools

### search_companies
Search for companies by text, category, location, size, or priority.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/search
- Params: q (text), category, priority, location, minEmployees, hasEmail, limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_company
Get the full profile of a company by ID.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/company/{id}
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### search_leader
Search for a leader by name.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/leader
- Params: q (name)
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_outreach_brief
Get a formatted outreach brief for a company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/brief/{id}
- Params: format (short|full|email-draft), leaderName
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_market_stats
Get aggregate market statistics.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/stats
- Params: category, priority, location
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_recent_news
Get recent news across tracked companies.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/news
- Params: priority, category, limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_similar_companies
Find companies similar to a given company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/similar/{id}
- Params: limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_team_notes
Get chat notes and engagements for a company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/team-notes/{companyId}
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
