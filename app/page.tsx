'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createInitialState } from '@/lib/gameLogic'

function generateRoomId() {
  const words = ['cobra','tigre','fogo','gelo','bravo','limao','pedra','vento','nuvem','raio','lobo','urso','onca','aguia','lance','torto','verde','roxo','claro','escuro']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  return `${pick()}-${pick()}`
}

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [themes, setThemes] = useState<string[]>(['geral'])
  const [customWords, setCustomWords] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'create'|'join'>('create')

  const toggleTheme = (t: string) => {
    setThemes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleCreate = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (themes.length === 0) return setError('Selecione ao menos um tema!')
    setLoading(true); setError('')
    try {
      const roomId = generateRoomId()
      const custom = customWords.split(/[\n,]+/).map(w => w.trim()).filter(Boolean)
      const state = createInitialState(themes, custom)
      const { error: roomErr } = await supabase.from('rooms').insert({ id: roomId, state })
      if (roomErr) throw roomErr
      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))
      await supabase.from('players').insert({ id: playerId, room_id: roomId, name, team: 'spectator', role: 'operative' })
      router.push(`/room/${roomId}`)
    } catch (e: any) { setError(e.message || 'Erro ao criar sala'); setLoading(false) }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (!joinCode.trim()) return setError('Digite o código da sala!')
    setLoading(true); setError('')
    try {
      const roomId = joinCode.trim().toLowerCase()
      const { data, error: roomErr } = await supabase.from('rooms').select('id').eq('id', roomId).single()
      if (roomErr || !data) throw new Error('Sala não encontrada!')
      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))
      await supabase.from('players').insert({ id: playerId, room_id: roomId, name, team: 'spectator', role: 'operative' })
      router.push(`/room/${roomId}`)
    } catch (e: any) { setError(e.message || 'Erro ao entrar na sala'); setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
        style={{backgroundImage:'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)'}} />

      {/* Floating card decorations */}
      <div className="absolute top-10 left-10 w-16 h-20 bg-[#e8534a] rounded-lg opacity-20 rotate-12" />
      <div className="absolute top-20 left-24 w-16 h-20 bg-[#4a90d9] rounded-lg opacity-15 -rotate-6" />
      <div className="absolute bottom-20 right-10 w-16 h-20 bg-[#e8c84a] rounded-lg opacity-15 rotate-6" />
      <div className="absolute bottom-10 right-24 w-16 h-20 bg-[#4a9e6b] rounded-lg opacity-15 -rotate-12" />
      <div className="absolute top-1/3 right-12 w-12 h-16 bg-[#111] rounded-lg opacity-30 rotate-3" />
      <div className="absolute top-1/2 left-8 w-10 h-14 bg-[#e8534a] rounded-lg opacity-10 -rotate-8" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-black tracking-tight leading-none mb-2"
            style={{fontFamily:'Georgia,serif', textShadow:'3px 3px 0px rgba(0,0,0,0.4)'}}>
            <span className="text-white">CODE</span><span className="text-[#e8534a]">NAMES</span>
          </h1>
          <p className="text-[#6666aa] text-xs tracking-[0.4em] uppercase font-bold">Multiplayer • Tempo Real</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu apelido de agente..."
            className="w-full bg-[#0d0d20] border-2 border-[#2a2a4a] rounded-2xl px-5 py-4 text-white text-lg placeholder-[#3a3a5a] focus:outline-none focus:border-[#e8534a] transition-colors"
            style={{fontFamily:'Georgia,serif'}}
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0d0d20] rounded-2xl p-1.5 border-2 border-[#2a2a4a] mb-1">
          <button onClick={() => setTab('create')}
            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${tab==='create' ? 'bg-[#e8534a] text-white' : 'text-[#6666aa] hover:text-white'}`}
            style={{fontFamily:'Georgia,serif'}}>
            Criar Sala
          </button>
          <button onClick={() => setTab('join')}
            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${tab==='join' ? 'bg-[#4a90d9] text-white' : 'text-[#6666aa] hover:text-white'}`}
            style={{fontFamily:'Georgia,serif'}}>
            Entrar
          </button>
        </div>

        {tab === 'create' && (
          <div className="bg-[#0d0d20] border-2 border-[#2a2a4a] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[#6666aa] mb-3 font-black">Pacote de Palavras</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: 'geral', label: '🇧🇷 Geral PT-BR', desc: '~150 palavras' },
                { id: 'valorant', label: '🎮 Valorant', desc: 'Agentes, mapas, armas' },
              ].map(t => (
                <button key={t.id} onClick={() => toggleTheme(t.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${themes.includes(t.id) ? 'border-[#e8534a] bg-[#e8534a]/10' : 'border-[#2a2a4a] hover:border-[#44446a]'}`}>
                  <div className="font-bold text-sm text-white">{t.label}</div>
                  <div className="text-xs text-[#6666aa] mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setShowCustom(!showCustom)}
              className={`w-full p-3 rounded-xl border-2 border-dashed text-sm transition-all mb-3 text-left flex items-center gap-3 ${showCustom ? 'border-[#e8534a] text-white bg-[#e8534a]/5' : 'border-[#2a2a4a] text-[#6666aa] hover:border-[#44446a] hover:text-white'}`}>
              <span className="text-xl w-6 text-center">{showCustom ? '✕' : '✏️'}</span>
              <div>
                <div className="font-bold">Palavras Personalizadas</div>
                <div className="text-xs opacity-70">Adicione suas próprias palavras ao jogo</div>
              </div>
            </button>

            {showCustom && (
              <textarea
                value={customWords}
                onChange={e => setCustomWords(e.target.value)}
                placeholder="Raze, Ascent, Spike, Phantom, Jett..."
                rows={3}
                className="w-full bg-[#12122a] border-2 border-[#2a2a4a] rounded-xl px-4 py-3 text-white placeholder-[#3a3a5a] focus:outline-none focus:border-[#e8534a] transition-colors resize-none text-sm mb-3"
              />
            )}

            <button onClick={handleCreate} disabled={loading}
              className="w-full bg-[#e8534a] hover:bg-[#d44440] text-white font-black py-4 rounded-xl uppercase transition-all disabled:opacity-50 text-base"
              style={{fontFamily:'Georgia,serif', letterSpacing:'0.1em'}}>
              {loading ? 'Criando sala...' : '⚡ Criar Sala'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="bg-[#0d0d20] border-2 border-[#2a2a4a] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[#6666aa] mb-3 font-black">Código da Sala</p>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="ex: cobra-tigre"
              className="w-full bg-[#12122a] border-2 border-[#2a2a4a] rounded-xl px-5 py-4 text-white text-xl placeholder-[#3a3a5a] focus:outline-none focus:border-[#4a90d9] transition-colors mb-4"
              style={{fontFamily:'Georgia,serif'}}
            />
            <button onClick={handleJoin} disabled={loading}
              className="w-full bg-[#4a90d9] hover:bg-[#3a80c9] text-white font-black py-4 rounded-xl uppercase transition-all disabled:opacity-50 text-base"
              style={{fontFamily:'Georgia,serif', letterSpacing:'0.1em'}}>
              {loading ? 'Entrando...' : '→ Entrar na Sala'}
            </button>
          </div>
        )}

        {error && <p className="text-[#e8534a] text-sm text-center mt-4 font-bold">{error}</p>}
        <p className="text-center text-[#3a3a5a] text-xs mt-5">Compartilhe o código com seus amigos para jogar juntos</p>
      </div>
    </main>
  )
}
