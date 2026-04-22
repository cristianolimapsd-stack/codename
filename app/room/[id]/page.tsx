'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { applyHint, createInitialState, passTurn, revealCard } from '@/lib/gameLogic'
import type { GameState, Player, PlayerRole, PlayerTeam } from '@/types/game'

const TEAM_SURFACES = {
  red: {
    panel: 'from-[#a53f2f] via-[#c55342] to-[#df7159]',
    border: 'border-[#f29a84]/45',
    text: 'text-[#ffb9ab]',
    badge: 'bg-[#d85b49]',
    shadow: 'shadow-[0_18px_45px_rgba(216,91,73,0.2)]',
  },
  blue: {
    panel: 'from-[#145c8b] via-[#247ebd] to-[#4da7e8]',
    border: 'border-[#88d3ff]/45',
    text: 'text-[#a8d9ff]',
    badge: 'bg-[#3f8ed8]',
    shadow: 'shadow-[0_18px_45px_rgba(63,142,216,0.2)]',
  },
} as const

const AVATAR_PALETTE = [
  { shell: 'from-[#ffe4a8] to-[#ffbf5d]', plate: 'bg-[#7a4300]' },
  { shell: 'from-[#d5f1ff] to-[#7cc7ff]', plate: 'bg-[#0b4b7e]' },
  { shell: 'from-[#ffd1d1] to-[#ff8d8d]', plate: 'bg-[#7d1d1d]' },
  { shell: 'from-[#e0dcff] to-[#a79cff]', plate: 'bg-[#43327d]' },
  { shell: 'from-[#d7ffd8] to-[#77e286]', plate: 'bg-[#1f6b32]' },
]

type DetailedHintEntry = {
  word: string
  count: number
  team: PlayerTeam
  picks: string[]
}

type ExtendedGameState = GameState & {
  roomAdminId?: string
  detailedHintHistory?: DetailedHintEntry[]
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function getAvatarTheme(seed: string) {
  const total = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_PALETTE[total % AVATAR_PALETTE.length]
}

function getThemesFromState(gameState: GameState) {
  if (Array.isArray(gameState.theme)) return gameState.theme
  if (typeof gameState.theme === 'string' && gameState.theme.trim()) return [gameState.theme]
  return ['geral']
}

function asExtendedState(state: GameState | null) {
  return state as ExtendedGameState | null
}

function randomTeam(): 'red' | 'blue' {
  return Math.random() < 0.5 ? 'red' : 'blue'
}

function PersonBadge({
  name,
  crowned = false,
  small = false,
}: {
  name: string
  crowned?: boolean
  small?: boolean
}) {
  const avatarTheme = getAvatarTheme(name)

  return (
    <div className="relative flex flex-col items-center">
      {crowned ? (
        <div
          className={cn(
            'absolute z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]',
            small ? '-left-1 top-0 text-xl' : '-left-1 top-0 text-[28px]'
          )}
        >
          👑
        </div>
      ) : null}

      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border border-white/30 bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
          avatarTheme.shell,
          small ? 'h-12 w-12' : 'h-24 w-24'
        )}
      >
        <svg
          width={small ? 26 : 54}
          height={small ? 26 : 54}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="32" cy="22" r="12" fill="rgba(255,255,255,0.82)" />
          <path d="M14 55c2-10 10-16 18-16s16 6 18 16" fill="rgba(255,255,255,0.82)" />
        </svg>

        <div
          className={cn(
            'absolute rounded-full px-2 py-1 text-center font-black text-white',
            avatarTheme.plate,
            small ? 'inset-x-1 bottom-1 text-[9px]' : 'inset-x-3 bottom-2 text-sm'
          )}
        >
          {small ? getInitials(name) : name}
        </div>
      </div>
    </div>
  )
}

type RoleCardProps = {
  title: string
  placeholder: string
  occupiedBy?: Player
  active: boolean
  onClick: () => void
}

