'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { revealCard, applyHint, passTurn } from '@/lib/gameLogic'
import type { GameState, Player, PlayerTeam, PlayerRole } from '@/types/game'

const TEAM_COLORS: Record<string, string> = {
  red: '#ff4655',
  blue: '#4fc3f7',
  neutral: '#8b8fa8',
  assassin: '#1a1a1a',
}

const TEAM_BG: Record<string, string> = {
  red: 'bg-[#ff4655]',
  blue: 'bg-[#4fc3f7]',
  neutral: 'bg-[#2a2d3e]',
  assassin: 'bg-[#111]',
}

const CARD_TEXT: Record<string, string> = {
  red: 'text-white',
  blue: 'text-[#0d0f14]',
  neutral: 'text-white',
  assassin: 'text-white',
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

  useEffect(() => {
    const stored = localStorage.getItem(`codenames_player_${roomId}`)
    if (stored) {
      const { id } = JSON.parse(stored)
      setMe(prev => prev || { id, room_id: roomId, name: '', team: 'spectator', role: 'operative' })
    }
  }, [roomId])

  useEffect(() => {
    const load = async () => {
      const { data: room } = await supabase.from('rooms').select('state').eq('id', roomId).single()
      if (room) setGameState(room.state as GameState)

      const { data: playerList } = await supabase.from('players').select('*').eq('room_id', roomId)
      if (playerList) setPlayers(playerList as Player[])

      const stored = localStorage.getItem(`codenames_player_${roomId}`)
      if (stored && playerList) {
        const { id } = JSON.parse(stored)
        const found = playerList.find((p: Player) => p.id === id)
        if (found) setMe(found as Player)
      }

      setLoading(false)
    }
    load()
  }, [roomId])

  useEffect(() => {
    const roomSub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        payload => setGameState(payload.new.state as GameState))
      .subscribe()

    const playerSub = supabase
      .channel(`players:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase.from('players').select('*').eq('room_id', roomId)
          if (data) {
            setPlayers(data as Player[])
            const stored = localStorage.getItem(`codenames_player_${roomId}`)
            if (stored) {
              const { id } = JSON.parse(stored)
              const found = data.find((p: Player) => p.id === id)
              if (found) setMe(found as Player)
            }
          }
        })
      .subscribe()

    return () => {
      supabase.removeChannel(roomSub)
      supabase.removeChannel(playerSub)
    }
  }, [roomId])

  const updateGameState = useCallback(async (newState: GameState) => {
    setGameState(newState)
    await supabase.from('rooms').update({ state: newState }).eq('id', roomId)
  }, [roomId])

  const handleCardClick = async (index: number) => {
    if (!gameState || !me) return
    if (me.role !== 'operative') return
    if (me.team !== gameState.currentTurn) return
    if (!gameState.hint) return
    const newState = revealCard(gameState, index)
    await updateGameState(newState)
  }

  const handleHintSubmit = async () => {
    if (!gameState || !me || !hintWord.trim()) return
    if (me.role !== 'spymaster') return
    if (me.team !== gameState.currentTurn) return
    if (gameState.hint) return
    const newState = applyHint(gameState, hintWord.trim(), hintCount)
    await updateGameState(newState)
    setHintWord('')
    setHintCount(1)
  }

  const handlePassTurn = async () => {
    if (!gameState || !me) return
    if (me.team !== gameState.currentTurn) return
    await updateGameState(passTurn(gameState))
  }

  const handleSetTeamRole = async (team: PlayerTeam, role: PlayerRole) => {
    if (!me) return
    await supabase.from('players').update({ team, role }).eq('id', me.id)
    setMe(prev => prev ? { ...prev, team, role } : prev)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-white font-mono">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⠿</div>
          <p className="text-[#8b8fa8]">Carregando sala...</p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-white font-mono">
        <p className="text-[#ff4655]">Sala não encontrada.</p>
      </div>
    )
  }

  const isMyTurn = me?.team === gameState.currentTurn
  const isSpymaster = me?.role === 'spymaster'
  const canReveal = isMyTurn && !isSpymaster && !!gameState.hint && gameState.phase === 'playing'
  const canGiveHint = isMyTurn && isSpymaster && !gameState.hint && gameState.phase === 'playing'

  const redPlayers = players.filter(p => p.team === 'red')
  const bluePlayers = players.filter(p => p.team === 'blue')
  const spectators = players.filter(p => p.team === 'spectator')

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-mono flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e2130]">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tighter">CODE<span className="text-[#ff4655]">NAMES</span></span>
          <button
            onClick={copyLink}
            className="text-xs text-[#8b8fa8] bg-[#1a1d27] border border-[#2a2d3e] rounded px-3 py-1 hover:border-[#ff4655] transition-colors"
          >
            {copied ? '✓ Copiado!' : `# ${roomId}`}
          </button>
        </div>

        <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
          gameState.phase === 'finished'
            ? 'bg-yellow-500 text-black'
            : gameState.currentTurn === 'red'
              ? 'bg-[#ff4655] text-white'
              : 'bg-[#4fc3f7] text-[#0d0f14]'
        }`}>
          {gameState.phase === 'finished'
            ? `${gameState.winner === 'red' ? '🔴' : '🔵'} Vitória!`
            : `Vez do ${gameState.currentTurn === 'red' ? 'Vermelho 🔴' : 'Azul 🔵'}`
          }
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#ff4655] font-bold">{gameState.redLeft} 🔴</span>
          <span className="text-[#4fc3f7] font-bold">{gameState.blueLeft} 🔵</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 p-4 border-r border-[#1e2130] flex flex-col gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#ff4655] font-bold mb-2">Time Vermelho</h3>
            {redPlayers.map(p => (
              <div key={p.id} className={`text-xs py-1 px-2 rounded mb-1 ${p.id === me?.id ? 'bg-[#ff4655] text-white' : 'text-[#8b8fa8]'}`}>
                {p.role === 'spymaster' ? '👁 ' : '● '}{p.name}
              </div>
            ))}
          </div>

          {me && (
            <div className="mt-auto">
              <p className="text-xs text-[#8b8fa8] mb-1">Entrar como:</p>
              <button onClick={() => handleSetTeamRole('red', 'operative')}
                className={`w-full text-xs py-1 mb-1 rounded border transition-colors ${me.team==='red'&&me.role==='operative' ? 'border-[#ff4655] text-[#ff4655]' : 'border-[#2a2d3e] text-[#8b8fa8] hover:border-[#ff4655]'}`}>
                Operativo 🔴
              </button>
              <button onClick={() => handleSetTeamRole('red', 'spymaster')}
                className={`w-full text-xs py-1 mb-1 rounded border transition-colors ${me.team==='red'&&me.role==='spymaster' ? 'border-[#ff4655] text-[#ff4655]' : 'border-[#2a2d3e] text-[#8b8fa8] hover:border-[#ff4655]'}`}>
                Spymaster 🔴👁
              </button>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <div className="w-full max-w-2xl">
            {gameState.hint ? (
              <div className={`text-center py-2 px-4 rounded-lg ${gameState.hint.team === 'red' ? 'bg-[#ff4655]/20 border border-[#ff4655]' : 'bg-[#4fc3f7]/20 border border-[#4fc3f7]'}`}>
                <span className="font-black text-lg">{gameState.hint.word.toUpperCase()}</span>
                <span className="ml-2 text-sm">× {gameState.hint.count}</span>
                <span className="ml-3 text-xs text-[#8b8fa8]">({gameState.hint.guessesLeft} tentativas restantes)</span>
                {isMyTurn && !isSpymaster && (
                  <button onClick={handlePassTurn} className="ml-4 text-xs text-[#8b8fa8] hover:text-white underline">
                    Passar turno
                  </button>
                )}
              </div>
            ) : canGiveHint ? (
              <div className="flex gap-2 justify-center">
                <input
                  value={hintWord}
                  onChange={e => setHintWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleHintSubmit()}
                  placeholder="Palavra-dica..."
                  className="bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-2 text-white placeholder-[#3a3d52] focus:outline-none focus:border-[#ff4655] w-48"
                />
                <select
                  value={hintCount}
                  onChange={e => setHintCount(Number(e.target.value))}
                  className="bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-3 py-2 text-white"
                >
                  {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                  <option value={0}>∞</option>
                </select>
                <button onClick={handleHintSubmit}
                  className="bg-[#ff4655] text-white px-4 rounded-lg font-bold hover:bg-[#e03040] transition-colors">
                  Dar dica
                </button>
              </div>
            ) : (
              <p className="text-center text-[#3a3d52] text-sm">
                {isSpymaster ? 'Aguardando seu turno...' : gameState.phase === 'playing' ? 'Aguardando dica do spymaster...' : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 w-full max-w-2xl">
            {gameState.cards.map((card, i) => {
              const showColor = card.revealed || isSpymaster
              return (
                <button
                  key={i}
                  onClick={() => handleCardClick(i)}
                  disabled={!canReveal || card.revealed}
                  className={`
                    relative rounded-lg py-3 px-2 text-xs font-bold uppercase tracking-wider
                    transition-all duration-200 border-2 min-h-[60px] flex items-center justify-center
                    ${card.revealed ? (
                      `${TEAM_BG[card.team]} ${CARD_TEXT[card.team]} border-transparent opacity-70`
                    ) : showColor ? (
                      `bg-[#12141e] text-white`
                    ) : (
                      `bg-[#1a1d27] border-[#2a2d3e] text-white ${canReveal ? 'hover:border-[#ff4655] hover:bg-[#22253a] cursor-pointer' : 'cursor-default'}`
                    )}
                  `}
                  style={isSpymaster && !card.revealed ? {
                    borderColor: TEAM_COLORS[card.team],
                    boxShadow: `0 0 8px ${TEAM_COLORS[card.team]}44`
                  } : undefined}
                >
                  {card.word}
                  {isSpymaster && !card.revealed && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: TEAM_COLORS[card.team] }} />
                  )}
                </button>
              )
            })}
          </div>

          {gameState.phase === 'finished' && (
            <div className={`text-center py-4 px-8 rounded-xl font-black text-2xl ${
              gameState.winner === 'red' ? 'bg-[#ff4655] text-white' : 'bg-[#4fc3f7] text-[#0d0f14]'
            }`}>
              {gameState.winner === 'red' ? '🔴 Time Vermelho Venceu!' : '🔵 Time Azul Venceu!'}
            </div>
          )}
        </main>

        <aside className="w-48 p-4 border-l border-[#1e2130] flex flex-col gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#4fc3f7] font-bold mb-2">Time Azul</h3>
            {bluePlayers.map(p => (
              <div key={p.id} className={`text-xs py-1 px-2 rounded mb-1 ${p.id === me?.id ? 'bg-[#4fc3f7] text-[#0d0f14]' : 'text-[#8b8fa8]'}`}>
                {p.role === 'spymaster' ? '👁 ' : '● '}{p.name}
              </div>
            ))}
          </div>

          {me && (
            <div>
              <button onClick={() => handleSetTeamRole('blue', 'operative')}
                className={`w-full text-xs py-1 mb-1 rounded border transition-colors ${me.team==='blue'&&me.role==='operative' ? 'border-[#4fc3f7] text-[#4fc3f7]' : 'border-[#2a2d3e] text-[#8b8fa8] hover:border-[#4fc3f7]'}`}>
                Operativo 🔵
              </button>
              <button onClick={() => handleSetTeamRole('blue', 'spymaster')}
                className={`w-full text-xs py-1 mb-1 rounded border transition-colors ${me.team==='blue'&&me.role==='spymaster' ? 'border-[#4fc3f7] text-[#4fc3f7]' : 'border-[#2a2d3e] text-[#8b8fa8] hover:border-[#4fc3f7]'}`}>
                Spymaster 🔵👁
              </button>
              <button onClick={() => handleSetTeamRole('spectator', 'operative')}
                className={`w-full text-xs py-1 rounded border transition-colors ${me.team==='spectator' ? 'border-[#8b8fa8] text-[#8b8fa8]' : 'border-[#2a2d3e] text-[#3a3d52] hover:border-[#8b8fa8]'}`}>
                Espectador
              </button>
            </div>
          )}

          {spectators.length > 0 && (
            <div className="mt-2">
              <h3 className="text-xs uppercase tracking-widest text-[#3a3d52] font-bold mb-1">Espectadores</h3>
              {spectators.map(p => (
                <div key={p.id} className="text-xs text-[#3a3d52] py-1">{p.name}</div>
              ))}
            </div>
          )}

          {gameState.hintHistory.length > 0 && (
            <div className="mt-auto">
              <h3 className="text-xs uppercase tracking-widest text-[#3a3d52] font-bold mb-1">Histórico</h3>
              {gameState.hintHistory.slice(0, 5).map((h, i) => (
                <div key={i} className={`text-xs py-1 ${h.team === 'red' ? 'text-[#ff4655]' : 'text-[#4fc3f7]'}`}>
                  {h.word} ×{h.count}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
