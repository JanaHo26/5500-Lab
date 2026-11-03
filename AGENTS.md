# AGENTS.md

If a request conflicts with these rules, ask me first instead of ignoring them.

## Tech Stack

- TypeScript only, no `.js` files in `src/`. Backend: Node.js + Express + MongoDB via Mongoose.
- Allowed packages: `typescript`, `ts-node`, `@types/node`, `express`, `@types/express`, `mongoose`, `dotenv`, `eslint`, `prettier`. Ask before adding any other.

## Architecture

- **routes/** — maps URL + HTTP method to a controller. No logic.
- **controllers/** — request/response and status codes. No direct database calls. No try/catch: `async` handlers just `await` the service and respond.
- **services/** — business logic. The only layer that talks to the database. No `req`/`res`.
- **models/** — Mongoose schemas.
- **types/** — API types shared with the client. The client imports these files, so they must not import mongoose, express or models.
- **errors/** — `AppError.ts`: expected errors are thrown as `AppError` subclasses (`ValidationError`, `ConflictError`, `NotFoundError`).
- **middleware/** — `errorHandler.ts` is the only place errors become responses: `AppError` keeps its status, anything else is a 500, always `{ code, message }`.
- **config/** — env variables, DB connection.

## Coding Standards

- Explicit types for every function's parameters and return value.
- Never use `any`. Use `unknown` and narrow it, or define an interface.
- No unhandled promises. Let errors propagate (Express 5 forwards rejected async handlers to the error handler).
- Keep functions small and single-purpose.
- Follow eslint/prettier formatting.

## Frontend (client/)

React + TypeScript + Vite. Only `.ts`/`.tsx` in `client/src/`.

- Functional components only, each with an explicit props interface.
- Data fetching and mutation logic goes in `client/src/hooks/`. Components only render and call hooks. No API calls inside JSX.
- Style with CSS modules or plain CSS, consistently.
- Allowed packages: `react`, `vite`, `axios` (plus the tooling already in `client/package.json`). Ask before adding any other.
- API calls live in `client/src/api/`. Types come from the backend's `src/types/` (don't redefine them) and must match `docs/openapi.yaml`.
- Reach the backend through the Vite `/api` proxy. Don't add CORS to the backend.
- Follow the client's configured linter/formatter.

## Git

- One commit = one logical change.
- Commit messages say what changed and why (cite the rule from this file if relevant).
- Never commit `.env` or secrets.
