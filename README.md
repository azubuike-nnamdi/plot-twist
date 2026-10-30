# PlotTwist

PlotTwist is a social party game for private rooms. Friends write anonymous answers to the same prompt, guess who wrote each one, and score points when the authors are revealed.

A correct guess is worth 100 points. A wrong guess, a missed guess, and the author of an answer score 0. There is no speed bonus and no streak bonus.

## How a match works

1. **Lobby.** A host creates a room, picks prompt packs, and shares a code such as `TWST-XXXXXXXX` or an invite link. Everyone who joins needs an account. A match starts once at least 3 players are in the room.
2. **Answers.** Each player submits one answer. Authors stay hidden.
3. **Guesses.** Answers are shuffled. Players vote for the author of each answer and cannot vote for themselves.
4. **Reveal.** Authors are shown, scores update, and the host moves to the next round.

Rooms can run 3, 5, or 8 rounds, with room sizes of 6, 8, 12, or 16. Answer timers are 30–90 seconds. Guess timers are 30–60 seconds. Reactions are cosmetic and do not change the score.

## Stack

Next.js, React, TypeScript, Tailwind CSS, Prisma, Neon Postgres, and Better Auth. The app is a single Next.js project. Game rules run on the server.

## Local setup

Install dependencies, then copy the environment template and fill in the values locally. Do not commit `.env`.

```bash
pnpm install
cp .env.example .env
```

Apply the schema, load the prompt packs and platform settings, then start the app:

```bash
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Create the first staff account when you want the admin console. The command reads `ADMIN_EMAIL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` from the environment at run time:

```bash
pnpm admin:create
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the local app |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run the TypeScript check |
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run database tests. Requires `DATABASE_URL_TEST` |
| `pnpm db:migrate` | Create or apply a development migration |
| `pnpm db:seed` | Load prompt packs and platform settings |
| `pnpm admin:create` | Create or promote the first staff account |

## Project docs

- [Contribution guide](CONTRIBUTION.md)
- [License](LICENSE.md)
