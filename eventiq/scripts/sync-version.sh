#!/bin/bash
# sync-version.sh — Updates version across all source files
# Usage: ./scripts/sync-version.sh 3.1.87

set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 3.1.87"
  exit 1
fi

# Validate format: x.x.xx
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]{1,2}$'; then
  echo "Error: Version must match format x.x.xx (e.g. 3.1.87)"
  exit 1
fi

DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Syncing version to $VERSION..."

# 1. VERSION file
echo "$VERSION" > "$DIR/VERSION"
echo "  ✓ VERSION"

# 2. package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$DIR/package.json"
echo "  ✓ package.json"

# 3. app-sidebar.tsx (UI display)
sed -i '' "s/v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*<\/span>/v${VERSION}<\/span>/" "$DIR/src/components/app-sidebar.tsx"
echo "  ✓ src/components/app-sidebar.tsx"

# 4. CLAUDE.md header (line 13 only, not decisions log)
sed -i '' "s/^\*\*Version:\*\* [0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*/**Version:** $VERSION/" "$DIR/CLAUDE.md"
echo "  ✓ CLAUDE.md"

echo ""
echo "All files updated to v$VERSION"
