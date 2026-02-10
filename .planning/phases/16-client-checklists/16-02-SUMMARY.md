---
phase: 16-client-checklists
plan: 02
subsystem: checklists
tags: [checklist, org-template, instance, completion, api, dashboard]
dependency-graph:
  requires: [16-01]
  provides: [org-checklist-customization, checklist-instances, item-completion-tracking]
  affects: [16-03]
tech-stack:
  added: []
  patterns: [clone-master-template, pre-create-completion-records, auto-complete-instance, debounced-text-save]
key-files:
  created:
    - src/app/api/checklists/route.ts
    - src/app/api/checklists/[id]/route.ts
    - src/app/api/checklists/[id]/items/[itemId]/route.ts
    - src/app/(dashboard)/checklists/page.tsx
    - src/app/(dashboard)/checklists/[id]/page.tsx
  modified:
    - src/components/layout/sidebar.tsx
decisions:
  - id: chkl-04
    decision: "Clone guard: one clone per master template per org (409 on duplicate)"
  - id: chkl-05
    decision: "Pre-create ChecklistItemCompletion records for all items on instance creation for simple progress tracking"
  - id: chkl-06
    decision: "Auto-complete instance when all required items done, auto-uncomplete when item unchecked"
  - id: chkl-07
    decision: "Org templates preferred over master for starting checklists, fallback to master if no org template exists"
metrics:
  duration: "~7 min"
  completed: 2026-02-10
---

# Phase 16 Plan 02: Org Template Cloning and Instance Creation Summary

Org-facing checklist management with master template cloning, inline section/item customisation, project checklist instances with real-time completion tracking, and auto-complete on all-required-done.

## What Was Done

### Task 1: Org Checklist Template Customisation API and Page

**API: /api/checklists/route.ts** (org-scoped via Clerk auth)
- GET: Returns master templates, org-customised templates (full sections>items tree), and active instances with completion stats (totalItems, completedItems, percentage)
- POST action="clone": Deep-clones a master template for the org (new template + sections + items in transaction). Guards against duplicate clones per org (409).
- POST action="add-section": Adds section to org template with auto-increment sortOrder
- POST action="add-item": Adds item to section with type/required/sortOrder
- PATCH action="update-section" / "update-item": Updates section or item fields with ownership verification
- DELETE action="delete-section" / "delete-item" / "delete-template": Removes with ownership verification, cascade handled by Prisma

**Dashboard: /checklists/page.tsx** (use client)
- Two-tab layout: "Templates" and "Project Checklists"
- Templates tab: Shows org's company template if cloned, with full inline section/item management (add/edit/remove). Reset to Default button deletes org template. If no org template, shows master templates with "Use This Template" clone button.
- Project Checklists tab: Lists active instances with project name, template, completion percentage, circular progress SVG. "Start Checklist" inline card with project and template selectors.
- All forms follow existing patterns (inline editing, save/cancel, loading states)

**Sidebar**: Added "Checklists" nav item after "Teams" with ClipboardList icon

### Task 2: Project Checklist Instance Creation and Item Completion

**API: /api/checklists/[id]/route.ts** (instance management)
- GET: Returns instance with full template tree enriched with completion data per item, plus stats (totalItems, completedItems, requiredItems, completedRequired, percentage)
- POST: Creates instance for a project+template pair. Verifies template ownership (or master), project ownership, unique constraint. Pre-creates ChecklistItemCompletion records for ALL items in a transaction.
- PATCH action="complete": Validates all required items are completed before setting completedAt. Returns error with count of incomplete required items if validation fails.
- DELETE: Hard-deletes instance with cascade

**API: /api/checklists/[id]/items/[itemId]/route.ts** (item completion)
- PATCH: Upserts completion record. Handles completed toggle (sets/clears completedAt/completedBy), textValue, and notes. Auto-completes instance when all required items done. Auto-uncompletes instance when a required item is unchecked. Returns updated completion + stats.

**Detail Page: /checklists/[id]/page.tsx** (use client)
- Header with project info, template name, completion badge
- Full-width progress bar with percentage and required items counter
- Collapsible section cards (all expanded by default)
- CHECKBOX/SIGNATURE items: Toggle checkbox with green fill on complete, line-through text
- TEXT_INPUT items: Inline text field with debounced save (1s), auto-marks complete on blur if value present
- PHOTO_REQUIRED items: Camera icon with "coming soon" badge placeholder
- Notes: Expandable textarea per item, saves on blur
- Completion timestamp shown when item is done
- "Mark Complete" button at bottom, disabled until all required items done, green when ready

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| chkl-04 | One clone per master template per org | Prevents confusion from multiple copies of same template |
| chkl-05 | Pre-create completion records on instance creation | Simplifies progress calculation (count completed vs total records) |
| chkl-06 | Auto-complete/uncomplete instance based on required items | Reduces manual step; if someone unchecks an item, instance status reflects reality |
| chkl-07 | Prefer org templates over master for starting checklists | Orgs should use their customised version, fallback to master for orgs without customisation |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 7bf2a9b | feat(16-02): org checklist template customization API and page |
| 42d4293 | feat(16-02): project checklist instance creation and item completion |

## Next Phase Readiness

Plan 16-03 (Photo Evidence and PDF Generation) can proceed immediately. The infrastructure supports:
- Photo upload via ChecklistItemCompletion.photoKey/photoFileName fields
- PHOTO_REQUIRED item type with placeholder UI ready for enhancement
- Completion stats already computed for PDF generation
- Instance completedAt tracking for completed checklist reports
