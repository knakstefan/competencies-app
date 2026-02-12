# Product Designer Competency Framework

A competency management system for Product Designer roles. View and manage competencies across all levels from Associate to Principal.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Convex (real-time database, serverless functions)
- **Auth**: Clerk
- **AI**: OpenAI GPT-4o (competency descriptions, promotion plans)

## Getting Started

### Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account

### Setup

```sh
# Install dependencies
npm install

# Start Convex dev server (in one terminal)
npx convex dev

# Start the frontend dev server (in another terminal)
npm run dev
```

### Environment Variables

Create a `.env` file with:

```
VITE_CONVEX_URL=<your convex deployment url>
VITE_CLERK_PUBLISHABLE_KEY=<your clerk publishable key>
```

Set these in the Convex dashboard:

- `CLERK_JWT_ISSUER_DOMAIN` — Your Clerk issuer domain
- `OPENAI_API_KEY` — For AI-powered features

## Features

- Competency framework management (create, edit, reorder)
- Team member tracking and skill assessments
- AI-generated competency descriptions
- AI-generated promotion plans
- Team skill mapping with radar charts
- Hiring candidate pipeline and assessments
- Manager interview and portfolio review workflows
- Role-based access control (admin, editor, viewer)
