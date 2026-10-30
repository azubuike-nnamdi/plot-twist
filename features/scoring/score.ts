export const CORRECT_GUESS_POINTS = 100

export function pointsForGuess(isCorrect: boolean) {
  return isCorrect ? CORRECT_GUESS_POINTS : 0
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
