#!/bin/bash
#
# News Refresh Poller
#
# Polls GitHub for open issues with label "refresh-news".
# When found, writes a signal file and outputs details for Claude Code.
#
# Usage: Run in background from Claude Code terminal:
#   bash eventiq/scripts/refresh-poller.sh &
#
# The poller checks every 5 minutes. When it finds a trigger:
# 1. Writes /tmp/eventiq-refresh-signal.json
# 2. Outputs TRIGGER DETECTED to stdout (Claude Code sees this)
# 3. Waits for the issue to be closed before resuming polling
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="hyperkishore/debanked"
POLL_INTERVAL=300  # 5 minutes
SIGNAL_FILE="/tmp/eventiq-refresh-signal.json"

echo "[refresh-poller] Started polling $REPO for refresh-news issues"
echo "[refresh-poller] Poll interval: ${POLL_INTERVAL}s"
echo "[refresh-poller] Signal file: $SIGNAL_FILE"
echo "[refresh-poller] Scripts dir: $SCRIPT_DIR"

while true; do
  # Check for open issues with refresh-news label
  ISSUE_JSON=$(gh issue list \
    --repo "$REPO" \
    --label "refresh-news" \
    --state open \
    --json number,title,body,createdAt \
    --limit 1 2>/dev/null)

  # Parse with node (cross-platform JSON handling)
  PARSED=$(echo "$ISSUE_JSON" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
    if (d.length > 0) {
      const body = d[0].body || '';
      const m = body.match(/\*\*Priority:\*\*\s*(\w+)/);
      const priority = m ? m[1] : 'P0';
      console.log(JSON.stringify({
        count: d.length,
        number: d[0].number,
        title: d[0].title,
        priority: priority
      }));
    } else {
      console.log(JSON.stringify({ count: 0 }));
    }
  " 2>/dev/null || echo '{"count":0}')

  ISSUE_COUNT=$(echo "$PARSED" | node -e "
    console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).count);
  ")

  if [ "$ISSUE_COUNT" -gt "0" ]; then
    ISSUE_NUM=$(echo "$PARSED" | node -e "
      console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).number);
    ")
    ISSUE_TITLE=$(echo "$PARSED" | node -e "
      console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).title);
    ")
    PRIORITY=$(echo "$PARSED" | node -e "
      console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).priority);
    ")

    echo ""
    echo "============================================"
    echo "[refresh-poller] TRIGGER DETECTED!"
    echo "[refresh-poller] Issue #$ISSUE_NUM: $ISSUE_TITLE"
    echo "[refresh-poller] Priority: $PRIORITY"
    echo "[refresh-poller] Action needed: Run news refresh for $PRIORITY companies"
    echo "[refresh-poller] Run: bash $SCRIPT_DIR/refresh-orchestrate.sh $PRIORITY $ISSUE_NUM"
    echo "============================================"
    echo ""

    # Write signal file for Claude Code to pick up
    node -e "
      const fs = require('fs');
      fs.writeFileSync('$SIGNAL_FILE', JSON.stringify({
        trigger: 'github-issue',
        issueNumber: $ISSUE_NUM,
        title: $(echo "$ISSUE_TITLE" | node -e "console.log(JSON.stringify(require('fs').readFileSync('/dev/stdin','utf-8').trim()))"),
        priority: '$PRIORITY',
        timestamp: new Date().toISOString(),
        repo: '$REPO',
        orchestrateCmd: 'bash $SCRIPT_DIR/refresh-orchestrate.sh $PRIORITY $ISSUE_NUM'
      }, null, 2));
    "

    echo "[refresh-poller] Signal written to $SIGNAL_FILE"
    echo "[refresh-poller] Waiting for issue #$ISSUE_NUM to be closed..."

    # Wait until the issue is closed (orchestrate script will close it)
    while true; do
      sleep 60
      STATE=$(gh issue view "$ISSUE_NUM" --repo "$REPO" --json state --jq '.state' 2>/dev/null)
      if [ "$STATE" = "CLOSED" ]; then
        echo "[refresh-poller] Issue #$ISSUE_NUM closed. Refresh complete."
        rm -f "$SIGNAL_FILE"
        break
      fi
    done
  fi

  sleep "$POLL_INTERVAL"
done
