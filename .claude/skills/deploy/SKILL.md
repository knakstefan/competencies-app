---
name: deploy
description: Pre-deploy checklist and production build steps. Verifies clean state, builds CSS, and confirms readiness for Netlify deploy.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
---

# Deploy Checklist

Run through each step. Stop and report if any step fails.

## 1. Verify Clean Working State

```bash
git status
```

- [ ] No uncommitted changes (or confirm with user before proceeding)
- [ ] On the correct branch (usually `main`)

## 2. Build Production CSS

```bash
npm run build
```

- [ ] Tailwind build completes without errors
- [ ] `dist/output.css` is generated and minified
- [ ] No unexpected Tailwind warnings

## 3. Verify No Broken References

Check that templates don't reference missing data keys or images:

- [ ] All image paths in `data/projects.json` point to files that exist
- [ ] All route registrations in `js/app.js` have corresponding templates
- [ ] No console errors on page load (check `js/app.js` init flow)

## 4. Quick Smoke Test

Verify these routes render without errors:
- [ ] `#/home` — hero, featured projects load
- [ ] `#/portfolio` — project cards render
- [ ] `#/project/<any-id>` — case study renders with gallery
- [ ] `#/resume` — resume data renders
- [ ] `#/resume/print` — print layout renders

## 5. Confirm Deploy

Netlify deploys automatically from `main` on push. Verify:

- [ ] `dist/output.css` is committed (it's the built CSS)
- [ ] No files in `.gitignore` that should be deployed
- [ ] No secrets or `.env` files staged

Report the results of each step. If all pass, confirm ready to push.
