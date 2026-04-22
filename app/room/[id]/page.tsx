'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { revealCard, applyHint, passTurn } from '@/lib/gameLogic'
import type { GameState, Player, PlayerTeam, PlayerRole } from '@/types/game'

const TEAM_SURFACES = {
  red: {
    panel: 'from-[#a53f2f] to-[#cb5a43]',
    border: 'border-[#f08c75]/50',
    text: 'text-[#ffb4a3]',
    badge: 'bg-[#d85b49]',
    shadow: 'shadow-[0_18px_45px_rgba(216,91,73,0.2)]',
  },
  blue: {
    panel: 'from-[#176293] to-[#2f8fd4]',
    border: 'border-[#87c8ff]/45',
    text: 'text-[#9fd2ff]',
    badge: 'bg-[#3f8ed8]',
    shadow: 'shadow-[0_18px_45px_rgba(63,142,216,0.2)]',
  },
} as const

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

type RoleCardProps = {
  title: string
  placeholder: string
  occupiedBy?: Player
  active: boolean
  onClick: () => void
}

function RoleCard({ title, placeholder, occupiedBy, active, onClick }: RoleCardProps) {
  return (
    <div className="mt-5 rounded-[22px] border border-white/15 bg-black/12 px-4 py-6 text-center">
      <p className="text-center text-[12px] font-black uppercase tracking-[0.22em] text-white/60">
        {title}
      </p>

      <div className="mt-4 flex min-h-[150px] flex-col items-center justify-center">
        {occupiedBy ? (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              {getInitials(occupiedBy.name || 'J')}
            </div>
            <div className="mt-3">
              <p className="text-lg font-black uppercase tracking-[0.06em]">{occupiedBy.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/55">
                {occupiedBy.role === 'spymaster' ? 'Mestre-Espiao' : 'Agente'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-20 w-20 items-end justify-center rounded-full border border-white/15 bg-white/8">
              <div className="h-11 w-11 rounded-full bg-white/70" />
            </div>
            <p className="mt-4 text-3xl font-black uppercase tracking-[0.06em]">{placeholder}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Vaga disponivel</p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className={cn(
          'mt-5 w-full rounded-full border border-[#97db56]/50 bg-gradient-to-b from-[#2eb300] to-[#1c7d00] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110',
          active && 'ring-2 ring-white/40'
        )}
      >
        {active ? 'Selecionado' : occupiedBy ? 'Trocar para esta vaga' : 'Join Team'}
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
    <aside className="flex w-full max-w-[250px] flex-col gap-4 xl:w-[250px]">
      <div
        className={cn(
          'relative overflow-hidden rounded-[28px] border bg-gradient-to-b p-5 text-white',
          palette.panel,
          palette.border,
          palette.shadow
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]" />
        <div className="relative">
          <p className="text-center text-[12px] font-black uppercase tracking-[0.28em] text-white/70">
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

      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#131c2d]">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-30',
            team === 'red' ? 'from-[#fb8a69] to-transparent' : 'from-[#76c2ff] to-transparent'
          )}
        />
        <div className="relative flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Restantes</p>
            <p className={cn('text-5xl font-black leading-none', palette.text)}>{remaining}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">{teamLabel}</p>
            <p className="text-sm font-bold text-white/80">
              {players.length} jogador{players.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-[28px] border bg-gradient-to-b p-5 text-white',
          palette.panel,
          palette.border
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_34%)]" />
        <div className="relative">
          <p className="text-center text-[12px] font-black uppercase tracking-[0.24em] text-white/72">
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

      <div className="rounded-[24px] border border-white/10 bg-[#151515]/35 p-4">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white/55">Elenco</p>
        <div className="space-y-2">
          {operatives.map((player) => (
            <div
              key={player.id}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm font-bold',
                player.id === me?.id
                  ? `${palette.badge} border-transparent text-white`
                  : 'border-white/10 bg-white/5 text-white/75'
              )}
            >
              {player.name}
            </div>
          ))}
          {spymasters.map((player) => (
            <div
              key={player.id}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm font-bold',
                player.id === me?.id
                  ? `${palette.badge} border-transparent text-white`
                  : 'border-white/10 bg-white/5 text-white/75'
              )}
            >
              {`Olho ${player.name}`}
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-sm italic text-white/35">Nenhum jogador neste time ainda.</p>
          )}
        </div>
      </div>
    </aside>
  )
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

  const updateGameState = useCallback(
    async (newState: GameState) => {
      setGameState(newState)
      await supabase.from('rooms').update({ state: newState }).eq('id', roomId)
    },
    [roomId]
  )

  const handleSetTeamRole = async (team: PlayerTeam, role: PlayerRole) => {
    if (!me) return
    await supabase.from('players').update({ team, role }).eq('id', me.id)
    setMe((prev) => (prev ? { ...prev, team, role } : prev))
  }

  const handleStartGame = async () => {
    if (!gameState) return
    const newState = { ...gameState, phase: 'playing' as const }
    await updateGameState(newState)
    setPhase('game')
  }

  const handleCardClick = async (index: number) => {
    if (!gameState || !me) return
    if (me.role !== 'operative') return
    if (me.team !== gameState.currentTurn) return
    if (!gameState.hint) return
    await updateGameState(revealCard(gameState, index))
  }

  const handleHintSubmit = async () => {
    if (!gameState || !me || !hintWord.trim()) return
    if (me.role !== 'spymaster' || me.team !== gameState.currentTurn || gameState.hint) return
    await updateGameState(applyHint(gameState, hintWord.trim(), hintCount))
    setHintWord('')
    setHintCount(1)
  }

  const handlePassTurn = async () => {
    if (!gameState || !me) return
    if (me.team !== gameState.currentTurn) return
    await updateGameState(passTurn(gameState))
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

  if (!gameState) {
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
  const isMyTurn = me?.team === gameState.currentTurn
  const isSpymaster = me?.role === 'spymaster'
  const canReveal = isMyTurn && !isSpymaster && !!gameState.hint && gameState.phase === 'playing'
  const canGiveHint = isMyTurn && isSpymaster && !gameState.hint && gameState.phase === 'playing'

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#05070d_0%,#101a29_16%,#1f344b_58%,#24415b_100%)] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-5 py-5">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-black">
                {me?.name || 'Jogador'}
              </div>
              <div className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/65">
                {players.length} participante{players.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Sala</p>
              <h1 className="text-3xl font-black uppercase tracking-[0.08em]">{roomId}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={copyCode}
                className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] transition hover:border-white/40 hover:bg-white/10"
              >
                {copied ? 'Codigo copiado' : 'Copiar codigo'}
              </button>
              <button
                onClick={handleStartGame}
                className="rounded-full border border-[#8cd45c]/45 bg-gradient-to-b from-[#35c000] to-[#247d00] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(37,125,0,0.35)] transition hover:brightness-110"
              >
                Iniciar jogo
              </button>
            </div>
          </header>

          <div className="mb-6 rounded-[28px] border border-white/10 bg-black/18 px-6 py-4 text-center backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.34em] text-white/45">Status da sala</p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.02em]">
              O time azul precisa de um mestre-espiao
            </h2>
            <p className="mt-2 text-white/60">
              Escolha seu lado, defina se vai jogar como agente ou mestre-espiao e comece a partida.
            </p>
          </div>

          {spectators.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.24em] text-white/40">
                Espectadores
              </span>
              {spectators.map((player) => (
                <span
                  key={player.id}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-bold',
                    player.id === me?.id
                      ? 'border-white/30 bg-white/12 text-white'
                      : 'border-white/10 bg-black/18 text-white/65'
                  )}
                >
                  {player.name}
                </span>
              ))}
            </div>
          )}

          <div className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_250px]">
            <TeamSidebar
              team="blue"
              players={bluePlayers}
              me={me}
              remaining={gameState.blueLeft}
              onPickRole={handleSetTeamRole}
            />

            <main className="flex min-h-[660px] flex-col items-center justify-center rounded-[34px] border border-white/10 bg-black/18 p-5 shadow-2xl backdrop-blur-md">
              <div className="mb-4 grid w-full max-w-[1040px] grid-cols-5 gap-4">
                {gameState.cards.map((card, index) => (
                  <div
                    key={`${card.word}-${index}`}
                    className="rounded-[18px] border border-[#f4d4ac]/75 bg-[#ffd7af] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                  >
                    <div className="rounded-[14px] border border-[#b99671] bg-[#ffd2a8] px-3 pb-2 pt-9">
                      <div className="rounded-[10px] bg-[#ab825c] px-2 py-3 text-center text-[clamp(1rem,1.35vw,1.2rem)] font-black uppercase tracking-[0.04em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                        {card.word}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/65">
                  Tema: <span className="font-bold text-white">{gameState.theme || 'Padrao'}</span>
                </div>
                <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/65">
                  25 cartas
                </div>
                <button
                  onClick={() => handleSetTeamRole('spectator', 'operative')}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-bold transition',
                    me?.team === 'spectator'
                      ? 'border-white/30 bg-white/12 text-white'
                      : 'border-white/15 bg-white/5 text-white/65 hover:bg-white/10'
                  )}
                >
                  Assistir como espectador
                </button>
              </div>
            </main>

            <TeamSidebar
              team="red"
              players={redPlayers}
              me={me}
              remaining={gameState.redLeft}
              onPickRole={handleSetTeamRole}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#05070d_0%,#101a29_16%,#1f344b_58%,#24415b_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-5 py-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-black uppercase tracking-[0.08em]">
              <span className="text-white">Code</span>
              <span className="text-[#ff6d5a]">Names</span>
            </div>
            <button
              onClick={copyCode}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
            >
              {copied ? 'Copiado' : `Sala ${roomId}`}
            </button>
          </div>

          {gameState.phase === 'finished' ? (
            <div
              className={cn(
                'rounded-full px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg',
                gameState.winner === 'red' ? 'bg-[#d85b49]' : 'bg-[#3f8ed8]'
              )}
            >
              {gameState.winner === 'red' ? 'Vitoria do vermelho' : 'Vitoria do azul'}
            </div>
          ) : (
            <div
              className={cn(
                'rounded-full px-7 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg',
                gameState.currentTurn === 'red' ? 'bg-[#d85b49]' : 'bg-[#3f8ed8]'
              )}
            >
              {gameState.currentTurn === 'red' ? 'Vez do vermelho' : 'Vez do azul'}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
              <span className="mr-2 font-black text-[#ff8b7d]">{gameState.redLeft}</span>
              <span className="text-white/45">restantes</span>
              <span className="mx-3 font-black text-[#78bfff]">{gameState.blueLeft}</span>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)_250px]">
          <TeamSidebar
            team="red"
            players={redPlayers}
            me={me}
            remaining={gameState.redLeft}
            onPickRole={handleSetTeamRole}
          />

          <main className="rounded-[34px] border border-white/10 bg-black/18 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-5 text-center">
              {gameState.hint ? (
                <div
                  className={cn(
                    'mx-auto inline-flex flex-wrap items-center justify-center gap-4 rounded-full border px-5 py-3',
                    gameState.hint.team === 'red'
                      ? 'border-[#d85b49]/40 bg-[#d85b49]/12'
                      : 'border-[#3f8ed8]/40 bg-[#3f8ed8]/12'
                  )}
                >
                  <span className="text-sm uppercase tracking-[0.26em] text-white/45">Dica</span>
                  <span className="text-3xl font-black uppercase">{gameState.hint.word}</span>
                  <span
                    className={cn(
                      'rounded-full px-4 py-2 text-xl font-black',
                      gameState.hint.team === 'red' ? 'bg-[#d85b49] text-white' : 'bg-[#3f8ed8] text-white'
                    )}
                  >
                    {gameState.hint.count}
                  </span>
                  <span className="text-sm text-white/60">
                    {gameState.hint.guessesLeft} tentativa{gameState.hint.guessesLeft !== 1 ? 's' : ''}
                  </span>
                  {isMyTurn && !isSpymaster && (
                    <button
                      onClick={handlePassTurn}
                      className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] transition hover:bg-white/12"
                    >
                      Passar
                    </button>
                  )}
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
                <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.2em] text-white/35">
                  {gameState.phase === 'playing'
                    ? isSpymaster
                      ? 'Aguardando seu turno'
                      : 'Aguardando a dica do mestre-espiao'
                    : 'Partida pausada'}
                </div>
              )}
            </div>

            <div className="mx-auto grid w-full max-w-[1040px] grid-cols-5 gap-4">
              {gameState.cards.map((card, index) => {
                let outerClass = 'border-[#f4d4ac]/75 bg-[#ffd7af]'
                let innerClass = 'border-[#b99671] bg-[#ffd2a8]'
                let labelClass = 'bg-[#ab825c] text-white'

                if (card.revealed || isSpymaster) {
                  if (card.team === 'red') {
                    outerClass = 'border-[#ff9f90]/45 bg-[#e37a69]'
                    innerClass = 'border-[#f2b6ab]/25 bg-[#e06e5c]'
                    labelClass = 'bg-[#b94434] text-white'
                  } else if (card.team === 'blue') {
                    outerClass = 'border-[#8bcfff]/45 bg-[#63a9ea]'
                    innerClass = 'border-[#b3ddff]/25 bg-[#549fe5]'
                    labelClass = 'bg-[#2f76bd] text-white'
                  } else if (card.team === 'neutral') {
                    outerClass = 'border-[#e1c8a5]/50 bg-[#d8bf9e]'
                    innerClass = 'border-[#e6d2b5]/30 bg-[#cfb28e]'
                    labelClass = 'bg-[#9f7e56] text-white'
                  } else {
                    outerClass = 'border-white/20 bg-[#262626]'
                    innerClass = 'border-white/10 bg-[#1f1f1f]'
                    labelClass = 'bg-[#0f0f0f] text-white'
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleCardClick(index)}
                    disabled={!canReveal || card.revealed}
                    className={cn(
                      'group relative rounded-[18px] border p-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition',
                      outerClass,
                      !card.revealed && canReveal && 'hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(0,0,0,0.28)]'
                    )}
                  >
                    <div className={cn('rounded-[14px] border px-3 pb-2 pt-9', innerClass)}>
                      <div
                        className={cn(
                          'rounded-[10px] px-2 py-3 text-center text-[clamp(1rem,1.3vw,1.3rem)] font-black uppercase tracking-[0.04em]',
                          labelClass
                        )}
                      >
                        {card.word}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {gameState.hintHistory.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                  Historico
                </span>
                {gameState.hintHistory.slice(0, 6).map((hint, index) => (
                  <span
                    key={index}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]',
                      hint.team === 'red' ? 'bg-[#d85b49]/15 text-[#ff9d90]' : 'bg-[#3f8ed8]/15 text-[#8dccff]'
                    )}
                  >
                    {hint.word} x{hint.count}
                  </span>
                ))}
              </div>
            )}
          </main>

          <TeamSidebar
            team="blue"
            players={bluePlayers}
            me={me}
            remaining={gameState.blueLeft}
            onPickRole={handleSetTeamRole}
          />
        </div>
      </div>
    </div>
  )
}
