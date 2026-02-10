---
phase: 16-client-checklists
plan: 01
subsystem: checklists
tags: [prisma, checklist, admin, crud, seed]
dependency-graph:
  requires: [15-team-composition]
  provides: [checklist-schema, checklist-admin-crud, default-roofwright-checklist]
  affects: [16-02, 16-03]
tech-stack:
  added: []
  patterns: [auto-seed-on-first-get, expand-collapse-template-tree, inline-crud-forms]
key-files:
  created:
    - src/app/api/admin/checklists/route.ts
    - src/app/api/admin/checklists/[id]/route.ts
    - src/app/api/admin/checklists/[id]/sections/route.ts
    - src/app/api/admin/checklists/[id]/sections/[sectionId]/items/route.ts
    - src/app/(admin)/admin/checklists/page.tsx
  modified:
    - prisma/schema.prisma
    - src/types/index.ts
    - src/app/(admin)/layout.tsx
decisions:
  - id: chkl-01
    decision: "Auto-seed default RoofWright checklist on first admin GET request (same pattern as micro-credentials)"
  - id: chkl-02
    decision: "Expand/collapse template cards with inline section and item management"
  - id: chkl-03
    decision: "ClipboardList icon for Checklists nav, placed after Micro-credentials in admin nav"
metrics:
  duration: "~5 min"
  completed: 2026-02-10
---

# Phase 16 Plan 01: Checklist Schema, Admin CRUD, and Default Seed Summary

Full checklist data model with 5 Prisma models, admin CRUD API for templates/sections/items, and auto-seeded default RoofWright client process checklist with 5 sections and 28 items.

## What Was Done

### Task 1: Prisma Schema and TypeScript Types
- Added 5 models to schema: ChecklistTemplate, ChecklistSection, ChecklistItem, ChecklistInstance, ChecklistItemCompletion
- Added ChecklistItemType enum (CHECKBOX, TEXT_INPUT, PHOTO_REQUIRED, SIGNATURE)
- Added relations on Organization (checklists, checklistInstances) and Project (checklistInstances)
- ChecklistTemplate supports master/org-specific via isMaster flag and self-referencing clone relation
- ChecklistInstance has @@unique([templateId, projectId]) for one checklist per template per project
- Exported TypeScript types and CHECKLIST_ITEM_TYPE_LABELS in src/types/index.ts
- Schema pushed cleanly via `prisma db push`

### Task 2: Admin CRUD API, Page, Default Seed, and Nav
- **GET /api/admin/checklists**: Lists master templates with sections+items tree, auto-seeds default on first request
- **POST /api/admin/checklists**: Creates new master template with Zod validation
- **GET/PATCH/DELETE /api/admin/checklists/[id]**: Single template CRUD, DELETE guarded against isDefault templates (409)
- **POST/PATCH/DELETE /api/admin/checklists/[id]/sections**: Section management with auto-increment sortOrder
- **POST/PATCH/DELETE /api/admin/checklists/[id]/sections/[sectionId]/items**: Item management with type/required/sortOrder
- **Admin page**: Expand/collapse template cards, inline section and item management, create/edit forms
- **Default RoofWright Checklist**: 5 sections (Initial Contact, Quoting, Site Setup, Execution, Completion) with 28 items
- **Admin nav**: Added "Checklists" link with ClipboardList icon after Micro-credentials

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| chkl-01 | Auto-seed default checklist on first GET | Matches micro-credentials pattern, no migration script needed |
| chkl-02 | Expand/collapse template cards | Better UX for managing hierarchical data (template > section > item) |
| chkl-03 | ClipboardList icon, placed after Micro-credentials | Logical ordering: Programme > Micro-credentials > Checklists |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 025b4cf | feat(16-01): add checklist data model and TypeScript types |
| 90b6a6e | feat(16-01): admin checklist CRUD with default RoofWright seed |

## Next Phase Readiness

Plan 16-02 (Org Template Cloning & Instance Creation) can proceed immediately. The schema supports:
- Template cloning via sourceTemplateId self-relation
- Instance creation via ChecklistInstance linked to Project
- Item completion tracking via ChecklistItemCompletion
