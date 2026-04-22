export type Team = 'red' | 'blue' | 'neutral' | 'assassin'
export type PlayerRole = 'spymaster' | 'operative'
export type PlayerTeam = 'red' | 'blue' | 'spectator'
export type GamePhase = 'lobby' | 'playing' | 'finished'

export interface Card {
  word: string
  team: Team
  revealed: boolean
}

export interface Hint {
  word: string
  count: number
  team: PlayerTeam
  guessesLeft: number
}

export interface GameState {
  cards: Card[]
  currentTurn: 'red' | 'blue'
  phase: GamePhase
  winner: 'red' | 'blue' | null
  hint: Hint | null
  hintHistory: Hint[]
  redLeft: number
  blueLeft: number
  theme: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  team: PlayerTeam
  role: PlayerRole
}
