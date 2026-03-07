# Deploy Personal Research Cron to EC2

## Files to Copy

Copy the new module to the EC2 worker:

```bash
scp -i ~/.ssh/kiket-server.pem \
  research-worker/lib/personal-research.js \
  ubuntu@3.128.145.44:~/research-worker/lib/personal-research.js
```

## Environment Variables Required

Add these to the EC2 worker environment (in `~/research-worker/.env` or PM2 ecosystem config):

```
BRAVE_SEARCH_API_KEY=<your-brave-search-api-key>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

The worker should already have `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_KEY`.

## Add Cron Schedule to worker.js

SSH into EC2 and edit `~/research-worker/worker.js`. Add the import at the top with the other lib imports:

```javascript
import { runPersonalResearch } from './lib/personal-research.js';
```

Add the cron schedule alongside the existing ones (LinkedIn activity at 6AM, digest at 8AM, company intel on Sunday 2AM):

```javascript
// Personal research — daily at 5:30 AM UTC (before LinkedIn activity at 6 AM)
cron.schedule('30 5 * * *', async () => {
  console.log(`[cron] Personal research started at ${new Date().toISOString()}`);
  try {
    const stats = await runPersonalResearch();
    console.log(`[cron] Personal research complete:`, stats);
  } catch (err) {
    console.error(`[cron] Personal research failed:`, err);
  }
});
```

## Restart the Worker

```bash
ssh -i ~/.ssh/kiket-server.pem ubuntu@3.128.145.44
source ~/.nvm/nvm.sh
cd ~/research-worker
pm2 restart research-worker
pm2 logs research-worker --lines 20
```

## Manual Test

To test the module before enabling the cron:

```bash
ssh -i ~/.ssh/kiket-server.pem ubuntu@3.128.145.44
source ~/.nvm/nvm.sh
cd ~/research-worker
node lib/personal-research.js
```

This will process up to 8 leaders and print progress to stdout.

## How It Works

1. Queries Supabase for P0/P1/P2 companies with leaders missing a `personal` field
2. Processes 8 leaders per run (P0 first, then P1, then P2)
3. For each leader, runs 3 Brave Search queries for personal info (interviews, hobbies, origin story)
4. Sends search snippets to Claude Haiku to extract personal facts
5. Updates the leader's `personal` field and prepends new personal hooks
6. Logs every action to `enrichment_log` table (visible in the enrichment feed)

## API Costs Per Run

- Brave Search: 3 queries x 8 leaders = 24 queries/day (free tier allows 2,000/month)
- Claude Haiku: ~8 calls/day, ~500 tokens each = ~4,000 tokens/day (~$0.01/day)

## Brave Search API Key

Get a free API key at https://brave.com/search/api/ (free tier: 2,000 queries/month).
