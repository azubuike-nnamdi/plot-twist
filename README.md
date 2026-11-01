# PlotTwist

PlotTwist is a social party game for private rooms. Friends write anonymous answers to the same prompt, guess who wrote each one, and score points when the authors are revealed.

A correct guess is worth 100 points. A wrong guess, a missed guess, and the author of an answer score 0. There is no speed bonus and no streak bonus.

## How a match works

1. **Lobby.** A host creates a room, picks prompt packs, and shares a code such as `TWST-XXXXXXXX` or an invite link. An account is required to host, not to play. Friends join with a name and can save it after the match. While the room is waiting, the host can change rounds, timers, room size, and packs. Each seated player can add one question for this room. A match starts once at least 3 players are in the room.
2. **Answers.** Each player submits one answer. Authors stay hidden.
3. **Guesses.** Answers are shuffled. Players vote for the author of each answer and cannot vote for themselves.
4. **Reveal.** Authors are shown, scores update, and the host moves to the next round.

Rooms can run 3, 5, or 8 rounds, with room sizes of 6, 8, 12, or 16. Answer timers are 20–45 seconds and guess timers are 15–30 seconds, so a match stays within about 10 minutes. Reactions are cosmetic and do not change the score.

## Questions

Each prompt pack is a list of questions. The card count on a pack is how many of those questions are active. A room deals one question per round.

The room draws in this order:

1. Questions players added in that lobby. They belong to that room only. With the clean filter on, the host approves them before they can be dealt. The host's own question is ready immediately.
2. Pack questions nobody currently seated has already heard.
3. A pack question this group has heard, only after the other piles are empty. That card is labeled Replay.

A pack question is used once inside a match. Play again does not copy the lobby questions, and it holds back pack questions this group has already heard.

Staff manage the bank at `/admin/questions`. Add a question, choose its pack, mark it 18+ when it belongs in the adult pack, or deactivate it so rooms stop drawing it. `pnpm db:seed` loads the starting packs and skips a question whose text is already in that pack. Generate new questions before a game, save them as inactive, and publish the ones you want to deal. A round does not wait on a newly generated question.

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
