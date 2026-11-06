# Contributing to PlotTwist

Thanks for helping improve PlotTwist. This guide covers local setup, checks, and how to send a change.

## Before you start

1. Install [pnpm](https://pnpm.io/) and Node.js.
2. Fork the repository and clone your fork.
3. Copy `.env.example` to `.env` and fill in the values on your machine.
4. Apply the database schema and seed data:

```bash
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Keep secrets out of git. `.env` is ignored. Integration tests need their own database in `DATABASE_URL_TEST`. Do not point that variable at a database you use for the app.

## What to change

- Match the existing Next.js App Router layout, server actions, and Prisma models.
- Keep game rules on the server. A correct guess is 100 points to the guesser. A wrong vote is 50 bluff points to the answer's author. A missed guess scores nobody.
- Room codes stay in the form `TWST-XXXXXXXX`.
- An account is required to host, not to play. Guests join with a name and cannot be promoted to host.

## Checks

Run these before you open a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm test:integration` runs only when `DATABASE_URL_TEST` is set. The pre-commit hook runs lint. The pre-push hook runs the production build and the type check.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/). The subject is imperative, lowercase, and has no final period.

```text
feat: add a prompt pack filter
fix: keep authors hidden during guessing
```

Allowed types include `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `style`, `build`, `ci`, and `security`. A scope is optional and must be lowercase: `feat(rooms): share the invite link`.

## Pull requests

- Describe what changed and why.
- Note how you tested it.
- Include screenshots when the change is visible in the interface.
- Keep the pull request focused on one change.
