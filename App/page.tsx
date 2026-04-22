'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createInitialState } from '@/lib/gameLogic'

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const word = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${word()}-${word()}`
}

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [themes, setThemes] = useState<string[]>(['geral'])
  const [customWords, setCustomWords] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleTheme = (t: string) => {
    setThemes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleCreate = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (themes.length === 0) return setError('Selecione ao menos um tema!')
    setLoading(true)
    setError('')
    try {
      const roomId = generateRoomId()
      const custom = customWords.split(/[\n,]+/).map(w => w.trim()).filter(Boolean)
      const state = createInitialState(themes, custom)

      const { error: roomErr } = await supabase.from('rooms').insert({ id: roomId, state })
      if (roomErr) throw roomErr

      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))

      const { error: playerErr } = await supabase.from('players').insert({
        id: playerId,
        room_id: roomId,
        name,
        team: 'spectator',
        role: 'operative',
      })
      if (playerErr) throw playerErr

      router.push(`/room/${roomId}`)
    } catch (e: any) {
      setError(e.message || 'Erro ao criar sala')
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (!joinCode.trim()) return setError('Digite o código da sala!')
    setLoading(true)
    setError('')
    try {
      const roomId = joinCode.trim().toLowerCase()
      const { data, error: roomErr } = await supabase.from('rooms').select('id').eq('id', roomId).single()
      if (roomErr || !data) throw new Error('Sala não encontrada!')

      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))

      await supabase.from('players').insert({
        id: playerId,
        room_id: roomId,
        name,
        team: 'spectator',
        role: 'operative',
      })

      router.push(`/room/${roomId}`)
    } catch (e: any) {
      setError(e.message || 'Erro ao entrar na sala')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0f14] text-white flex flex-col items-center justify-center px-4 font-mono">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-1">
            CODE<span className="text-[#ff4655]">NAMES</span>
          </h1>
          <p className="text-[#8b8fa8] text-sm tracking-widest uppercase">Multiplayer em tempo real</p>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs text-[#8b8fa8] uppercase tracking-widest mb-2">Seu nome</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Como quer ser chamado?"
            className="w-full bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3 text-white placeholder-[#3a3d52] focus:outline-none focus:border-[#ff4655] transition-colors"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-[#1e2130] my-6" />

        {/* CREATE ROOM */}
        <div className="bg-[#12141e] border border-[#1e2130] rounded-xl p-5 mb-4">
          <h2 className="text-sm uppercase tracking-widest text-[#ff4655] font-bold mb-4">Criar Sala</h2>

          {/* Themes */}
          <label className="block text-xs text-[#8b8fa8] uppercase tracking-widest mb-2">Temas</label>
          <div className="flex gap-2 flex-wrap mb-4">
            {['geral', 'valorant'].map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  themes.includes(t)
                    ? 'bg-[#ff4655] text-white'
                    : 'bg-[#1a1d27] text-[#8b8fa8] border border-[#2a2d3e] hover:border-[#ff4655]'
                }`}
              >
                {t === 'geral' ? '🇧🇷 Geral PT-BR' : '🎮 Valorant'}
              </button>
            ))}
          </div>

          {/* Custom words */}
          <label className="block text-xs text-[#8b8fa8] uppercase tracking-widest mb-2">
            Palavras customizadas <span className="text-[#3a3d52]">(separadas por vírgula ou linha)</span>
          </label>
          <textarea
            value={customWords}
            onChange={e => setCustomWords(e.target.value)}
            placeholder="ex: Raze, Ascent, Spike, Phantom..."
            rows={3}
            className="w-full bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3 text-white placeholder-[#3a3d52] focus:outline-none focus:border-[#ff4655] transition-colors resize-none text-sm mb-4"
          />

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-[#ff4655] hover:bg-[#e03040] text-white font-black py-3 rounded-lg tracking-widest uppercase text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </button>
        </div>

        {/* JOIN ROOM */}
        <div className="bg-[#12141e] border border-[#1e2130] rounded-xl p-5">
          <h2 className="text-sm uppercase tracking-widest text-[#4fc3f7] font-bold mb-4">Entrar em Sala</h2>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="código da sala (ex: jiraz-dokuj)"
              className="flex-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3 text-white placeholder-[#3a3d52] focus:outline-none focus:border-[#4fc3f7] transition-colors text-sm"
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="bg-[#4fc3f7] hover:bg-[#29b6f6] text-[#0d0f14] font-black px-5 rounded-lg uppercase text-sm tracking-wider transition-colors disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[#ff4655] text-sm text-center mt-4">{error}</p>
        )}
      </div>
    </main>
  )
}