function RoleCard({ title, placeholder, occupiedBy, active, onClick }: RoleCardProps) {
  return (
    <div className="mt-3 rounded-[22px] border border-white/15 bg-black/12 px-4 py-4 text-center">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
        {title}
      </p>

      <div className="mt-3 flex min-h-[132px] flex-col items-center justify-center gap-3">
        {occupiedBy ? (
          <>
            <PersonBadge name={occupiedBy.name} crowned={active} />
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/55">
              {occupiedBy.role === 'spymaster' ? 'Mestre-Espiao' : 'Agente'}
            </p>
          </>
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/8 text-2xl font-black text-white/85">
              {getInitials(placeholder)}
            </div>
            <div>
              <p className="text-2xl font-black uppercase tracking-[0.06em]">{placeholder}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Vaga disponivel
              </p>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className={cn(
          'mt-4 w-full rounded-full border border-[#97db56]/50 bg-gradient-to-b from-[#31c200] to-[#1b7f00] px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110',
          active && 'ring-2 ring-[#cbff94]/50'
        )}
      >
        {active ? 'Selecionado' : occupiedBy ? 'Trocar' : 'Join Team'}
      </button>
    </div>
  )
}

type TeamSidebarProps = {
  team: 'red' | 'blue'
  players: Player[]
  me: Player | null
  remaining: number
  onPickRole: (team: PlayerTeam, role: PlayerRole) => void
}

function TeamSidebar({ team, players, me, remaining, onPickRole }: TeamSidebarProps) {
  const palette = TEAM_SURFACES[team]
  const teamLabel = team === 'red' ? 'vermelho' : 'azul'
  const agentLabel = team === 'red' ? 'Phoenix' : 'Jett'
  const spymasterLabel = team === 'red' ? 'Brimstone' : 'Sova'
  const operatives = players.filter((player) => player.role === 'operative')
  const spymasters = players.filter((player) => player.role === 'spymaster')
  const operativeSpotlight = operatives.find((player) => player.id === me?.id) ?? operatives[0]
  const spymasterSpotlight = spymasters.find((player) => player.id === me?.id) ?? spymasters[0]

  return (
    <aside className="flex w-full max-w-[235px] flex-col gap-3 xl:w-[235px]">
      <div
        className={cn(
          'relative overflow-hidden rounded-[26px] border bg-gradient-to-b p-4 text-white',
          palette.panel,
          palette.border,
          palette.shadow
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
        <div className="relative">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
            Agentes
          </p>
          <RoleCard
            title="Linha de frente"
            placeholder={agentLabel}
            occupiedBy={operativeSpotlight}
            active={me?.team === team && me?.role === 'operative'}
            onClick={() => onPickRole(team, 'operative')}
          />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[#131c2d]">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-30',
            team === 'red' ? 'from-[#fb8a69] to-transparent' : 'from-[#76c2ff] to-transparent'
          )}
        />
        <div className="relative flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
              Restantes
            </p>
            <p className={cn('text-4xl font-black leading-none', palette.text)}>{remaining}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{teamLabel}</p>
            <p className="text-xs font-bold text-white/80">
              {players.length} jogador{players.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-[26px] border bg-gradient-to-b p-4 text-white',
          palette.panel,
          palette.border
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_34%)]" />
        <div className="relative">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
            Mestres-Espioes
          </p>
          <RoleCard
            title="Visao secreta"
            placeholder={spymasterLabel}
            occupiedBy={spymasterSpotlight}
            active={me?.team === team && me?.role === 'spymaster'}
            onClick={() => onPickRole(team, 'spymaster')}
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-[#151515]/35 p-3">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/55">Elenco</p>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold',
                player.id === me?.id
                  ? `${palette.badge} border-transparent text-white`
                  : 'border-white/10 bg-white/5 text-white/75'
              )}
            >
              <PersonBadge name={player.name} small />
              <span className="flex-1 truncate">{player.name}</span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/65">
                {player.role === 'spymaster' ? 'Espiao' : 'Agente'}
              </span>
            </div>
          ))}
          {players.length === 0 ? (
            <p className="text-xs italic text-white/35">Nenhum jogador neste time ainda.</p>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

type SettingsModalProps = {
  open: boolean
  me: Player | null
  isAdmin: boolean
  onClose: () => void
  onPickRole: (team: PlayerTeam, role: PlayerRole) => void
}

function SettingsModal({ open, me, isAdmin, onClose, onPickRole }: SettingsModalProps) {
  if (!open) return null

  const isActive = (team: PlayerTeam, role: PlayerRole) => me?.team === team && me?.role === role

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#3a3a3a_0%,#272727_100%)] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#444] px-4 py-2 text-sm font-black text-white">
              Jogador
            </div>
            {isAdmin ? (
              <div className="rounded-xl bg-[#228b12] px-3 py-2 text-xs font-black uppercase text-white">
                Admin
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4 rounded-[22px] bg-white/5 p-4">
          <PersonBadge name={me?.name || 'Jogador'} crowned={isAdmin} />
          <div className="flex-1">
            <p className="text-sm font-black text-white/65">Apelido</p>
            <div className="mt-2 rounded-xl bg-white px-4 py-3 text-xl font-bold text-[#1b1b1b]">
              {me?.name || 'Jogador'}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-black p-4">
          <p className="mb-4 text-center text-xl font-black text-white">Selecionar papel</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPickRole('blue', 'operative')}
              className={cn(
                'rounded-full px-4 py-4 text-base font-black text-white transition',
                isActive('blue', 'operative')
                  ? 'bg-[#2aa5ff] ring-2 ring-white/40'
                  : 'bg-[#168fe4] hover:brightness-110'
              )}
            >
              Agentes azuis
            </button>
            <button
              type="button"
              onClick={() => onPickRole('red', 'operative')}
              className={cn(
                'rounded-full px-4 py-4 text-base font-black text-white transition',
                isActive('red', 'operative')
                  ? 'bg-[#ff6454] ring-2 ring-white/40'
                  : 'bg-[#ff5647] hover:brightness-110'
              )}
            >
              Agentes vermelhos
            </button>
            <button
              type="button"
              onClick={() => onPickRole('blue', 'spymaster')}
              className={cn(
                'rounded-full px-4 py-4 text-base font-black text-white transition',
                isActive('blue', 'spymaster')
                  ? 'bg-[#2aa5ff] ring-2 ring-white/40'
                  : 'bg-[#168fe4] hover:brightness-110'
              )}
            >
              Mestres-espioes azuis
            </button>
            <button
              type="button"
              onClick={() => onPickRole('red', 'spymaster')}
              className={cn(
                'rounded-full px-4 py-4 text-base font-black text-white transition',
                isActive('red', 'spymaster')
                  ? 'bg-[#ff6454] ring-2 ring-white/40'
                  : 'bg-[#ff5647] hover:brightness-110'
              )}
            >
              Mestres-espioes vermelhos
            </button>
          </div>
          <button
            type="button"
            onClick={() => onPickRole('spectator', 'operative')}
            className={cn(
              'mt-3 w-full rounded-full border-2 px-4 py-4 text-base font-black text-white transition',
              me?.team === 'spectator'
                ? 'border-white bg-white/10 ring-2 ring-white/20'
                : 'border-white/80 bg-transparent hover:bg-white/10'
            )}
          >
            Espectadores
          </button>
        </div>
      </div>
    </div>
  )
}

function getCardClasses(team: GameState['cards'][number]['team'], visible: boolean) {
  let outerClass = 'border-[#f4d4ac]/55 bg-[linear-gradient(180deg,#f7d9b2_0%,#ecc79a_100%)]'
  let innerClass = 'border-[#d1aa77] bg-[linear-gradient(180deg,#f8dcba_0%,#f3d1a8_100%)]'
  let labelClass = 'bg-[linear-gradient(180deg,#b78c60_0%,#9f774f_100%)] text-white'

  if (visible) {
    if (team === 'red') {
      outerClass = 'border-[#ffb09d]/40 bg-[linear-gradient(180deg,#f18a79_0%,#df6d5d_100%)]'
      innerClass = 'border-[#efb4ab]/20 bg-[linear-gradient(180deg,#ef7b68_0%,#e36959_100%)]'
      labelClass = 'bg-[linear-gradient(180deg,#c84c39_0%,#b6402f_100%)] text-white'
    } else if (team === 'blue') {
      outerClass = 'border-[#9fd9ff]/40 bg-[linear-gradient(180deg,#73b8f6_0%,#5a9fe1_100%)]'
      innerClass = 'border-[#bee4ff]/20 bg-[linear-gradient(180deg,#67aff0_0%,#4f97dd_100%)]'
      labelClass = 'bg-[linear-gradient(180deg,#3f83c9_0%,#2d72b8_100%)] text-white'
    } else if (team === 'neutral') {
      outerClass = 'border-[#ead3ae]/45 bg-[linear-gradient(180deg,#e8d1ac_0%,#d9bf97_100%)]'
      innerClass = 'border-[#f4e2c7]/20 bg-[linear-gradient(180deg,#dfc7a2_0%,#cfb187_100%)]'
      labelClass = 'bg-[linear-gradient(180deg,#b79263_0%,#9f7a50_100%)] text-white'
    } else {
      outerClass = 'border-white/15 bg-[linear-gradient(180deg,#313131_0%,#1f1f1f_100%)]'
      innerClass = 'border-white/10 bg-[linear-gradient(180deg,#242424_0%,#171717_100%)]'
      labelClass = 'bg-[linear-gradient(180deg,#101010_0%,#0a0a0a_100%)] text-white'
    }
  }

  return { outerClass, innerClass, labelClass }
}

export default function RoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [me, setMe] = useState<Player | null>(null)
  const [hintWord, setHintWord] = useState('')
  const [hintCount, setHintCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [phase, setPhase] = useState<'lobby' | 'game'>('lobby')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingRevealIndex, setPendingRevealIndex] = useState<number | null>(null)
  const [spySelections, setSpySelections] = useState<number[]>([])

  const extendedState = asExtendedState(gameState)

  useEffect(() => {
    const stored = localStorage.getItem(`codenames_player_${roomId}`)
    if (stored) {
      const { id } = JSON.parse(stored)
      setMe((prev) => prev || { id, room_id: roomId, name: '', team: 'spectator', role: 'operative' })
    }
  }, [roomId])

  useEffect(() => {
    const load = async () => {
      const { data: room } = await supabase.from('rooms').select('state').eq('id', roomId).single()
      if (room) {
        setGameState(room.state as GameState)
        if ((room.state as GameState).phase !== 'lobby') setPhase('game')
      }

      const { data: playerList } = await supabase.from('players').select('*').eq('room_id', roomId)
      if (playerList) setPlayers(playerList as Player[])

      const stored = localStorage.getItem(`codenames_player_${roomId}`)
      if (stored && playerList) {
        const { id } = JSON.parse(stored)
        const found = playerList.find((player: Player) => player.id === id)
        if (found) setMe(found as Player)
      }

      setLoading(false)
    }

    load()
  }, [roomId])

  useEffect(() => {
    const roomSub = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const state = payload.new.state as GameState
          setGameState(state)
          if (state.phase !== 'lobby') setPhase('game')
        }
      )
      .subscribe()

    const playerSub = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase.from('players').select('*').eq('room_id', roomId)
          if (data) {
            setPlayers(data as Player[])
            const stored = localStorage.getItem(`codenames_player_${roomId}`)
            if (stored) {
              const { id } = JSON.parse(stored)
              const found = data.find((player: Player) => player.id === id)
              if (found) setMe(found as Player)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomSub)
      supabase.removeChannel(playerSub)
    }
  }, [roomId])

  useEffect(() => {
    setPendingRevealIndex(null)
    setSpySelections([])
  }, [gameState?.currentTurn, gameState?.hint?.word, gameState?.phase])

  const isAdmin = useMemo(() => {
    return me?.id === (extendedState?.roomAdminId ?? players[0]?.id)
  }, [extendedState?.roomAdminId, players, me?.id])

  const updateGameState = useCallback(
    async (newState: ExtendedGameState) => {
      setGameState(newState)
      await supabase.from('rooms').update({ state: newState }).eq('id', roomId)
    },
    [roomId]
  )

  const handleSetTeamRole = async (team: PlayerTeam, role: PlayerRole) => {
    if (!me) return
    await supabase.from('players').update({ team, role }).eq('id', me.id)
    setMe((prev) => (prev ? { ...prev, team, role } : prev))
    setSettingsOpen(false)
  }

  const handleStartGame = async () => {
    if (!extendedState) return
    const newState: ExtendedGameState = {
      ...extendedState,
      phase: 'playing',
      currentTurn: randomTeam(),
      hint: null,
      winner: null,
      roomAdminId: extendedState.roomAdminId ?? players[0]?.id,
      detailedHintHistory: [],
    }
    await updateGameState(newState)
    setPhase('game')
  }

  const handleRematch = async () => {
    if (!extendedState) return
    const themes = getThemesFromState(extendedState)
    const nextState = createInitialState(themes, []) as ExtendedGameState
    nextState.roomAdminId = extendedState.roomAdminId ?? players[0]?.id
    nextState.detailedHintHistory = []
    nextState.phase = 'playing'
    nextState.currentTurn = randomTeam()
    nextState.hint = null
    nextState.winner = null
    await updateGameState(nextState)
    setPhase('game')
    setPendingRevealIndex(null)
    setSpySelections([])
  }

  const handleCardClick = async (index: number) => {
    if (!extendedState || !me) return

    if (me.role === 'spymaster') {
      const card = extendedState.cards[index]
      if (!card) return
      if (card.team !== me.team) return
      setSpySelections((current) =>
        current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
      )
      return
    }

    if (me.team !== extendedState.currentTurn) return
    if (!extendedState.hint) return
    if (extendedState.cards[index]?.revealed) return
    setPendingRevealIndex(index)
  }

  const handleConfirmReveal = async () => {
    if (!extendedState || pendingRevealIndex === null || !me) return

    const chosenCard = extendedState.cards[pendingRevealIndex]
    if (!chosenCard) return

    const previousTurn = extendedState.currentTurn
    let nextState = revealCard(extendedState, pendingRevealIndex) as ExtendedGameState

    const hitNeutral = chosenCard.team === 'neutral'
    const hitEnemy =
      chosenCard.team === 'red' || chosenCard.team === 'blue'
        ? chosenCard.team !== me.team
        : false

    const shouldForcePass =
      nextState.phase === 'playing' &&
      nextState.currentTurn === previousTurn &&
      (hitNeutral || hitEnemy)

    if (shouldForcePass) {
      nextState = passTurn(nextState) as ExtendedGameState
    }

    const lastHistory = [...(extendedState.detailedHintHistory || [])]
    if (lastHistory.length > 0) {
      const word = chosenCard.word
      const lastEntry = lastHistory[lastHistory.length - 1]
      if (word && !lastEntry.picks.includes(word)) {
        lastHistory[lastHistory.length - 1] = {
          ...lastEntry,
          picks: [...lastEntry.picks, word],
        }
      }
    }

    await updateGameState({
      ...nextState,
      roomAdminId: extendedState.roomAdminId ?? players[0]?.id,
      detailedHintHistory: lastHistory,
    })

    setPendingRevealIndex(null)
  }

  const handleHintSubmit = async () => {
    if (!extendedState || !me || !hintWord.trim()) return
    if (me.role !== 'spymaster' || me.team !== extendedState.currentTurn || extendedState.hint) return

    const nextState = applyHint(extendedState, hintWord.trim(), hintCount) as ExtendedGameState

    await updateGameState({
      ...nextState,
      roomAdminId: extendedState.roomAdminId ?? players[0]?.id,
      detailedHintHistory: [
        ...(extendedState.detailedHintHistory || []),
        {
          word: hintWord.trim(),
          count: hintCount,
          team: me.team,
          picks: [],
        },
      ],
    })

    setHintWord('')
    setHintCount(1)
    setSpySelections([])
    setPendingRevealIndex(null)
  }

  const handlePassTurn = async () => {
    if (!extendedState || !me) return
    if (me.team !== extendedState.currentTurn) return

    const nextState = passTurn(extendedState) as ExtendedGameState
    await updateGameState({
      ...nextState,
      roomAdminId: extendedState.roomAdminId ?? players[0]?.id,
      detailedHintHistory: extendedState.detailedHintHistory || [],
    })

    setPendingRevealIndex(null)
    setSpySelections([])
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111d] text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5 text-3xl">
            +
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/45">Conectando a sala</p>
          <p className="mt-2 text-lg font-bold text-white/80">Carregando missao...</p>
        </div>
      </div>
    )
  }

  if (!extendedState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111d] text-white">
        <div className="rounded-[28px] border border-[#d85b49]/30 bg-[#1b1720] px-8 py-7 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.24em] text-[#d85b49]">Erro</p>
          <p className="mt-2 text-2xl font-black">Sala nao encontrada</p>
        </div>
      </div>
    )
  }

  const redPlayers = players.filter((player) => player.team === 'red')
  const bluePlayers = players.filter((player) => player.team === 'blue')
  const spectators = players.filter((player) => player.team === 'spectator')
  const isMyTurn = me?.team === extendedState.currentTurn
  const isSpymaster = me?.role === 'spymaster'
  const canReveal = isMyTurn && !isSpymaster && !!extendedState.hint && extendedState.phase === 'playing'
  const canGiveHint = isMyTurn && isSpymaster && !extendedState.hint && extendedState.phase === 'playing'

  if (phase === 'lobby') {
    return (
      <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#05070d_0%,#101a29_16%,#1f344b_58%,#24415b_100%)] text-white">
        <SettingsModal
          open={settingsOpen}
          me={me}
          isAdmin={!!isAdmin}
          onClose={() => setSettingsOpen(false)}
          onPickRole={handleSetTeamRole}
        />

        <div className="mx-auto flex h-screen w-full max-w-[1600px] flex-col px-4 py-3">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/10 bg-black/22 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-black">
                {me?.name || 'Jogador'}
              </div>
              {isAdmin ? (
                <div className="rounded-full bg-[#238b16] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                  Admin
                </div>
              ) : null}
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Sala</p>
              <h1 className="text-2xl font-black uppercase tracking-[0.08em]">{roomId}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-white/40 hover:bg-white/10"
              >
                Configuracoes
              </button>
              <button
                onClick={copyCode}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-white/40 hover:bg-white/10"
              >
                {copied ? 'Codigo copiado' : 'Copiar codigo'}
              </button>
              <button
                onClick={handleStartGame}
                className="rounded-full border border-[#8cd45c]/45 bg-gradient-to-b from-[#35c000] to-[#247d00] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(37,125,0,0.35)] transition hover:brightness-110"
              >
                Iniciar jogo
              </button>
            </div>
          </header>

          <div className="mb-3 rounded-[24px] border border-white/10 bg-black/18 px-6 py-3 text-center backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.34em] text-white/45">Status da sala</p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.02em]">
              O time azul precisa de um mestre-espiao
            </h2>
          </div>

          {spectators.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
                Espectadores
              </span>
              {spectators.map((player) => (
                <span
                  key={player.id}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-bold',
                    player.id === me?.id
                      ? 'border-white/30 bg-white/12 text-white'
                      : 'border-white/10 bg-black/18 text-white/65'
                  )}
                >
                  {player.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[235px_minmax(0,1fr)_235px]">
            <TeamSidebar
              team="blue"
              players={bluePlayers}
              me={me}
              remaining={extendedState.blueLeft}
              onPickRole={handleSetTeamRole}
            />

            <main className="flex min-h-0 flex-col items-center justify-center rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,32,0.88),rgba(30,53,77,0.65))] p-4 shadow-2xl backdrop-blur-md">
              <div className="grid w-full max-w-[1120px] grid-cols-5 gap-3">
                {extendedState.cards.map((card, index) => {
                  const { outerClass, innerClass, labelClass } = getCardClasses(card.team, false)

                  return (
                    <div
                      key={`${card.word}-${index}`}
                      className={cn(
                        'aspect-[1.28/0.74] rounded-[20px] border p-2 shadow-[0_16px_26px_rgba(0,0,0,0.16)]',
                        outerClass
                      )}
                    >
                      <div className={cn('h-full rounded-[16px] border p-2', innerClass)}>
                        <div className="flex h-full rounded-[14px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] p-2">
                          <div
                            className={cn(
                              'flex w-full items-center justify-center rounded-[12px] px-3 text-center text-[clamp(0.74rem,0.9vw,1rem)] font-black uppercase tracking-[0.01em] leading-[1.02] [overflow-wrap:anywhere]',
                              labelClass
                            )}
                          >
                            {card.word}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </main>

            <TeamSidebar
              team="red"
              players={redPlayers}
              me={me}
              remaining={extendedState.redLeft}
              onPickRole={handleSetTeamRole}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#05070d_0%,#101a29_16%,#1f344b_58%,#2a4967_100%)] text-white">
      <SettingsModal
        open={settingsOpen}
        me={me}
        isAdmin={!!isAdmin}
        onClose={() => setSettingsOpen(false)}
        onPickRole={handleSetTeamRole}
      />

      <div className="mx-auto flex h-screen w-full max-w-[1760px] flex-col px-4 py-3">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/10 bg-black/22 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black uppercase tracking-[0.08em]">
              <span className="text-white">Code</span>
              <span className="text-[#ff6d5a]">Names</span>
            </div>
            {isAdmin ? (
              <div className="rounded-full bg-[#238b16] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Admin
              </div>
            ) : null}
            <button
              onClick={copyCode}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
            >
              {copied ? 'Copiado' : `Sala ${roomId}`}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
            >
              Configuracoes
            </button>
          </div>

          {extendedState.phase === 'finished' ? (
            <div
              className={cn(
                'rounded-full px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg',
                extendedState.winner === 'red' ? 'bg-[#d85b49]' : 'bg-[#3f8ed8]'
              )}
            >
              {extendedState.winner === 'red' ? 'Vitoria do vermelho' : 'Vitoria do azul'}
            </div>
          ) : (
            <div
              className={cn(
                'rounded-full px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg',
                extendedState.currentTurn === 'red' ? 'bg-[#d85b49]' : 'bg-[#3f8ed8]'
              )}
            >
              {extendedState.currentTurn === 'red' ? 'Vez do vermelho' : 'Vez do azul'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs">
              <span className="mr-2 font-black text-[#ff8b7d]">{extendedState.redLeft}</span>
              <span className="text-white/45">restantes</span>
              <span className="mx-3 font-black text-[#78bfff]">{extendedState.blueLeft}</span>
            </div>
            {isAdmin ? (
              <button
                onClick={handleRematch}
                className="rounded-full border border-[#8cd45c]/45 bg-gradient-to-b from-[#35c000] to-[#247d00] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_12px_30px_rgba(37,125,0,0.35)] transition hover:brightness-110"
              >
                Recomeçar sala
              </button>
            ) : null}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[235px_minmax(0,1fr)_235px]">
          <TeamSidebar
            team="red"
            players={redPlayers}
            me={me}
            remaining={extendedState.redLeft}
            onPickRole={handleSetTeamRole}
          />

          <main className="flex min-h-0 flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,32,0.84),rgba(42,73,103,0.72))] p-4 shadow-2xl backdrop-blur-md">
            <div className="mb-4 text-center">
              {extendedState.hint ? (
                <div
                  className={cn(
                    'mx-auto inline-flex flex-wrap items-center justify-center gap-4 rounded-full border px-5 py-2.5',
                    extendedState.hint.team === 'red'
                      ? 'border-[#d85b49]/40 bg-[#d85b49]/12'
                      : 'border-[#3f8ed8]/40 bg-[#3f8ed8]/12'
                  )}
                >
                  <span className="text-xs uppercase tracking-[0.26em] text-white/45">Dica</span>
                  <span className="text-3xl font-black uppercase">{extendedState.hint.word}</span>
                  <span
                    className={cn(
                      'rounded-full px-4 py-2 text-xl font-black',
                      extendedState.hint.team === 'red'
                        ? 'bg-[#d85b49] text-white'
                        : 'bg-[#3f8ed8] text-white'
                    )}
                  >
                    {extendedState.hint.count}
                  </span>
                  <span className="text-xs text-white/60">
                    {extendedState.hint.guessesLeft} tentativa
                    {extendedState.hint.guessesLeft !== 1 ? 's' : ''}
                  </span>
                  {isMyTurn && !isSpymaster ? (
                    <button
                      onClick={handlePassTurn}
                      className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-white/12"
                    >
                      Passar
                    </button>
                  ) : null}
                </div>
              ) : canGiveHint ? (
                <div className="mx-auto flex max-w-[640px] flex-wrap items-center justify-center gap-3">
                  <input
                    value={hintWord}
                    onChange={(event) => setHintWord(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleHintSubmit()}
                    placeholder="Palavra-dica"
                    className="min-w-[240px] flex-1 rounded-full border border-white/15 bg-[#0b121d] px-5 py-3 text-lg text-white outline-none transition placeholder:text-white/25 focus:border-white/35"
                  />
                  <select
                    value={hintCount}
                    onChange={(event) => setHintCount(Number(event.target.value))}
                    className="rounded-full border border-white/15 bg-[#0b121d] px-4 py-3 text-lg text-white outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                    <option value={0}>∞</option>
                  </select>
                  <button
                    onClick={handleHintSubmit}
                    className={cn(
                      'rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:brightness-110',
                      me?.team === 'red' ? 'bg-[#d85b49]' : 'bg-[#3f8ed8]'
                    )}
                  >
                    Dar dica
                  </button>
                </div>
              ) : (
                <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.2em] text-white/35">
                  {extendedState.phase === 'playing'
                    ? isSpymaster
                      ? 'Clique nas cartas do seu time para marcar sua leitura'
                      : 'Aguardando a dica do mestre-espiao'
                    : 'Partida pausada'}
                </div>
              )}
            </div>

            <div className="grid min-h-0 flex-1 place-items-center">
              <div className="grid w-full max-w-[1140px] grid-cols-5 gap-3">
                {extendedState.cards.map((card, index) => {
                  const visible = card.revealed || isSpymaster
                  const { outerClass, innerClass, labelClass } = getCardClasses(card.team, visible)
                  const pendingReveal = pendingRevealIndex === index
                  const spySelected = isSpymaster && spySelections.includes(index)

                  return (
                    <button
                      key={index}
                      onClick={() => handleCardClick(index)}
                      disabled={me?.role !== 'spymaster' && (!canReveal || card.revealed)}
                      className={cn(
                        'group relative aspect-[1.28/0.74] rounded-[20px] border p-2 text-left shadow-[0_14px_24px_rgba(0,0,0,0.2)] transition duration-150',
                        outerClass,
                        !card.revealed &&
                          (canReveal || isSpymaster) &&
                          'hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(0,0,0,0.26)]',
                        pendingReveal && 'ring-4 ring-white ring-offset-2 ring-offset-[#243d56]',
                        spySelected && 'ring-4 ring-[#8dff61] ring-offset-2 ring-offset-[#243d56]'
                      )}
                    >
                      {me?.role === 'operative' && pendingReveal ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleConfirmReveal()
                          }}
                          className="absolute right-2 top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#baff8c]/50 bg-[#45bb18] text-xl text-white shadow-[0_8px_18px_rgba(69,187,24,0.35)] transition hover:brightness-110"
                          aria-label="Confirmar carta"
                        >
                          ☝
                        </button>
                      ) : null}

                      {isSpymaster && spySelected ? (
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-[#3ea900] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
                          Selecionada
                        </div>
                      ) : null}

                      <div className={cn('flex h-full rounded-[16px] border p-2', innerClass)}>
                        <div className="flex h-full w-full rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.03))] p-2">
                          <div
                            className={cn(
                              'flex w-full items-center justify-center rounded-[12px] px-3 text-center text-[clamp(0.74rem,0.9vw,1rem)] font-black uppercase tracking-[0.01em] leading-[1.02] [overflow-wrap:anywhere]',
                              labelClass
                            )}
                          >
                            {card.word}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {(extendedState.detailedHintHistory || []).length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                  Historico
                </span>
                {(extendedState.detailedHintHistory || []).slice(-4).map((hint, index) => (
                  <span
                    key={`${hint.word}-${index}`}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]',
                      hint.team === 'red'
                        ? 'bg-[#d85b49]/15 text-[#ff9d90]'
                        : 'bg-[#3f8ed8]/15 text-[#8dccff]'
                    )}
                  >
                    {hint.word} x{hint.count}
                    {hint.picks.length > 0 ? ` • ${hint.picks.join(', ')}` : ''}
                  </span>
                ))}
              </div>
            ) : null}
          </main>

          <TeamSidebar
            team="blue"
            players={bluePlayers}
            me={me}
            remaining={extendedState.blueLeft}
            onPickRole={handleSetTeamRole}
          />
        </div>
      </div>
    </div>
  )
}
