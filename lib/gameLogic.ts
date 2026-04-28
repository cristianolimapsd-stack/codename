import type { GameState } from '@/types/game'

const THEME_WORDS: Record<string, string[]> = {
  geral: [
    'casa',
    'ponte',
    'rio',
    'gato',
    'fogo',
    'neve',
    'aviao',
    'praia',
    'sol',
    'lua',
    'floresta',
    'livro',
    'janela',
    'porta',
    'carro',
    'chuva',
    'tigre',
    'cafe',
    'escola',
    'relogio',
    'bateria',
    'cidade',
    'fazenda',
    'telefone',
    'castelo',
    'espada',
    'pintura',
    'oceano',
    'montanha',
    'cinema',
    'hospital',
    'mercado',
    'jardim',
    'computador',
    'prato',
    'espelho',
    'papel',
    'cadeira',
    'mesa',
    'estrada',
    'viagem',
    'caneta',
    'boneco',
    'museu',
    'circo',
    'navio',
    'ilha',
    'deserto',
    'piano',
    'escritorio',
    'nuvem',
    'raio',
    'anel',
    'coroa',
    'escada',
    'foguete',
    'martelo',
    'farol',
    'garfo',
    'areia',
    'banco',
    'caixa',
    'geladeira',
    'tocha',
    'balao',
    'parque',
    'caderno',
    'fotografia',
    'praca',
    'estatua',
    'violin',
    'lanterna',
    'barraca',
    'rodovia',
    'mergulho',
    'caverna',
    'mapa',
    'tesouro',
    'ponteiro',
  ],

  valorant: [
    'jett',
    'reyna',
    'sage',
    'brimstone',
    'omen',
    'viper',
    'raze',
    'sova',
    'cypher',
    'killjoy',
    'yoru',
    'phoenix',
    'neon',
    'harbor',
    'fade',
    'gekko',
    'deadlock',
    'iso',
    'clove',
    'ascent',
    'bind',
    'haven',
    'split',
    'lotus',
    'sunset',
    'pearl',
    'fracture',
    'icebox',
    'abyss',
    'vandal',
    'phantom',
    'operator',
    'ghost',
    'sheriff',
    'marshal',
    'spectre',
    'judge',
    'classic',
    'bulldog',
    'guardian',
    'odin',
    'ares',
    'shorty',
    'frenzy',
    'spike',
    'plant',
    'defuse',
    'clutch',
    'eco',
    'mid',
    'smoke',
    'flash',
    'ult',
    'heaven',
    'hookah',
    'site',
    'duelista',
    'sentinela',
    'controlador',
    'iniciador',
    'armadura',
    'headshot',
    'retake',
    'wallbang',
    'orb',
    'ace',
    'pistol',
    'rush',
    'rotate',
    'default',
    'anchor',
    'lurker',
    'entry',
    'crosshair',
    'bomb',
    'healer',
    'blind',
    'stun',
  ],

  'marvel-rivals': [
    'ironman',
    'spiderman',
    'hulk',
    'thor',
    'loki',
    'storm',
    'magneto',
    'scarletwitch',
    'doctorstrange',
    'blackpanther',
    'rocket',
    'groot',
    'mantis',
    'punisher',
    'hela',
    'venom',
    'namor',
    'magik',
    'starlord',
    'jeff',
    'wanda',
    'banner',
    'mjolnir',
    'bifrost',
    'symbiote',
    'wakanda',
    'xmen',
    'avengers',
    'hydra',
    'multiverse',
    'portal',
    'healer',
    'tank',
    'duelist',
    'ultimate',
    'shield',
    'teleport',
    'web',
    'gamma',
    'asgard',
    'vibranium',
    'mutant',
    'sniper',
    'melee',
    'arena',
    'payload',
    'objective',
    'capture',
    'respawn',
    'guardian',
    'captainamerica',
    'blackwidow',
    'wolverine',
    'psylocke',
    'moonknight',
    'cloak',
    'dagger',
    'adamwarlock',
    'wintersoldier',
    'peni',
    'spiderzero',
    'thanos',
    'ultron',
    'doom',
    'dracula',
    'galactus',
    'cosmic',
    'midtown',
    'tokyo2099',
    'yggsgard',
    'hydraempire',
    'intergalactic',
    'convoy',
    'checkpoint',
    'artifact',
    'rift',
    'dimension',
    'arcane',
    'chaos',
    'energy',
    'repulsor',
    'hammer',
    'frost',
    'lightning',
    'illusion',
    'chaingun',
    'vortex',
    'levitate',
    'telekinesis',
    'berserk',
    'vines',
    'rocketboots',
    'snare',
    'ambush',
    'pulse',
    'blaster',
    'healingorb',
    'barrier',
    'summon',
    'combo',
    'flank',
    'cooldown',
    'respawnroom',
    'objectivepoint',
    'overtime',
    'push',
    'escort',
    'defense',
    'attack',
    'hero',
    'villain',
    'mutants',
    'guardians',
    'avengerstower',
    'dailybugle',
    'sanctum',
    'hellicarrier',
    'latveria',
    'krakoa',
    'hellfire',
    'webswing',
    'rage',
    'charge',
    'slam',
    'blink',
    'crystal',
    'artifactcore',
  ],
}

