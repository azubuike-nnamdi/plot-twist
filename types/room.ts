export type RoomPhase =
  | "LOBBY"
  | "ANSWERING"
  | "GUESSING"
  | "REVEAL"
  | "RESULTS"

export type RoomPlayerView = {
  id: string
  displayName: string
  avatar: string
  score: number
  status: string
  isHost: boolean
  isYou: boolean
  ready: boolean
  lockedIn: boolean
}

export type RevealedVote = {
  displayName: string
  guessedName: string
  correct: boolean
  points: number
  isYou: boolean
}

export type AnswerView = {
  id: string
  text: string
  author?: {
    playerId: string
    displayName: string
  }
  yourGuessId: string | null
  votes?: RevealedVote[]
  /** Scored votes that named someone else. Shown once authors are revealed. */
  fooledCount?: number
  /** Points the author earned for fooling those voters. */
  bluffPoints?: number
}

export type LeaderRow = {
  playerId: string
  displayName: string
  avatar: string
  score: number
  correctGuesses: number
  fooled: number
  accuracy: number
  title: string
}

export type RoomView = {
  code: string
  name: string
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CLOSED"
  phase: RoomPhase
  youAreHost: boolean
  youAreGuest: boolean
  yourPlayerId: string
  yourDisplayName: string
  yourScore: number
  yourAvatar: string
  maxPlayers: number
  totalRounds: number
  currentRound: number
  answerSeconds: number
  guessingSeconds: number
  deadlineAt: string | null
  categories: string[]
  categoryIds: string[]
  cleanFilter: boolean
  askedBy: string | null
  isReplay: boolean
  players: RoomPlayerView[]
  question: string | null
  categoryName: string | null
  submittedCount: number
  expectedAnswers: number
  yourAnswer: string | null
  answers: AnswerView[]
  reactions: { emoji: string; count: number }[]
  leaderboard: LeaderRow[]
  serverNow: string
  version: number
}

/** Returned by the state poll when the client's copy is still current. */
export type RoomPollUnchanged = {
  unchanged: true
  version: number
  serverNow: string
}

export type RoomPreview = {
  code: string
  name: string
  status: RoomView["status"]
  playerCount: number
  maxPlayers: number
  categories: string[]
  expired: boolean
}
