#!/bin/bash
# Security audit script for RANZ applications
# Runs dependency scans and basic security checks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$SCRIPT_DIR/../reports"

echo "=== RANZ Security Audit ==="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Project: $PROJECT_ROOT"
echo ""

# Ensure reports directory exists
mkdir -p "$REPORTS_DIR"

echo "=== Dependency Audit ==="
cd "$PROJECT_ROOT"

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
  PKG_MANAGER="pnpm"
  echo "Detected package manager: pnpm"
elif [ -f "package-lock.json" ]; then
  PKG_MANAGER="npm"
  echo "Detected package manager: npm"
elif [ -f "yarn.lock" ]; then
  PKG_MANAGER="yarn"
  echo "Detected package manager: yarn"
else
  echo "WARNING: No lockfile found. Defaulting to npm."
  PKG_MANAGER="npm"
fi

# Run audit and save JSON results
echo ""
echo "Running $PKG_MANAGER audit..."
$PKG_MANAGER audit --json > "$REPORTS_DIR/npm-audit-results.json" 2>&1 || true

# Display summary
echo ""
echo "=== Audit Summary ==="
$PKG_MANAGER audit 2>&1 || true

echo ""
echo "=== Checking for outdated packages ==="
$PKG_MANAGER outdated 2>&1 || true

echo ""
echo "=== Environment variable exposure check ==="
# Check for hardcoded secrets (should find none in properly configured repos)
echo "Scanning for potential hardcoded secrets..."

# Patterns to check
PATTERNS=(
  "sk_live_"
  "pk_live_"
  "PRIVATE_KEY.*=.*-----"
  "password.*=.*['\"]"
  "api_key.*=.*['\"]"
  "secret.*=.*['\"]"
)

FOUND_ISSUES=0
for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" "$PROJECT_ROOT/src/" 2>/dev/null | grep -v "process.env" | grep -v "// " | grep -v ".test." | head -5; then
    FOUND_ISSUES=1
  fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
  echo "No hardcoded secrets found in source files."
fi

echo ""
echo "=== Checking for sensitive files in git ==="
# Check for common sensitive file patterns that shouldn't be committed
SENSITIVE_PATTERNS=(".env" ".env.local" "*.pem" "*.key" "credentials.json")
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if git ls-files "$PROJECT_ROOT/$pattern" 2>/dev/null | head -1 | grep -q .; then
    echo "WARNING: Found tracked sensitive file matching: $pattern"
    FOUND_ISSUES=1
  fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
  echo "No sensitive files found in git tracking."
fi

echo ""
echo "=== Security audit complete ==="
echo "Results saved to: $REPORTS_DIR/npm-audit-results.json"
