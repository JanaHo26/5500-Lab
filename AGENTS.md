# AGENTS.md

This file tells any AI coding agent (Claude Code, Cursor, etc.) the rules for this repo. Follow these when generating or editing code here. If something I ask for conflicts with these rules, ask me first instead of just ignoring the rules.

## Tech Stack & Libraries

Only use TypeScript, no `.js` files anywhere in `src/`.
Backend runs on Node.js + Express. Database is MongoDB, accessed through Mongoose.

Only allowed packages: `typescript`, `ts-node`, `@types/node`, `express`, `@types/express`, `mongoose`, `dotenv`, `eslint`, `prettier`.
Don't add any other package without asking me first.

## Architectural Boundaries

Code must be split into 3 layers, don't mix them together:

- **routes/** — just maps a URL + HTTP method to a controller function. No logic here.
- **controllers/** — handles the request/response and status codes. No direct database calls allowed here.
- **services/** — where the actual business logic lives. This is the only layer allowed to talk to the database. No `req`/`res` stuff should show up here.

Other folders:
- **models/** — Mongoose schemas and their TypeScript types
- **middleware/** — stuff like error handling
- **config/** — env variables, DB connection setup

Basically: routes just route, controllers just handle, services do the actual work.

## Coding Standards & Safety

- Every function needs explicit types for its parameters and return value (interface or type). Don't let TypeScript just infer everything.
- Never use `any`. If the type is unclear, use `unknown` and narrow it, or just define a proper interface.
- All async code needs error handling — no unhandled promises. Use try/catch in controllers or route errors to a centralized error handler.
- Keep functions small and focused on one thing.
- Follow eslint/prettier formatting, don't format code your own way.

## Frontend (client/)

React + TypeScript + Vite project in `client/`. Only `.ts`/`.tsx` files in `client/src/`.

- Functional components only, and every component has an explicit props interface.
- Use `useState`/`useEffect` or custom hooks. No API calls directly inside JSX.
- Keep styling consistent: use CSS modules or plain CSS.
- Allowed packages: `react`, `vite`, `axios` (plus the TypeScript/React tooling already in `client/package.json`). Don't add any other package without asking me first.
- API calls live in `client/src/api/`, and their types must match `docs/openapi.yaml`.
- The frontend reaches the backend through the Vite proxy for `/api`. Don't add CORS to the backend.
- Follow the client's configured linter/formatter, don't format code your own way.

## Git & Commit Formatting

- One commit = one logical change, don't bundle unrelated stuff together.
- Commit messages need to say what was changed and why (mention which rule from this file applied if relevant).
- Never commit `.env` or anything with secrets. `node_modules` and `dist` also stay out — already handled in `.gitignore`.
