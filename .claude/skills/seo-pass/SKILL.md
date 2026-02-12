---
name: seo-pass
description: Run an SEO audit on a page or the whole site. Checks meta tags, heading hierarchy, alt text, Open Graph, and SPA-specific concerns.
argument-hint: [page-or-template-path]
allowed-tools: Read, Grep, Glob
---

# SEO Audit

Target: $ARGUMENTS (if empty, audit the whole site starting with `index.html` and all templates in `js/templates/`)

## 1. Meta & Head Tags

Check `index.html` for:
- [ ] `<title>` — 50-60 characters, includes primary keyword
- [ ] `<meta name="description">` — 120-160 characters, compelling
- [ ] `<meta name="viewport">` — proper mobile viewport
- [ ] `<link rel="canonical">` — set correctly
- [ ] Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] Favicon and apple-touch-icon

## 2. SPA-Specific SEO

This is a hash-routed SPA — check for:
- [ ] Dynamic `<title>` updates on route change (check `js/app.js` for `initTitles` or similar)
- [ ] Meta description updates per route (or a sensible default)
- [ ] Fallback content in `index.html` for crawlers that don't execute JS
- [ ] `<noscript>` content for accessibility

## 3. Content Structure (per template)

For each template in `js/templates/`:
- [ ] Single `<h1>` per page view
- [ ] Heading hierarchy — no skipped levels (h1 → h2 → h3)
- [ ] Meaningful heading text (not generic "Section 1")
- [ ] All images have descriptive `alt` text
- [ ] Internal links use proper `<a>` tags (not just `<div onclick>`)

## 4. Performance Signals

- [ ] Images optimized (appropriate format, reasonable file size)
- [ ] No render-blocking resources unnecessarily
- [ ] CSS is minified in production (`dist/output.css`)
- [ ] JS modules loaded efficiently

## 5. Structured Data

- [ ] Consider JSON-LD for Person schema (portfolio owner)
- [ ] Consider JSON-LD for CreativeWork per project

## Output

Generate a report with:
1. **Score**: Overall SEO health (Good / Needs Work / Poor)
2. **Issues**: Each with priority (Critical / Important / Nice-to-have), what's wrong, and how to fix
3. **Quick wins**: Changes that take <5 minutes and have high impact
