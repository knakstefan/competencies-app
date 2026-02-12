---
name: a11y-checklist
description: Run a structured WCAG 2.1 AA accessibility checklist against a page or component. Returns pass/fail per criterion.
argument-hint: [page-or-component-path]
allowed-tools: Read, Grep, Glob
---

# Accessibility Checklist

Target: $ARGUMENTS (if empty, audit all pages in `src/pages/` and key components in `src/components/`)

Run each check below against the target. Mark each as PASS, FAIL, or N/A.

## Perceivable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.1.1 | All `<img>` have meaningful `alt` (not "image", "photo", empty for decorative) | | |
| 1.3.1 | Semantic HTML structure (proper use of headings, lists, landmarks) | | |
| 1.3.2 | Content order is meaningful without CSS | | |
| 1.4.1 | Color alone does not convey information (assessment scores, status badges) | | |
| 1.4.3 | Text contrast ratio >= 4.5:1 (check dark theme: `text-muted-foreground` on `bg-background`) | | |
| 1.4.4 | Text resizable to 200% without loss of content | | |
| 1.4.11 | Non-text contrast >= 3:1 for UI components (buttons, inputs, chart elements) | | |

## Operable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.1.1 | All functionality available via keyboard (assessment wizards, drag-and-drop has keyboard alt) | | |
| 2.1.2 | No keyboard traps (check Dialogs, Sheets, DropdownMenus) | | |
| 2.4.1 | Skip-to-content link or landmark navigation available | | |
| 2.4.2 | Page title updates on route change via React Router | | |
| 2.4.3 | Focus order matches visual order | | |
| 2.4.4 | Link/button purpose clear from text (no bare "click here") | | |
| 2.4.7 | Focus indicator visible on all interactive elements | | |
| 2.5.5 | Touch targets >= 44x44px (evaluation buttons, nav items) | | |

## Understandable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.1.1 | `<html lang="en">` set in `index.html` | | |
| 3.2.3 | Navigation (Navbar) consistent across views | | |
| 3.3.1 | Form input errors clearly identified (team member form, candidate form) | | |
| 3.3.2 | Labels associated with all form inputs | | |

## Robust

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.1.1 | Valid HTML (no duplicate IDs, proper nesting) | | |
| 4.1.2 | Interactive elements have accessible names (Radix primitives handle this — verify custom components) | | |
| 4.1.3 | Toast notifications use appropriate ARIA live regions | | |

## App-Specific

| # | Check | Status | Notes |
|---|-------|--------|-------|
| APP-1 | Focus managed on React Router route changes | | |
| APP-2 | Assessment wizard step transitions manage focus correctly | | |
| APP-3 | Recharts (radar, trend) have accessible descriptions or alternatives | | |
| APP-4 | Drag-and-drop (competency reordering) has keyboard alternative | | |
| APP-5 | Loading skeletons don't trap focus or confuse screen readers | | |
| APP-6 | Role-gated UI (admin-only buttons) doesn't leave orphaned ARIA references | | |

## Output

1. **Summary**: X passed, Y failed, Z not applicable
2. **Failures**: each with WCAG criterion, file/line, what's wrong, concrete fix
3. **Priority order**: Critical failures first
