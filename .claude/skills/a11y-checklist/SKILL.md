---
name: a11y-checklist
description: Run a structured WCAG 2.1 AA accessibility checklist against a page or component. Returns pass/fail per criterion.
argument-hint: [page-or-component-path]
allowed-tools: Read, Grep, Glob
---

# Accessibility Checklist

Target: $ARGUMENTS (if empty, audit all templates in `js/templates/`)

Run each check below against the target. Mark each as PASS, FAIL, or N/A.

## Perceivable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.1.1 | All `<img>` have meaningful `alt` (not "image", "photo", empty for decorative) | | |
| 1.3.1 | Semantic HTML structure (`<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`) | | |
| 1.3.2 | Content order is meaningful without CSS | | |
| 1.4.1 | Color alone does not convey information | | |
| 1.4.3 | Text contrast ratio >= 4.5:1 (check Tailwind theme colors against backgrounds) | | |
| 1.4.4 | Text resizable to 200% without loss of content | | |
| 1.4.11 | Non-text contrast >= 3:1 for UI components and graphics | | |

## Operable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.1.1 | All functionality available via keyboard | | |
| 2.1.2 | No keyboard traps (check lightbox, mobile menu) | | |
| 2.4.1 | Skip-to-content link present | | |
| 2.4.2 | Page `<title>` is descriptive and updates on route change | | |
| 2.4.3 | Focus order matches visual order | | |
| 2.4.4 | Link purpose clear from text (no bare "click here") | | |
| 2.4.7 | Focus indicator visible on all interactive elements | | |
| 2.5.5 | Touch targets >= 44x44px | | |

## Understandable

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.1.1 | `<html lang="en">` set | | |
| 3.2.3 | Navigation consistent across views | | |
| 3.3.1 | Input errors clearly identified | | |
| 3.3.2 | Labels or instructions provided for inputs | | |

## Robust

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.1.1 | Valid HTML (no duplicate IDs, proper nesting) | | |
| 4.1.2 | Interactive elements have accessible names (buttons, links) | | |
| 4.1.3 | Status messages use ARIA live regions where appropriate | | |

## SPA-Specific

| # | Check | Status | Notes |
|---|-------|--------|-------|
| SPA-1 | Focus managed on route change (reset to top or main content) | | |
| SPA-2 | Route change announced to screen readers | | |
| SPA-3 | Loading states accessible (not just visual spinners) | | |
| SPA-4 | View Transitions don't break content access | | |

## Output

1. **Summary**: X passed, Y failed, Z not applicable
2. **Failures**: each with WCAG criterion, file/line, what's wrong, concrete fix
3. **Priority order**: Critical failures first