function shuffle<T>(array: T[]) {
  const copy = [...array]

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function randomStartingTeam(): 'red' | 'blue' {
  return Math.random() < 0.5 ? 'red' : 'blue'
}

export function createInitialState(
  selectedThemes: string[],
  customWords: string[] = []
): GameState {
  const themeWords = selectedThemes.flatMap((theme) => THEME_WORDS[theme] ?? [])
  const wordsPool = [...themeWords, ...customWords]
    .map((word) => word.trim())
    .filter(Boolean)

  if (wordsPool.length < 25) {
    throw new Error('Palavras insuficientes para gerar o tabuleiro. Adicione mais temas ou palavras.')
  }

  const startingTeam = randomStartingTeam()
  const redCount = startingTeam === 'red' ? 9 : 8
  const blueCount = startingTeam === 'blue' ? 9 : 8

  const roles = shuffle([
    ...Array(redCount).fill('red'),
    ...Array(blueCount).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin',
  ])

  const selectedWords = shuffle(wordsPool).slice(0, 25)

  const cards = selectedWords.map((word, index) => ({
    word: word.toUpperCase(),
    team: roles[index],
    revealed: false,
  }))

  return {
    phase: 'lobby',
    theme: selectedThemes.length > 0 ? selectedThemes.join(', ') : 'geral',
    cards,
    currentTurn: startingTeam,
    redLeft: redCount,
    blueLeft: blueCount,
    hint: null,
    hintHistory: [],
    winner: null,
  }
}

export function applyHint(state: GameState, word: string, count: number): GameState {
  const normalizedWord = word.toUpperCase()
  const guessesLeft = count === 0 ? 99 : count + 1

  return {
    ...state,
    hint: {
      word: normalizedWord,
      count,
      team: state.currentTurn,
      guessesLeft,
    },
    hintHistory: [
      {
        word: normalizedWord,
        count,
        team: state.currentTurn,
        guessesLeft,
      },
      ...state.hintHistory,
    ],
  }
}

export function passTurn(state: GameState): GameState {
  return {
    ...state,
    currentTurn: state.currentTurn === 'red' ? 'blue' : 'red',
    hint: null,
  }
}

export function revealCard(state: GameState, index: number): GameState {
  const card = state.cards[index]

  if (!card || card.revealed) {
    return state
  }

  const cards = state.cards.map((item, itemIndex) =>
    itemIndex === index ? { ...item, revealed: true } : item
  )

  let redLeft = state.redLeft
  let blueLeft = state.blueLeft
  let winner = state.winner
  let currentTurn = state.currentTurn
  let hint = state.hint

  if (card.team === 'red') redLeft -= 1
  if (card.team === 'blue') blueLeft -= 1

  if (redLeft <= 0) winner = 'red'
  if (blueLeft <= 0) winner = 'blue'

  if (card.team === 'assassin') {
    winner = state.currentTurn === 'red' ? 'blue' : 'red'
  }

  if (!winner && hint) {
    const hitOwnTeam = card.team === state.currentTurn

    if (hitOwnTeam) {
      const nextGuesses = hint.guessesLeft - 1

      if (nextGuesses <= 0) {
        currentTurn = state.currentTurn === 'red' ? 'blue' : 'red'
        hint = null
      } else {
        hint = {
          ...hint,
          guessesLeft: nextGuesses,
        }
      }
    } else {
      currentTurn = state.currentTurn === 'red' ? 'blue' : 'red'
      hint = null
    }
  }

  return {
    ...state,
    cards,
    redLeft,
    blueLeft,
    currentTurn,
    hint,
    winner,
    phase: winner ? 'finished' : 'playing',
  }
}
