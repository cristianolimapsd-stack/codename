'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { revealCard, applyHint, passTurn } from '@/lib/gameLogic'
import type { GameState, Player, PlayerTeam, PlayerRole } from '@/types/game'

const TEAM_COLORS: Record<string, string> = {
  red: '#e8534a',
  blue: '#4a90d9',
  neutral: '#c8b89a',
  assassin: '#1a1a1a',
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
  const [phase, setPhase] = useState<'lobby'|'game'>('lobby')

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
      if (room) {
        setGameState(room.state as GameState)
        if ((room.state as GameState).phase !== 'lobby') setPhase('game')
      }
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
    const roomSub = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        payload => {
          const s = payload.new.state as GameState
          setGameState(s)
          if (s.phase !== 'lobby') setPhase('game')
        })
      .subscribe()
    const playerSub = supabase.channel(`players:${roomId}`)
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
    return () => { supabase.removeChannel(roomSub); supabase.removeChannel(playerSub) }
  }, [roomId])

  const updateGameState = useCallback(async (newState: GameState) => {
    setGameState(newState)
    await supabase.from('rooms').update({ state: newState }).eq('id', roomId)
  }, [roomId])

  const handleSetTeamRole = async (team: PlayerTeam, role: PlayerRole) => {
    if (!me) return
    await supabase.from('players').update({ team, role }).eq('id', me.id)
    setMe(prev => prev ? { ...prev, team, role } : prev)
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
    setHintWord(''); setHintCount(1)
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

  if (loading) return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🕵️</div>
        <p className="text-[#6666aa]" style={{fontFamily:'Georgia,serif'}}>Carregando missão...</p>
      </div>
    </div>
  )

  if (!gameState) return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <p className="text-[#e8534a] text-xl" style={{fontFamily:'Georgia,serif'}}>Sala não encontrada.</p>
    </div>
  )

  const redPlayers = players.filter(p => p.team === 'red')
  const bluePlayers = players.filter(p => p.team === 'blue')
  const spectators = players.filter(p => p.team === 'spectator')
  const isMyTurn = me?.team === gameState.currentTurn
  const isSpymaster = me?.role === 'spymaster'
  const canReveal = isMyTurn && !isSpymaster && !!gameState.hint && gameState.phase === 'playing'
  const canGiveHint = isMyTurn && isSpymaster && !gameState.hint && gameState.phase === 'playing'

  // ─── LOBBY ───────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="min-h-screen bg-[#1a1a2e] text-white" style={{fontFamily:'Georgia,serif'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a4a]">
        <h1 className="text-2xl font-black"><span className="text-white">CODE</span><span className="text-[#e8534a]">NAMES</span></h1>
        <button onClick={copyCode}
          className="flex items-center gap-2 bg-[#0d0d20] border border-[#2a2a4a] rounded-lg px-4 py-2 text-sm hover:border-[#e8534a] transition-colors">
          <span className="text-[#6666aa]">Sala:</span>
          <span className="font-bold">{roomId}</span>
          <span className="text-[#6666aa]">{copied ? '✓' : '📋'}</span>
        </button>
        <div className="text-sm text-[#6666aa]">{players.length} jogador{players.length !== 1 ? 'es' : ''}</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Spectators bar */}
        {spectators.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-[#6666aa] text-sm">👁 Espectadores:</span>
            {spectators.map(p => (
              <span key={p.id} className={`px-3 py-1 rounded-full text-sm font-bold ${p.id === me?.id ? 'bg-[#e8534a] text-white' : 'bg-[#2a2a4a] text-[#aaaacc]'}`}>
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Teams */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Blue team */}
          <div className="bg-[#0d0d20] rounded-2xl border-2 border-[#4a90d9]/40 overflow-hidden">
            <div className="bg-[#4a90d9] px-5 py-3 text-center">
              <h2 className="font-black text-xl uppercase tracking-widest">Time Azul</h2>
            </div>
            <div className="p-4">
              {/* Operatives */}
              <div className="mb-3">
                <p className="text-xs uppercase tracking-wider text-[#6666aa] mb-2 font-bold">Agentes</p>
                <div className="min-h-[60px] space-y-1">
                  {bluePlayers.filter(p => p.role === 'operative').map(p => (
                    <div key={p.id} className={`px-3 py-2 rounded-lg text-sm font-bold ${p.id === me?.id ? 'bg-[#4a90d9] text-white' : 'bg-[#1a1a3a] text-[#aaaacc]'}`}>
                      {p.name}
                    </div>
                  ))}
                  {bluePlayers.filter(p => p.role === 'operative').length === 0 && (
                    <p className="text-[#3a3a5a] text-xs italic">Nenhum agente ainda</p>
                  )}
                </div>
              </div>
              {/* Spymaster */}
              <div>
                <p className="text-xs uppercase tracking-wider text-[#6666aa] mb-2 font-bold">Mestre-Espião</p>
                <div className="min-h-[44px]">
                  {bluePlayers.filter(p => p.role === 'spymaster').map(p => (
                    <div key={p.id} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${p.id === me?.id ? 'bg-[#4a90d9] text-white' : 'bg-[#1a1a3a] text-[#aaaacc]'}`}>
                      👁 {p.name}
                    </div>
                  ))}
                  {bluePlayers.filter(p => p.role === 'spymaster').length === 0 && (
                    <p className="text-[#3a3a5a] text-xs italic">Vaga disponível</p>
                  )}
                </div>
              </div>
              {/* Join buttons */}
              <div className="mt-4 space-y-2">
                <button onClick={() => handleSetTeamRole('blue', 'operative')}
                  className={`w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${me?.team==='blue'&&me?.role==='operative' ? 'bg-[#4a90d9] border-[#4a90d9] text-white' : 'border-[#4a90d9]/40 text-[#4a90d9] hover:bg-[#4a90d9] hover:text-white'}`}>
                  Entrar como Agente
                </button>
                <button onClick={() => handleSetTeamRole('blue', 'spymaster')}
                  className={`w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${me?.team==='blue'&&me?.role==='spymaster' ? 'bg-[#4a90d9] border-[#4a90d9] text-white' : 'border-[#4a90d9]/40 text-[#4a90d9] hover:bg-[#4a90d9] hover:text-white'}`}>
                  👁 Mestre-Espião
                </button>
              </div>
            </div>
          </div>

          {/* Center - Game settings + start */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="bg-[#0d0d20] rounded-2xl border-2 border-[#2a2a4a] p-5 w-full text-center">
              <p className="text-xs uppercase tracking-widest text-[#6666aa] mb-3 font-bold">Configurações</p>
              <div className="bg-[#1a1a3a] rounded-lg px-3 py-2 text-sm text-[#aaaacc] mb-2">
                📦 {gameState.theme?.includes('valorant') ? '🎮 Valorant' : ''} {gameState.theme?.includes('geral') ? '🇧🇷 Geral' : ''}
              </div>
              <div className="bg-[#1a1a3a] rounded-lg px-3 py-2 text-sm text-[#aaaacc]">
                🃏 25 cartas • 4 ou mais jogadores
              </div>
            </div>

            <button onClick={handleStartGame}
              className="w-full bg-[#4a9e6b] hover:bg-[#3a8e5b] text-white font-black py-5 rounded-2xl text-lg uppercase tracking-widest transition-all shadow-lg hover:shadow-[#4a9e6b]/30"
              style={{letterSpacing:'0.12em'}}>
              ▶ Iniciar Jogo
            </button>

            <button onClick={() => handleSetTeamRole('spectator', 'operative')}
              className={`text-xs text-[#6666aa] hover:text-white transition-colors underline ${me?.team==='spectator' ? 'text-white' : ''}`}>
              Assistir como espectador
            </button>
          </div>

          {/* Red team */}
          <div className="bg-[#0d0d20] rounded-2xl border-2 border-[#e8534a]/40 overflow-hidden">
            <div className="bg-[#e8534a] px-5 py-3 text-center">
              <h2 className="font-black text-xl uppercase tracking-widest">Time Vermelho</h2>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <p className="text-xs uppercase tracking-wider text-[#6666aa] mb-2 font-bold">Agentes</p>
                <div className="min-h-[60px] space-y-1">
                  {redPlayers.filter(p => p.role === 'operative').map(p => (
                    <div key={p.id} className={`px-3 py-2 rounded-lg text-sm font-bold ${p.id === me?.id ? 'bg-[#e8534a] text-white' : 'bg-[#1a1a3a] text-[#aaaacc]'}`}>
                      {p.name}
                    </div>
                  ))}
                  {redPlayers.filter(p => p.role === 'operative').length === 0 && (
                    <p className="text-[#3a3a5a] text-xs italic">Nenhum agente ainda</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#6666aa] mb-2 font-bold">Mestre-Espião</p>
                <div className="min-h-[44px]">
                  {redPlayers.filter(p => p.role === 'spymaster').map(p => (
                    <div key={p.id} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${p.id === me?.id ? 'bg-[#e8534a] text-white' : 'bg-[#1a1a3a] text-[#aaaacc]'}`}>
                      👁 {p.name}
                    </div>
                  ))}
                  {redPlayers.filter(p => p.role === 'spymaster').length === 0 && (
                    <p className="text-[#3a3a5a] text-xs italic">Vaga disponível</p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <button onClick={() => handleSetTeamRole('red', 'operative')}
                  className={`w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${me?.team==='red'&&me?.role==='operative' ? 'bg-[#e8534a] border-[#e8534a] text-white' : 'border-[#e8534a]/40 text-[#e8534a] hover:bg-[#e8534a] hover:text-white'}`}>
                  Entrar como Agente
                </button>
                <button onClick={() => handleSetTeamRole('red', 'spymaster')}
                  className={`w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${me?.team==='red'&&me?.role==='spymaster' ? 'bg-[#e8534a] border-[#e8534a] text-white' : 'border-[#e8534a]/40 text-[#e8534a] hover:bg-[#e8534a] hover:text-white'}`}>
                  👁 Mestre-Espião
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── GAME BOARD ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col" style={{fontFamily:'Georgia,serif'}}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b-2 border-[#2a2a4a]">
        <h1 className="text-xl font-black"><span className="text-white">CODE</span><span className="text-[#e8534a]">NAMES</span></h1>

        {/* Turn / Winner */}
        {gameState.phase === 'finished' ? (
          <div className={`px-6 py-2 rounded-full font-black text-lg ${gameState.winner==='red' ? 'bg-[#e8534a]' : 'bg-[#4a90d9]'} text-white`}>
            {gameState.winner==='red' ? '🔴 Time Vermelho Venceu!' : '🔵 Time Azul Venceu!'}
          </div>
        ) : (
          <div className={`px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest ${gameState.currentTurn==='red' ? 'bg-[#e8534a] text-white' : 'bg-[#4a90d9] text-white'}`}>
            {gameState.currentTurn==='red' ? '🔴 Vez do Vermelho' : '🔵 Vez do Azul'}
          </div>
        )}

        <div className="flex items-center gap-4">
          <span className="text-[#e8534a] font-black text-lg">{gameState.redLeft}</span>
          <span className="text-[#6666aa] text-sm">restantes</span>
          <span className="text-[#4a90d9] font-black text-lg">{gameState.blueLeft}</span>
          <button onClick={copyCode}
            className="ml-2 text-xs text-[#6666aa] bg-[#0d0d20] border border-[#2a2a4a] rounded-lg px-3 py-1.5 hover:border-[#e8534a] transition-colors">
            {copied ? '✓ Copiado' : `# ${roomId}`}
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left: Red team */}
        <aside className="w-44 p-4 border-r-2 border-[#2a2a4a] flex flex-col gap-2">
          <div className="bg-[#e8534a] rounded-xl px-3 py-2 text-center font-black text-sm uppercase tracking-wider mb-2">
            🔴 {gameState.redLeft} restam
          </div>
          {redPlayers.map(p => (
            <div key={p.id} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${p.id===me?.id ? 'bg-[#e8534a] text-white' : 'bg-[#0d0d20] text-[#aaaacc] border border-[#2a2a4a]'}`}>
              {p.role==='spymaster' ? '👁' : '●'} {p.name}
            </div>
          ))}
          {me && (
            <div className="mt-auto space-y-1.5 pt-2 border-t border-[#2a2a4a]">
              <button onClick={() => handleSetTeamRole('red','operative')}
                className={`w-full py-1.5 rounded-lg text-xs font-black uppercase border transition-colors ${me.team==='red'&&me.role==='operative' ? 'bg-[#e8534a] border-[#e8534a] text-white' : 'border-[#e8534a]/40 text-[#e8534a] hover:bg-[#e8534a] hover:text-white'}`}>
                Agente 🔴
              </button>
              <button onClick={() => handleSetTeamRole('red','spymaster')}
                className={`w-full py-1.5 rounded-lg text-xs font-black uppercase border transition-colors ${me.team==='red'&&me.role==='spymaster' ? 'bg-[#e8534a] border-[#e8534a] text-white' : 'border-[#e8534a]/40 text-[#e8534a] hover:bg-[#e8534a] hover:text-white'}`}>
                Espião 👁🔴
              </button>
            </div>
          )}
        </aside>

        {/* Center: Board */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          {/* Hint area */}
          <div className="w-full max-w-3xl">
            {gameState.hint ? (
              <div className={`flex items-center justify-center gap-4 py-3 px-6 rounded-2xl border-2 ${gameState.hint.team==='red' ? 'border-[#e8534a] bg-[#e8534a]/10' : 'border-[#4a90d9] bg-[#4a90d9]/10'}`}>
                <span className="text-2xl font-black uppercase tracking-widest">{gameState.hint.word}</span>
                <span className={`text-4xl font-black ${gameState.hint.team==='red' ? 'text-[#e8534a]' : 'text-[#4a90d9]'}`}>{gameState.hint.count}</span>
                <span className="text-sm text-[#6666aa]">{gameState.hint.guessesLeft} tentativa{gameState.hint.guessesLeft !== 1 ? 's' : ''}</span>
                {isMyTurn && !isSpymaster && (
                  <button onClick={handlePassTurn}
                    className="ml-2 px-4 py-1.5 rounded-lg bg-[#2a2a4a] text-[#aaaacc] hover:text-white text-sm font-bold transition-colors">
                    Passar →
                  </button>
                )}
              </div>
            ) : canGiveHint ? (
              <div className="flex items-center gap-2 justify-center">
                <input value={hintWord} onChange={e => setHintWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleHintSubmit()}
                  placeholder="Palavra-dica..."
                  className="bg-[#0d0d20] border-2 border-[#2a2a4a] rounded-xl px-4 py-3 text-white placeholder-[#3a3a5a] focus:outline-none focus:border-[#e8534a] w-52 text-lg"
                />
                <select value={hintCount} onChange={e => setHintCount(Number(e.target.value))}
                  className="bg-[#0d0d20] border-2 border-[#2a2a4a] rounded-xl px-3 py-3 text-white text-lg w-20">
                  {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                  <option value={0}>∞</option>
                </select>
                <button onClick={handleHintSubmit}
                  className={`px-6 py-3 rounded-xl font-black text-white uppercase tracking-wider transition-colors ${me?.team==='red' ? 'bg-[#e8534a] hover:bg-[#d44440]' : 'bg-[#4a90d9] hover:bg-[#3a80c9]'}`}>
                  Dar Dica
                </button>
              </div>
            ) : (
              <p className="text-center text-[#3a3a5a] text-sm py-3">
                {gameState.phase === 'playing'
                  ? isSpymaster ? 'Aguardando seu turno...' : 'Aguardando a dica do Mestre-Espião...'
                  : ''}
              </p>
            )}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-5 gap-3 w-full max-w-3xl">
            {gameState.cards.map((card, i) => {
              const showColor = card.revealed || isSpymaster

              let cardBg = '#c8b89a'
              let cardText = '#2a1a0a'
              let cardBorder = 'transparent'
              let cardShadow = ''

              if (card.revealed) {
                if (card.team === 'red') { cardBg = '#e8534a'; cardText = '#fff' }
                else if (card.team === 'blue') { cardBg = '#4a90d9'; cardText = '#fff' }
                else if (card.team === 'neutral') { cardBg = '#a89070'; cardText = '#fff' }
                else if (card.team === 'assassin') { cardBg = '#111'; cardText = '#fff' }
              } else if (isSpymaster) {
                cardBg = '#1e1e3a'
                cardText = '#ffffff'
                cardBorder = TEAM_COLORS[card.team]
                cardShadow = `0 0 12px ${TEAM_COLORS[card.team]}55`
              }

              return (
                <button key={i} onClick={() => handleCardClick(i)}
                  disabled={!canReveal || card.revealed}
                  className={`
                    relative rounded-xl font-black uppercase tracking-wider
                    transition-all duration-150 min-h-[72px] flex items-center justify-center
                    text-sm px-2 py-3 border-2
                    ${!card.revealed && canReveal ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : 'cursor-default'}
                    ${card.revealed ? 'opacity-75' : ''}
                  `}
                  style={{
                    backgroundColor: cardBg,
                    color: cardText,
                    borderColor: cardBorder || 'transparent',
                    boxShadow: cardShadow || undefined,
                    letterSpacing: '0.06em',
                  }}>
                  <span className="text-center leading-tight">{card.word}</span>
                  {isSpymaster && !card.revealed && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
                      style={{backgroundColor: TEAM_COLORS[card.team]}} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Hint history */}
          {gameState.hintHistory.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap justify-center mt-1">
              <span className="text-xs text-[#3a3a5a] uppercase tracking-widest">Histórico:</span>
              {gameState.hintHistory.slice(0, 6).map((h, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full font-bold ${h.team==='red' ? 'bg-[#e8534a]/20 text-[#e8534a]' : 'bg-[#4a90d9]/20 text-[#4a90d9]'}`}>
                  {h.word} ×{h.count}
                </span>
              ))}
            </div>
          )}
        </main>

        {/* Right: Blue team */}
        <aside className="w-44 p-4 border-l-2 border-[#2a2a4a] flex flex-col gap-2">
          <div className="bg-[#4a90d9] rounded-xl px-3 py-2 text-center font-black text-sm uppercase tracking-wider mb-2">
            🔵 {gameState.blueLeft} restam
          </div>
          {bluePlayers.map(p => (
            <div key={p.id} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${p.id===me?.id ? 'bg-[#4a90d9] text-white' : 'bg-[#0d0d20] text-[#aaaacc] border border-[#2a2a4a]'}`}>
              {p.role==='spymaster' ? '👁' : '●'} {p.name}
            </div>
          ))}
          {me && (
            <div className="mt-auto space-y-1.5 pt-2 border-t border-[#2a2a4a]">
              <button onClick={() => handleSetTeamRole('blue','operative')}
                className={`w-full py-1.5 rounded-lg text-xs font-black uppercase border transition-colors ${me.team==='blue'&&me.role==='operative' ? 'bg-[#4a90d9] border-[#4a90d9] text-white' : 'border-[#4a90d9]/40 text-[#4a90d9] hover:bg-[#4a90d9] hover:text-white'}`}>
                Agente 🔵
              </button>
              <button onClick={() => handleSetTeamRole('blue','spymaster')}
                className={`w-full py-1.5 rounded-lg text-xs font-black uppercase border transition-colors ${me.team==='blue'&&me.role==='spymaster' ? 'bg-[#4a90d9] border-[#4a90d9] text-white' : 'border-[#4a90d9]/40 text-[#4a90d9] hover:bg-[#4a90d9] hover:text-white'}`}>
                Espião 👁🔵
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
