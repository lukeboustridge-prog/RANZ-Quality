# Testing & QA

## Test Setup
- **Unit/Integration:** Jest 30 + @testing-library/react
- **E2E:** Playwright (config at `e2e/playwright.config.ts`)
- **Accessibility:** jest-axe
- **Performance:** Lighthouse CI (@lhci/cli)

## Existing Tests
- `src/components/ui/__tests__/button.test.tsx` - UI component test
- `src/lib/auth/jwt.test.ts` - JWT token tests
- E2E tests in `e2e/` directory

## QA Artifacts
Located in `qa/` directory:
- `qa/checklists/functional-gaps.md` - Functional gap checklist
- `qa/checklists/visual-consistency.md` - Visual consistency checklist
- `qa/findings/issue-register.md` - Issue tracking
- `qa/reports/security-audit.md` - Security audit report
- `qa/reports/performance-audit.md` - Performance audit report
- `qa/reports/npm-audit-results.json` - Dependency audit
- `qa/scripts/security-audit.sh` - Security audit automation

## Test Commands
```bash
pnpm test           # Jest unit tests
pnpm test:watch     # Jest watch mode
pnpm test:e2e       # Playwright E2E tests
pnpm test:e2e:ui    # Playwright UI mode
pnpm lighthouse     # Lighthouse CI audit
pnpm typecheck      # TypeScript type checking
pnpm lint           # ESLint
```
