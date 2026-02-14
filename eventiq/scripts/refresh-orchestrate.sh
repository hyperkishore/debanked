#!/bin/bash
#
# Refresh Orchestrator
#
# End-to-end news refresh: prepare batches → run agents → merge → close issue.
#
# Usage:
#   bash eventiq/scripts/refresh-orchestrate.sh P0          # Refresh P0 companies
#   bash eventiq/scripts/refresh-orchestrate.sh P0 42       # Refresh P0 + close issue #42
#   bash eventiq/scripts/refresh-orchestrate.sh all          # Refresh all companies
#
# This script:
# 1. Runs refresh.js to prepare batch files
# 2. Outputs instructions for Claude Code to spawn research agents
# 3. Waits for all refresh-result-*.json files
# 4. Runs merge-enrichment.js to integrate results
# 5. Optionally closes the triggering GitHub issue
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="hyperkishore/debanked"
AGENT_COUNT=5

PRIORITY="${1:-P0}"
ISSUE_NUM="${2:-}"

echo ""
echo "========================================"
echo "[orchestrate] News Refresh — $PRIORITY"
echo "[orchestrate] $(date)"
echo "========================================"
echo ""

# Step 1: Clean up old batch/result files
echo "[orchestrate] Step 1: Cleaning old files..."
rm -f "$SCRIPT_DIR"/refresh-batch-*.json
rm -f "$SCRIPT_DIR"/refresh-result-*.json

# Step 2: Generate batch files
echo "[orchestrate] Step 2: Generating batches..."
if [ "$PRIORITY" = "all" ]; then
  node "$SCRIPT_DIR/refresh.js" --all
else
  node "$SCRIPT_DIR/refresh.js" --priority "$PRIORITY"
fi

# Count how many batch files were created
BATCH_COUNT=$(ls "$SCRIPT_DIR"/refresh-batch-*.json 2>/dev/null | wc -l | tr -d ' ')

if [ "$BATCH_COUNT" -eq "0" ]; then
  echo "[orchestrate] No companies to refresh. Exiting."
  if [ -n "$ISSUE_NUM" ]; then
    gh issue close "$ISSUE_NUM" --repo "$REPO" --comment "No companies matched for $PRIORITY refresh." 2>/dev/null || true
  fi
  exit 0
fi

echo ""
echo "[orchestrate] Step 3: $BATCH_COUNT batch files ready."
echo "[orchestrate] Claude Code should now spawn $BATCH_COUNT agents with this prompt:"
echo ""
echo "─────────────────────────────────────────"
for i in $(seq 1 "$BATCH_COUNT"); do
  COMPANY_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/refresh-batch-$i.json','utf-8')).length)")
  echo "  Agent $i ($COMPANY_COUNT companies):"
  echo "    Input:  $SCRIPT_DIR/refresh-batch-$i.json"
  echo "    Output: $SCRIPT_DIR/refresh-result-$i.json"
done
echo "─────────────────────────────────────────"
echo ""
echo "  Agent prompt: For each company in refresh-batch-N.json, search the web for:"
echo "    - Latest news (2-3 headlines with source)"
echo "    - Missing LinkedIn URLs for leaders"
echo "    - Conversation hooks for each leader (2-3 per person)"
echo "  Write results to refresh-result-N.json as JSON array."
echo ""

# Step 4: Wait for result files
echo "[orchestrate] Step 4: Waiting for $BATCH_COUNT result files..."
echo "[orchestrate] Checking every 30 seconds..."

TIMEOUT=3600  # 1 hour max
ELAPSED=0

while true; do
  RESULT_COUNT=$(ls "$SCRIPT_DIR"/refresh-result-*.json 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RESULT_COUNT" -ge "$BATCH_COUNT" ]; then
    echo "[orchestrate] All $BATCH_COUNT result files found!"
    break
  fi

  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "[orchestrate] TIMEOUT: Only $RESULT_COUNT of $BATCH_COUNT results after ${TIMEOUT}s."
    echo "[orchestrate] Proceeding with available results..."
    break
  fi

  sleep 30
  ELAPSED=$((ELAPSED + 30))

  # Progress update every 2 minutes
  if [ $((ELAPSED % 120)) -eq 0 ]; then
    echo "[orchestrate] ... $RESULT_COUNT of $BATCH_COUNT results (${ELAPSED}s elapsed)"
  fi
done

# Step 5: Merge results
RESULT_FILES=$(ls "$SCRIPT_DIR"/refresh-result-*.json 2>/dev/null)
if [ -z "$RESULT_FILES" ]; then
  echo "[orchestrate] No result files found. Nothing to merge."
  if [ -n "$ISSUE_NUM" ]; then
    gh issue close "$ISSUE_NUM" --repo "$REPO" --comment "Refresh failed: no agent results produced." 2>/dev/null || true
  fi
  exit 1
fi

echo ""
echo "[orchestrate] Step 5: Merging results..."
node "$SCRIPT_DIR/merge-enrichment.js" $RESULT_FILES

# Step 6: Build verification
echo ""
echo "[orchestrate] Step 6: Verifying build..."
cd "$PROJECT_DIR"
if npm run build > /dev/null 2>&1; then
  echo "[orchestrate] Build passed!"
else
  echo "[orchestrate] WARNING: Build failed after merge. Check for errors."
fi

# Step 7: Close GitHub issue
if [ -n "$ISSUE_NUM" ]; then
  echo ""
  echo "[orchestrate] Step 7: Closing issue #$ISSUE_NUM..."
  MERGE_STATS=$(node -e "
    const d = JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/../src/data/all-companies.json','utf-8'));
    const researched = d.filter(c => c.desc && c.desc.length > 0).length;
    const withHooks = d.reduce((s,c) => s + ((c.leaders||[]).filter(l=>l.hooks&&l.hooks.length>0).length), 0);
    const totalLeaders = d.reduce((s,c) => s + (c.leaders||[]).length, 0);
    console.log(JSON.stringify({total:d.length,researched,withHooks,totalLeaders}));
  ")

  gh issue close "$ISSUE_NUM" --repo "$REPO" --comment "$(cat << COMMENT
Refresh complete for **$PRIORITY** companies.

**Stats after merge:**
$(echo "$MERGE_STATS" | node -e "
  const s = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  console.log('- Total companies: ' + s.total);
  console.log('- Researched: ' + s.researched);
  console.log('- Leaders with hooks: ' + s.withHooks + '/' + s.totalLeaders);
")

Triggered by: $(date -u +%Y-%m-%dT%H:%M:%SZ)
COMMENT
  )" 2>/dev/null || echo "[orchestrate] Could not close issue (gh not authenticated?)"
fi

# Cleanup
rm -f "$SCRIPT_DIR"/refresh-batch-*.json
rm -f /tmp/eventiq-refresh-signal.json

echo ""
echo "========================================"
echo "[orchestrate] Refresh complete!"
echo "========================================"
