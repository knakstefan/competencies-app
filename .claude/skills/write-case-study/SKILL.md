---
name: write-case-study
description: Write or refine a case study section for a project, matching Stefan's writing voice and the portfolio's JSON structure.
argument-hint: [project-id] [section-name]
allowed-tools: Read, Grep, Glob
---

# Write Case Study Section

Project: $ARGUMENTS

## Before writing

1. Read `data/projects.json` to understand the existing case study structure and content
2. Read `data/profile.json` for context about Stefan's role and background
3. Study the detailed case studies (AI Email Generation, Knak Editor, AI Persona Generator, AI Image Slicer) as voice references

## Stefan's writing voice

Apply these characteristics consistently:

- **Direct and outcome-focused** — lead with the problem, describe approach in process terms, close with measurable results
- **Active voice** — "Designed a comprehensive workflow", "Built an intuitive interface", "Created a streamlined three-step workflow"
- **Em-dashes for emphasis** — "Reduced creation time from days to minutes—enabling marketers to launch campaigns faster"
- **Confident but not boastful** — let results speak; avoid superlatives like "amazing" or "groundbreaking"
- **Process-oriented approach sections** — describe what was done and why, not just what was built
- **Collaborative framing** — acknowledge cross-functional work with PM, engineering, stakeholders
- **Specific metrics** — quantify impact wherever possible (percentages, time reductions, user counts)
- **Recurring patterns**: "balance X with Y", "democratize", "streamline", "intuitive", "comprehensive", "seamless"

## Case study structure

Each section in the `caseStudy` object:

- **overview**: 2-3 sentences. What is this project and why does it matter? Set the context.
- **challenge**: What problem existed? Who was affected? What were the consequences of the status quo?
- **approach**: How did Stefan tackle it? Research methods, design decisions, key principles applied.
- **solution**: What was built? Describe the experience from the user's perspective. Be specific about features and interactions.
- **impact**: Concrete results. Metrics first, then qualitative outcomes. Use "from X to Y" framing for improvements.
- **learnings**: 2-3 key takeaways. Frame as principles, not just observations. Use pattern: "Successful X requires balancing Y with Z."

## Length guidelines

- **Short case studies** (secondary projects): 1-2 sentences per section
- **Detailed case studies** (featured projects): 3-5 sentences per section, with specific examples

## Output

Return the case study content as a JSON object matching the `caseStudy` schema:

```json
{
  "overview": "...",
  "challenge": "...",
  "approach": "...",
  "solution": "...",
  "impact": "...",
  "learnings": "..."
}
```

If writing a single section, return just that field with the surrounding context of what comes before/after.
