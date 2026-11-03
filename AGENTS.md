# AGENTS.md

If a request conflicts with these rules, ask me first instead of ignoring them.

## Tech Stack

- TypeScript only, no `.js` files in `src/`. Backend: Node.js + Express + MongoDB via Mongoose.
- Allowed packages: `typescript`, `ts-node`, `@types/node`, `express`, `@types/express`, `mongoose`, `dotenv`, `eslint`, `prettier`. Ask before adding any other.

## Architecture

- **routes/** — maps URL + HTTP method to a controller. No logic.
- **controllers/** — request/response and status codes. No direct database calls.
- **services/** — business logic. The only layer that talks to the database. No `req`/`res`.
- **models/** — Mongoose schemas and TypeScript types.
- **middleware/** — e.g. error handling.
- **config/** — env variables, DB connection.

## Coding Standards

- Explicit types for every function's parameters and return value.
- Never use `any`. Use `unknown` and narrow it, or define an interface.
- No unhandled promises. Use try/catch in controllers or route errors to the centralized error handler.
- Keep functions small and single-purpose.
- Follow eslint/prettier formatting.

## Frontend (client/)

React + TypeScript + Vite. Only `.ts`/`.tsx` in `client/src/`.

- Functional components only, each with an explicit props interface.
- Use `useState`/`useEffect` or custom hooks. No API calls inside JSX.
- Style with CSS modules or plain CSS, consistently.
- Allowed packages: `react`, `vite`, `axios` (plus the tooling already in `client/package.json`). Ask before adding any other.
- API calls live in `client/src/api/`; types must match `docs/openapi.yaml`.
- Reach the backend through the Vite `/api` proxy. Don't add CORS to the backend.
- Follow the client's configured linter/formatter.

## Git

- One commit = one logical change.
- Commit messages say what changed and why (cite the rule from this file if relevant).
- Never commit `.env` or secrets.
