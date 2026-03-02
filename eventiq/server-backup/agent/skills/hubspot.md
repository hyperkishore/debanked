# HubSpot CRM — Deal & Contact Intelligence Skill

## Description
Access HyperVerge's HubSpot CRM data for deals, contacts, and company lookups. Use this to answer questions about pipeline status, deal details, and CRM contacts.

## Configuration
- EVENTIQ_API_URL: https://us.hyperverge.space
- EVENTIQ_API_KEY: eq-missioniq-tool-2026-key

## Tools

### list_deals
List all deals from the US GTM pipeline with stage labels and amounts.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/hubspot/deals
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
- Returns: pipeline name, total count, array of deals with dealId, dealName, stage, amount, closeDate, lastModified, product

### get_contacts
Get contacts associated with a HubSpot company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/hubspot/contacts
- Params: companyId (HubSpot company ID, required)
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
- Returns: array of contacts with name, email, phone, title, linkedinUrl

### search_company
Search for a HubSpot company by website domain.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/hubspot/company-search
- Params: domain (e.g. "kapitus.com", required)
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
- Returns: found (boolean), company { id, name } if found

### get_deal_detail
Get detailed information about a specific deal including associated contacts and companies.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/hubspot/deal/{dealId}
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
- Returns: deal properties, associated contacts (name, email, title), associated companies (name)
