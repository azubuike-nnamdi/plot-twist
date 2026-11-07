# PlotTwist

PlotTwist is a social party game for private rooms. Friends write anonymous answers to the same prompt, guess who wrote each one, and score points when the authors are revealed.

A correct guess is worth 100 points to the guesser. Each wrong vote on an answer is worth 50 bluff points to its author, so it pays to disguise your style. A missed guess scores nobody. There is no speed bonus and no streak bonus.

## How a match works

1. **Lobby.** A host creates a room, picks prompt packs, and shares a code such as `TWST-XXXXXXXX` or an invite link. An account is required to host, not to play. Friends join with a name and can save it after the match. While the room is waiting, the host can change rounds, timers, room size, and packs. A match starts once at least 2 players are in the room.
2. **Answers.** Each player submits one answer. Authors stay hidden.
3. **Guesses.** Answers are shuffled. Players vote for the author of each answer and cannot vote for themselves.
4. **Reveal.** Authors are shown, scores update, and the host moves to the next round.

Rooms can run 3, 5, or 8 rounds, with room sizes of 6, 8, 12, or 16. Answer timers are 20–45 seconds and guess timers are 15–30 seconds, so a match stays within about 10 minutes. Reactions are cosmetic and do not change the score.

## Questions

Ollama writes every question. There are no hardcoded questions; `pnpm db:seed` only creates the packs.

Production uses [Ollama Cloud](https://docs.ollama.com/cloud). Set `OLLAMA_API_KEY` (from ollama.com → Settings → Keys) and the app calls `https://ollama.com` with `gpt-oss:120b`. Set `OLLAMA_MODEL` to use another cloud model (`curl https://ollama.com/api/tags` lists them). Without a key, the app expects a local Ollama at `http://127.0.0.1:11434` running `llama3.2`.

- **Every night at 00:00 UTC** Vercel Cron calls `/api/cron/questions`. For each active pack the server asks Ollama for `QUESTIONS_PER_PACK` new questions (30 by default), in calls of 10, with rotating themes so batches differ from night to night.
- **No manual approval.** Each question must pass an automatic filter before it goes live. It has to be one question ending in `?`, 8 to 160 characters, with no links. It cannot cover self-harm, minors in any romantic or sexual context, slurs, extremism, politics, or religion. Clean packs also block sex, drugs, alcohol, and swearing. Questions that fail are dropped.
- **No repeats.** A fingerprint of every published question is kept for 90 days, and new drafts that match one are dropped.
- **24-hour lifetime.** Each batch expires at the next midnight, when the new batch replaces it. A pack whose generation fails or returns fewer than 8 usable questions keeps its current batch, so rooms never run dry. Rounds store their own copy of the question text, so a match in progress at midnight is not affected.
- **Staff tools** at `/admin/questions`: top up one pack now, run the whole midnight refresh now (do this right after the first deploy), deactivate any question, or write a permanent question by hand.

A room deals one question per round: first questions nobody seated has heard, and then, only when those run out, a Replay.

## Live updates

Rooms update in real time through [Pusher Channels](https://pusher.com/channels) when `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, and `PUSHER_CLUSTER` are set. After each change the server sends only a version number on a private room channel, and each browser refetches its own view. Without those keys, or while a socket is down, rooms poll every second instead, so push is optional.

## Stack

Next.js, React, TypeScript, Tailwind CSS, Prisma, Neon Postgres, and Better Auth. The app is a single Next.js project. Game rules run on the server.

## Local setup

Install dependencies, then copy the environment template and fill in the values locally. Do not commit `.env`.

```bash
pnpm install
cp .env.example .env
```

`DATABASE_URL` is the pooled connection the app uses. `DATABASE_URL_UNPOOLED` is the direct connection Prisma uses for migrations. If you have no pooler, set both to the same URL.

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
