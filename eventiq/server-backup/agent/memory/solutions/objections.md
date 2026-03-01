# Technical Objections & Responses

### "We need on-premise deployment"
→ Understand the requirement. Usually driven by compliance, not technical need. Our dedicated instance option gives isolation without on-prem overhead. Which compliance framework are you working with?

### "How do you handle PII?"
→ Data encrypted in transit (TLS 1.3) and at rest (AES-256). Documents can be auto-deleted after processing. We're SOC 2 Type II certified. Happy to walk through our security whitepaper.

### "What's your accuracy rate?"
→ 99%+ on bank statement parsing, 99.5%+ on ID verification. We can run a benchmark on your actual documents — usually takes 2-3 days.

### "How long does integration take?"
→ API integration: 1-2 weeks for basic, 3-4 weeks for full workflow. We provide SDKs, sandbox environment, and dedicated integration support.

### "Can you handle [obscure document type]?"
→ We support 100+ document types out of the box. For specialized documents, our team can train custom models — typically 2-4 weeks with sample data.
