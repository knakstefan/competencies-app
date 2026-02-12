# CLAUDE.md

## Project Overview

**Competency Manager (CM)** — A competency management platform for Product Designer roles. Tracks competencies across levels (Associate → Intermediate → Senior → Lead → Principal), manages team assessments, hiring pipelines, and generates AI-powered promotion plans.

**Live site**: https://competencies-app.netlify.app

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix primitives)
- **Backend**: Convex (real-time database, serverless functions)
- **Auth**: Clerk (email/password, `ConvexProviderWithClerk`)
- **AI**: OpenAI GPT-4o via Convex actions (promotion plan generation)
- **Hosting**: Netlify (auto-deploys from `main` branch)

## Project Structure

```
src/
├── pages/           # Route-level components (ViewPage, TeamPage, ManagePage, HiringPage, UsersPage, Auth, AcceptInvite)
├── components/      # Feature components + ui/ (shadcn)
├── hooks/           # useAuth, useCompetencies, use-mobile, use-toast
├── lib/             # Utils (competencyFormat.ts, utils.ts)
├── types/           # TypeScript types (competency.ts, assessment.ts)
├── App.tsx          # Router + AppLayout (auth guard)
└── main.tsx         # Entry point (ClerkProvider + ConvexProviderWithClerk)

convex/
├── schema.ts        # Database schema (14 tables)
├── ai.ts            # OpenAI GPT-4o action (generatePromotionPlan)
├── competencies.ts  # Competency CRUD + ordering
├── assessments.ts   # Assessment lifecycle
├── teamMembers.ts   # Team member management
├── candidates.ts    # Hiring candidate management
├── users.ts         # Auth + role management
├── auth.config.ts   # Clerk JWT config
└── ...              # progress, evaluations, promotionPlans, etc.
```

## Key Conventions

- **Convex document IDs**: Use `_id` (not `id`). Reference with `v.id("tableName")`.
- **Field naming**: camelCase everywhere (e.g., `orderIndex`, `competencyId`, `associateLevel`).
- **Data fetching**: `useQuery()` for reactive reads, `useMutation()` for writes, `useAction()` for AI/external calls. Never use `useState`/`useEffect` for data fetching.
- **Imperative Convex client**: Use `useConvex()` from `convex/react` (not `useConvexClient`).
- **Auth pattern**: `useAuth()` hook returns `{ user, isSignedIn, isLoaded, isAdmin, convexUser, handleSignOut }`. Admin check is `convexUser?.role === "admin"`.
- **Role-based access**: Three roles — `admin`, `editor`, `viewer`. UI gates features behind `isAdmin`. Convex functions should check auth server-side.
- **Component library**: shadcn/ui components in `src/components/ui/`. Import as `@/components/ui/...`.
- **Path alias**: `@` maps to `src/` (configured in vite.config.ts and tsconfig).

## Data Model (Key Tables)

| Table | Purpose | Key Indexes |
|---|---|---|
| `users` | Clerk-synced users with roles | by_clerkId, by_email |
| `competencies` | Top-level competency areas | by_orderIndex |
| `subCompetencies` | Level criteria per competency | by_competencyId |
| `teamMembers` | Internal team members | by_name |
| `assessments` | Member skill assessments | by_memberId, by_status |
| `memberCompetencyProgress` | Per-sub-competency scores | by_assessmentId, by_memberId |
| `criteriaEvaluations` | Individual criteria ratings | by_progressId |
| `promotionPlans` | AI-generated development plans | by_memberId |
| `hiringCandidates` | External candidates | by_currentStage |
| `candidateAssessments` | Candidate evaluations | by_candidateId |

## Evaluation Scale

Criteria are rated on a 5-point scale: `well_below` (1), `below` (2), `target` (3), `above` (4), `well_above` (5).

## Routes

| Path | Page | Auth Required |
|---|---|---|
| `/` | ViewPage (competency framework viewer) | Yes |
| `/team` | TeamPage (members, assessments, progress) | Yes |
| `/manage` | ManagePage (edit competencies, import/export) | Yes |
| `/hiring` | HiringPage (candidate pipeline) | Yes |
| `/users` | UsersPage (user/role management) | Yes |
| `/auth` | Clerk sign-in | No |
| `/accept-invite` | Invitation acceptance | No |

## Development

```sh
# Terminal 1: Convex backend
npx convex dev

# Terminal 2: Vite frontend
npm run dev        # runs on localhost:8080
```

### Environment Variables

**Local `.env`**:
- `VITE_CONVEX_URL` — Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key

**Convex Dashboard**:
- `CLERK_JWT_ISSUER_DOMAIN` — Clerk issuer domain
- `OPENAI_API_KEY` — For AI promotion plan generation

## Common Tasks

### Adding a new Convex function
1. Add the function in the appropriate `convex/*.ts` file
2. Convex auto-generates types — use `api.module.functionName` to reference
3. On the frontend, use `useQuery`/`useMutation`/`useAction` from `convex/react`

### Adding a new page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx` wrapped with `<AppLayout>` for auth
3. Add nav link in `src/components/Navbar.tsx`

### Modifying the schema
1. Edit `convex/schema.ts`
2. Run `npx convex dev` to apply — Convex handles migrations automatically
3. Update any affected queries/mutations

## Deployment

Pushes to `main` auto-deploy to Netlify. Convex functions deploy separately via `npx convex deploy` (or automatically if `npx convex dev` is running during push).
