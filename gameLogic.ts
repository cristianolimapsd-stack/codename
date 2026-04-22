import type { Card, GameState, Team } from '@/types/game'
import { getWordBank } from './wordbanks'

export function generateBoard(themes: string[], customWords: string[]): Card[] {
  const pool = getWordBank(themes, customWords)
  if (pool.length < 25) throw new Error('Palavras insuficientes para gerar o tabuleiro.')

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 25)

  // Distribuição: 9 red, 8 blue, 7 neutral, 1 assassin (red começa)
  const teams: Team[] = [
    ...Array(9).fill('red'),
    ...Array(8).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin',
  ].sort(() => Math.random() - 0.5) as Team[]

  return shuffled.map((word, i) => ({
    word,
    team: teams[i],
    revealed: false,
  }))
}

export function createInitialState(themes: string[], customWords: string[]): GameState {
  const cards = generateBoard(themes, customWords)
  return {
    cards,
    currentTurn: 'red',
    phase: 'playing',
    winner: null,
    hint: null,
    hintHistory: [],
    redLeft: 9,
    blueLeft: 8,
    theme: themes.join(','),
  }
}

export function revealCard(state: GameState, index: number): GameState {
  if (state.phase !== 'playing') return state
  if (state.cards[index].revealed) return state

  const newCards = state.cards.map((c, i) =>
    i === index ? { ...c, revealed: true } : c
  )
  const card = newCards[index]
  let { redLeft, blueLeft, winner, currentTurn, hint } = state

  // Assassino: time atual perde
  if (card.team === 'assassin') {
    winner = currentTurn === 'red' ? 'blue' : 'red'
    return { ...state, cards: newCards, winner, phase: 'finished' }
  }

  if (card.team === 'red') redLeft--
  if (card.team === 'blue') blueLeft--

  if (redLeft === 0) winner = 'red'
  if (blueLeft === 0) winner = 'blue'

  // Se errou (revelou carta neutra ou do adversário) → passa turno
  let newHint = hint
  if (card.team !== currentTurn) {
    currentTurn = currentTurn === 'red' ? 'blue' : 'red'
    newHint = null
  } else if (hint) {
    // Acertou: decrementa tentativas restantes
    const guessesLeft = hint.guessesLeft - 1
    if (guessesLeft <= 0) {
      currentTurn = currentTurn === 'red' ? 'blue' : 'red'
      newHint = null
    } else {
      newHint = { ...hint, guessesLeft }
    }
  }

  return {
    ...state,
    cards: newCards,
    redLeft,
    blueLeft,
    winner,
    currentTurn,
    hint: newHint,
    phase: winner ? 'finished' : 'playing',
  }
}

export function applyHint(
  state: GameState,
  word: string,
  count: number
): GameState {
  if (state.phase !== 'playing') return state
  const hint = {
    word,
    count,
    team: state.currentTurn as 'red' | 'blue',
    guessesLeft: count + 1, // +1 hint bonus
  }
  return {
    ...state,
    hint,
    hintHistory: [hint, ...state.hintHistory],
  }
}

export function passTurn(state: GameState): GameState {
  return {
    ...state,
    currentTurn: state.currentTurn === 'red' ? 'blue' : 'red',
    hint: null,
  }
}
