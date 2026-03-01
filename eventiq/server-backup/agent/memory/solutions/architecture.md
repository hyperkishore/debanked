# Solution Architecture

## Integration Patterns

### API Integration (Most Common)
- REST API with webhook callbacks
- Client sends document → HyperVerge processes → returns structured data
- Typical flow: Upload → Extract → Verify → Score → Decision

### LOS/CRM Integration
- Embed in existing loan origination system
- Salesforce, HubSpot, custom LOS connectors
- Iframe or API-based embedding

### Batch Processing
- Bulk document processing for portfolio analysis
- CSV upload → async processing → results download

## Deployment Models
- **Cloud (SaaS)** — Standard, fastest deployment
- **Dedicated instance** — For compliance-sensitive customers
- **On-premise** — Rare, only for regulated banks

## Common Technical Requirements
- SOC 2 Type II compliance
- Data encryption at rest and in transit
- PII handling and retention policies
- SLA: 99.9% uptime, <1s response time
