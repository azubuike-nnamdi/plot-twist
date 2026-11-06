/** Points a guesser earns for naming the right author. */
export const CORRECT_GUESS_POINTS = 100
/** Points an author earns for each player who voted for someone else. */
export const BLUFF_POINTS = 50

export function pointsForGuess(isCorrect: boolean) {
  return isCorrect ? CORRECT_GUESS_POINTS : 0
}

export function bluffPointsFor(fooledVotes: number) {
  return Math.max(0, fooledVotes) * BLUFF_POINTS
}

export type UnscoredGuess = {
  id: string
  isCorrect: boolean
  pointsAwarded: number | null
}

export function guessesToScore(guesses: UnscoredGuess[]) {
  return guesses
    .filter((guess) => guess.pointsAwarded === null)
    .map((guess) => ({
      id: guess.id,
      isCorrect: guess.isCorrect,
      pointsAwarded: pointsForGuess(guess.isCorrect),
    }))
}

export type RoundGuess = {
  id: string
  guesserId: string
  authorId: string
  guessedPlayerId: string
  pointsAwarded: number | null
}

/**
 * Score every vote in a round that has not been scored yet.
 * A correct vote gives the guesser 100. A wrong vote gives the author 50 for
 * the bluff. A missed vote (no guess at all) scores nobody. Votes already
 * scored are skipped, so running this twice never pays out twice.
 */
export function tallyRound(guesses: RoundGuess[]) {
  const correctIds: string[] = []
  const wrongIds: string[] = []
  const totals = new Map<string, number>()
  const award = (playerId: string, points: number) => {
    totals.set(playerId, (totals.get(playerId) ?? 0) + points)
  }
  for (const guess of guesses) {
    if (guess.pointsAwarded !== null) continue
    if (guess.guessedPlayerId === guess.authorId) {
      correctIds.push(guess.id)
      award(guess.guesserId, CORRECT_GUESS_POINTS)
    } else {
      wrongIds.push(guess.id)
      award(guess.authorId, BLUFF_POINTS)
    }
  }
  return {
    correctIds,
    wrongIds,
    playerPoints: [...totals].map(([playerId, points]) => ({ playerId, points })),
  }
}
