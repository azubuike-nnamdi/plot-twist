import { presentAnswer } from "@/features/rooms/present"
import type { RoundStatus } from "@/features/rooms/transitions"
import { bluffPointsFor } from "@/features/scoring/score"
import type { AnswerView, LeaderRow, RoomPhase, RoomView } from "@/types/room"

const titles = [
  "Grand Master of Deception",
  "Sharpest Instincts",
  "Chaotic Genius",
  "Master Storyteller",
  "Plot Twister",
]

type Player = {
  id: string
  userId: string
  displayName: string
  avatar: string
  score: number
  status: string
  joinedAt: string
}

type Guess = {
  guesserId: string
  guessedPlayerId: string
  isCorrect: boolean | null
  pointsAwarded: number | null
}

type Answer = {
  id: string
  playerId: string
  text: string
  removed: boolean
  sortKey: number
  guesses: Guess[]
}

export type ViewInput = {
  now: string
  version?: number
  code: string
  name: string
  status: RoomView["status"]
  hostId: string
  viewerUserId: string
  viewerIsGuest?: boolean
  categoryIds?: string[]
  cleanFilter?: boolean
  maxPlayers: number
  totalRounds: number
  currentRound: number
  answerSeconds: number
  guessingSeconds: number
  categories: string[]
  players: Player[]
  round: null | {
    status: RoundStatus
    deadlineAt: string | null
    question: string
    categoryName: string
    askedBy?: string | null
    isReplay?: boolean
    answers: Answer[]
    reactions: { emoji: string; playerId: string }[]
  }
  history: {
    guesserId: string
    authorId?: string
    isCorrect: boolean | null
    pointsAwarded: number | null
  }[]
}

function active(player: Player) {
  return player.status === "JOINED" || player.status === "READY"
}

function titleFor(index: number) {
  return titles[index] ?? "Party Player"
}

function hasLockedIn(phase: RoomPhase, playerId: string, round: ViewInput["round"]) {
  if (!round) return false
  if (phase === "ANSWERING") {
    return round.answers.some((answer) => answer.playerId === playerId)
  }
  if (phase === "GUESSING") {
    const needed = round.answers.filter((answer) => answer.playerId !== playerId)
    return (
      needed.length > 0 &&
      needed.every((answer) => answer.guesses.some((guess) => guess.guesserId === playerId))
    )
  }
  return false
}

