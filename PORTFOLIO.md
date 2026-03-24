# Competency Manager

**A competency management platform that connects team assessment, hiring, and skill mapping through a single framework — built by a design leader to solve real management problems.**

[Live site](https://competencies-app.netlify.app)

---

## Overview

Competency Manager is a full-stack web application I designed and built to bring structure and consistency to how I evaluate, develop, and hire Product Designers. It replaces scattered spreadsheets and ad-hoc processes with a single system where one competency framework powers everything: team assessments, trend tracking, hiring pipelines, skill mapping, and AI-generated development plans.

The primary user is me — a design manager running a team of product designers across multiple levels, from Associate to Principal. Team members have viewer access to their own assessments and progression plans.

## Challenge

Managing a design team well requires making a lot of judgment calls — and most of the tools available to support those decisions are disconnected from each other.

**Evaluation is subjective and inconsistent.** Without a shared rubric, "senior-level visual design" means something different every time you assess it. Feedback becomes vague, and promotions become hard to justify with evidence.

**Assessment and hiring are separate worlds.** I'd evaluate my team against one mental model, then interview candidates against a different one. There was no way to connect "what my team needs" with "what this candidate brings."

**Growth plans are disconnected from data.** Development conversations would produce well-intentioned goals, but they weren't grounded in actual assessment trends. Plans felt generic rather than targeted.

**Team skill gaps are invisible.** I couldn't see the aggregate picture — which capabilities the team was strong in and where we were thin — until we were already struggling in a project.

**Existing tools don't compose.** I tried spreadsheets, Notion databases, and various HR tools. Each solved a piece of the problem, but none connected assessment data to hiring decisions to development plans in a coherent way.

## Approach

I started with a core design principle: **one competency framework should be the backbone of everything.** If the same criteria define what "good" looks like at every level, then assessments, hiring, skill mapping, and growth plans can all draw from the same source of truth.

**Framework-first architecture.** The competency framework isn't a feature — it's the data model. Competencies contain sub-competencies, and each sub-competency defines specific criteria at every career level. Everything else in the system references this structure.

**AI as a force multiplier.** I integrated Claude to generate promotion plans, assessment summaries, interview questions, and hiring recommendations — but always grounded in actual assessment data. Structured competency data produces far better AI outputs than open-ended prompts. The AI never invents criteria; it works within the framework.

**Real-time data with Convex.** Assessments involve rating dozens of criteria across multiple competencies. Convex's reactive data model means every rating is instantly persisted and reflected — no save buttons, no stale state. This makes the assessment workflow feel fluid rather than form-like.

**Progressive complexity.** The surface is simple: pick a team member, start an assessment, rate criteria. But the system composes into deeper insights — trend charts across assessments, team-wide radar charts, AI-generated development roadmaps — without forcing complexity upfront.

**Tool-like aesthetic.** Dark-mode only, dense information display, minimal decoration. This is a management utility, not a consumer product. The design reflects that.

## Solution

### Competency Framework
The foundation. Each competency contains sub-competencies with level-specific criteria across both IC and management tracks. Competencies are drag-and-drop reorderable, and the entire framework can be exported as Markdown or JSON and imported into new instances. This makes the framework portable and version-controllable.

### Team Assessments
A wizard-based flow walks through each competency, presenting criteria at the team member's current level and target level. A 5-point scale (well below → well above target) captures granular ratings, and majority logic auto-calculates sub-competency scores. Over multiple assessment cycles, trend charts reveal whether someone is improving, stable, or declining in each competency. AI-generated summaries distill assessment data into strengths, gaps, and readiness for the next level. AI-generated discussion prompts help structure 1:1 assessment conversations with behavioral, observable questions.

### Team Skill Mapping
Aggregates individual assessments into a radar chart showing the team's collective capability across all competencies. This surfaces gaps — where the team is thin — and strengths at a glance. A skills recommendation widget identifies below-average competencies and suggests what to prioritize in the next hire.

### Hiring Pipeline
Candidates are evaluated through configurable multi-stage pipelines (AI-generated interview questions, portfolio reviews, manager interviews), each scored against the same competency framework used for team assessments. AI generates behavioral interview questions tailored to the target level, complete with signal guidance for what separates good from great answers. After evaluation, AI produces a hiring recommendation with a team-fit assessment — how well the candidate complements the team's existing strengths and gaps.

## Impact

**Expectations are explicit.** Every level has defined criteria. Assessment conversations are grounded in specifics, not impressions. Team members can see exactly what's expected at their current level and the next one up.

**Hiring decisions are informed by team needs.** The skill mapping view directly shows where the team is underweight, and candidate assessments are scored against the same framework. Hiring becomes a deliberate complement to the team's existing capabilities.

**Development plans are actionable.** AI-generated progression plans pull from real assessment trends — not generic career advice. Each plan includes specific development areas, recommended resources, concrete milestones, and a timeline estimate.

**One system replaces many.** Assessment tracking, hiring evaluation, skill mapping, and growth planning all live in one place, drawing from one framework. No more reconciling spreadsheets or cross-referencing Notion databases.

## Key Learnings

**Designing for yourself is a double-edged sword.** Deep domain knowledge meant I could skip user research and move fast — I knew the problems intimately. But it also meant scope creep was constant. Every pain point I'd ever experienced as a manager became a feature candidate. The discipline was in saying no to things that were real problems but not essential to the core system.

**AI works best when constrained by real data.** Early experiments with open-ended AI prompts produced generic, unhelpful output. The breakthrough was feeding structured assessment data — specific criteria, specific ratings, specific trends — into tightly scoped prompts. The competency framework acts as guardrails that make AI output specific and actionable.

**Real-time data changes the UX.** Convex's reactive model meant I could design assessment flows as continuous interactions rather than form submissions. Rating a criterion instantly updates the sub-competency score, the progress bar, and the trend data. This small thing fundamentally changed how fluid the assessment experience feels.

**The framework is the product.** The most important design decision was making the competency framework the single data model that everything else composes on. Assessments, hiring, skill mapping, and AI features are all projections of the same underlying structure. This constraint simplified the architecture and made every new feature automatically coherent with the rest of the system.

---

*Built with React, TypeScript, Convex, Clerk, Claude API, shadcn/ui, and Tailwind CSS. Deployed on Netlify.*