export function buildRoomView(input: ViewInput): RoomView {
  const you = input.players.find((player) => player.userId === input.viewerUserId)
  if (!you) {
    throw new Error("Viewer is not in this room")
  }
  const round = input.round
  const phase: RoomPhase =
    input.status === "COMPLETED" || input.status === "CLOSED"
      ? "RESULTS"
      : !round || input.status === "WAITING"
        ? "LOBBY"
        : round.status === "ANSWERING"
          ? "ANSWERING"
          : round.status === "GUESSING"
            ? "GUESSING"
            : round.status === "REVEAL" || round.status === "COMPLETED"
              ? "REVEAL"
              : "LOBBY"
  const showAuthors = phase === "REVEAL" || phase === "RESULTS"
  const showTexts = phase === "GUESSING" || showAuthors
  const playersById = new Map(input.players.map((player) => [player.id, player]))
  const answers: AnswerView[] = showTexts
    ? [...(round?.answers ?? [])]
      .sort((left, right) => left.sortKey - right.sortKey)
      .filter((answer) => answer.playerId !== you.id || showAuthors)
      .map((answer) => {
        const author = playersById.get(answer.playerId)
        const presented = presentAnswer({
          id: answer.id,
          text: answer.text,
          removed: answer.removed,
          phase: round?.status ?? "PENDING",
          author: {
            playerId: answer.playerId,
            displayName: author?.displayName ?? "Player",
          },
        })
        const yourGuess = answer.guesses.find(
          (guess) => guess.guesserId === you.id
        )
        const view: AnswerView = {
          id: presented.id,
          text: presented.text,
          yourGuessId: yourGuess?.guessedPlayerId ?? null,
        }
        if (presented.author && showAuthors) {
          view.author = presented.author
          const fooled = answer.guesses.filter(
            (guess) => guess.pointsAwarded !== null && guess.isCorrect === false
          ).length
          view.fooledCount = fooled
          view.bluffPoints = bluffPointsFor(fooled)
          view.votes = answer.guesses.map((guess) => ({
            displayName:
              playersById.get(guess.guesserId)?.displayName ?? "Player",
            guessedName:
              playersById.get(guess.guessedPlayerId)?.displayName ?? "Player",
            correct: guess.isCorrect === true,
            points: guess.pointsAwarded ?? 0,
            isYou: guess.guesserId === you.id,
          }))
        }
        return view
      })
    : []
  const reactionCounts = new Map<string, number>()
  for (const reaction of round?.reactions ?? []) {
    reactionCounts.set(
      reaction.emoji,
      (reactionCounts.get(reaction.emoji) ?? 0) + 1
    )
  }
  const leaderboard: LeaderRow[] = [...input.players]
    .filter(active)
    .sort(
      (left, right) =>
        right.score - left.score || left.joinedAt.localeCompare(right.joinedAt)
    )
    .map((player, index) => ({
      playerId: player.id,
      displayName: player.displayName,
      avatar: player.avatar,
      score: player.score,
      correctGuesses: correctGuessesFor(input, player.id),
      fooled: fooledBy(input, player.id),
      accuracy: accuracyFor(input, player.id),
      title: titleFor(index),
    }))
  return {
    code: input.code,
    name: input.name,
    status: input.status,
    phase,
    youAreHost: input.hostId === input.viewerUserId,
    youAreGuest: input.viewerIsGuest === true,
    yourPlayerId: you.id,
    yourDisplayName: you.displayName,
    yourScore: you.score,
    yourAvatar: you.avatar,
    maxPlayers: input.maxPlayers,
    totalRounds: input.totalRounds,
    currentRound: input.currentRound,
    answerSeconds: input.answerSeconds,
    guessingSeconds: input.guessingSeconds,
    deadlineAt:
      phase === "ANSWERING" || phase === "GUESSING"
        ? (round?.deadlineAt ?? null)
        : null,
    categories: input.categories,
    askedBy: showAuthors ? (input.round?.askedBy ?? null) : null,
    isReplay: input.round?.isReplay === true && phase !== "LOBBY",
    categoryIds: input.categoryIds ?? [],
    cleanFilter: input.cleanFilter === true,
    players: input.players.filter(active).map((player) => ({
      id: player.id,
      displayName: player.displayName,
      avatar: player.avatar,
      score: player.score,
      status: player.status,
      isHost: player.userId === input.hostId,
      isYou: player.userId === input.viewerUserId,
      ready: player.status === "READY",
      lockedIn: hasLockedIn(phase, player.id, round),
    })),
    question: round && phase !== "LOBBY" ? round.question : null,
    categoryName: round && phase !== "LOBBY" ? round.categoryName : null,
    submittedCount: round?.answers.length ?? 0,
    expectedAnswers: input.players.filter(active).length,
    yourAnswer:
      round?.answers.find((answer) => answer.playerId === you.id)?.text ?? null,
    answers,
    reactions: [...reactionCounts.entries()].map(([emoji, count]) => ({
      emoji,
      count,
    })),
    leaderboard,
    serverNow: input.now,
    version: input.version ?? 0,
  }
}

/** How many votes this player's answers drew away from them across the match. */
function fooledBy(input: ViewInput, playerId: string) {
  return input.history.filter(
    (guess) =>
      guess.authorId === playerId && guess.pointsAwarded !== null && guess.isCorrect === false
  ).length
}

function correctGuessesFor(input: ViewInput, playerId: string) {
  return input.history.filter(
    (guess) => guess.guesserId === playerId && guess.isCorrect
  ).length
}

function accuracyFor(input: ViewInput, playerId: string) {
  const made = input.history.filter(
    (guess) => guess.guesserId === playerId && guess.pointsAwarded !== null
  )
  if (made.length === 0) return 0
  const correct = made.filter((guess) => guess.isCorrect).length
  return Math.round((correct / made.length) * 100)
}
