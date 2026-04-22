'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createInitialState } from '@/lib/gameLogic'

function generateRoomId() {
  const words = [
    'cobra',
    'tigre',
    'fogo',
    'gelo',
    'bravo',
    'limao',
    'pedra',
    'vento',
    'nuvem',
    'raio',
    'lobo',
    'urso',
    'onca',
    'aguia',
    'lance',
    'torto',
    'verde',
    'roxo',
    'claro',
    'escuro',
  ]
  const pick = () => words[Math.floor(Math.random() * words.length)]
  return `${pick()}-${pick()}`
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function HomePageRedesign() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [themes, setThemes] = useState<string[]>(['geral'])
  const [customWords, setCustomWords] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'create' | 'join'>('create')

  const toggleTheme = (theme: string) => {
    setThemes((prev) => (prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]))
  }

  const handleCreate = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (themes.length === 0) return setError('Selecione ao menos um tema!')
    setLoading(true)
    setError('')

    try {
      const roomId = generateRoomId()
      const custom = customWords
        .split(/[\n,]+/)
        .map((word) => word.trim())
        .filter(Boolean)

      const state = createInitialState(themes, custom)
      const { error: roomErr } = await supabase.from('rooms').insert({ id: roomId, state })
      if (roomErr) throw roomErr

      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))
      await supabase
        .from('players')
        .insert({ id: playerId, room_id: roomId, name, team: 'spectator', role: 'operative' })

      router.push(`/room/${roomId}`)
    } catch (e: any) {
      setError(e.message || 'Erro ao criar sala')
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim()) return setError('Digite seu nome!')
    if (!joinCode.trim()) return setError('Digite o codigo da sala!')
    setLoading(true)
    setError('')

    try {
      const roomId = joinCode.trim().toLowerCase()
      const { data, error: roomErr } = await supabase.from('rooms').select('id').eq('id', roomId).single()
      if (roomErr || !data) throw new Error('Sala nao encontrada!')

      const playerId = crypto.randomUUID()
      localStorage.setItem(`codenames_player_${roomId}`, JSON.stringify({ id: playerId, name }))
      await supabase
        .from('players')
        .insert({ id: playerId, room_id: roomId, name, team: 'spectator', role: 'operative' })

      router.push(`/room/${roomId}`)
    } catch (e: any) {
      setError(e.message || 'Erro ao entrar na sala')
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#05070d_0%,#101a29_16%,#1f344b_58%,#24415b_100%)] text-white">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_2px,transparent_2px,transparent_24px)] opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(80,155,255,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(232,83,74,0.16),transparent_20%),radial-gradient(circle_at_bottom_center,rgba(255,208,140,0.12),transparent_28%)]" />

      <div className="pointer-events-none absolute left-10 top-16 h-28 w-20 rotate-[-12deg] rounded-[20px] border border-white/10 bg-[#cf6d59]/20 shadow-2xl" />
      <div className="pointer-events-none absolute left-28 top-24 h-28 w-20 rotate-[11deg] rounded-[20px] border border-white/10 bg-[#4b90d8]/20 shadow-2xl" />
      <div className="pointer-events-none absolute bottom-16 right-20 h-28 w-20 rotate-[10deg] rounded-[20px] border border-white/10 bg-[#cba56d]/20 shadow-2xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1380px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_520px]">
          <section className="max-w-[640px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-white/60 backdrop-blur-md">
              Tempo real
              <span className="h-2 w-2 rounded-full bg-[#4fe26d]" />
              Salas privadas
            </div>

            <h1 className="text-[clamp(3.5rem,9vw,7.2rem)] font-black uppercase leading-[0.92] tracking-[-0.05em]">
              <span className="text-white">Code</span>
              <span className="text-[#ff6e5c]">Names</span>
            </h1>

            <p className="mt-5 max-w-[52ch] text-lg leading-8 text-white/68">
              Monte salas tematicas, convide seus amigos e jogue uma versao mais elegante e personalizada do
              Codenames com temas como Valorant, palavras customizadas e multiplayer em tempo real.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-4 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Tema</p>
                <p className="mt-2 text-xl font-black">Valorant</p>
                <p className="mt-1 text-sm text-white/55">Agentes, mapas, armas e callouts.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-4 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Modo</p>
                <p className="mt-2 text-xl font-black">Lobby rapido</p>
                <p className="mt-1 text-sm text-white/55">Crie uma sala e compartilhe o codigo.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-4 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Custom</p>
                <p className="mt-2 text-xl font-black">Suas palavras</p>
                <p className="mt-1 text-sm text-white/55">Adicione o vocabulrio que quiser.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-black/24 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu apelido de agente..."
                className="w-full rounded-[20px] border border-white/10 bg-[#08111c] px-5 py-4 text-lg text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
            </div>

            <div className="mb-5 flex rounded-[24px] border border-white/10 bg-[#08111c] p-1.5">
              <button
                onClick={() => setTab('create')}
                className={cn(
                  'flex-1 rounded-[18px] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition',
                  tab === 'create' ? 'bg-[#d85b49] text-white shadow-lg' : 'text-white/45 hover:text-white'
                )}
              >
                Criar sala
              </button>
              <button
                onClick={() => setTab('join')}
                className={cn(
                  'flex-1 rounded-[18px] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition',
                  tab === 'join' ? 'bg-[#3f8ed8] text-white shadow-lg' : 'text-white/45 hover:text-white'
                )}
              >
                Entrar
              </button>
            </div>

            {tab === 'create' && (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-[#08111c]/86 p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/40">Pacotes de palavras</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: 'geral', label: 'Geral PT-BR', desc: 'Base ampla para partidas classicas', accent: 'from-[#b58960] to-[#d6b184]' },
                      { id: 'valorant', label: 'Valorant', desc: 'Agentes, mapas, armas e habilidades', accent: 'from-[#8d3c34] to-[#dc6957]' },
                    ].map((theme) => {
                      const selected = themes.includes(theme.id)
                      return (
                        <button
                          key={theme.id}
                          onClick={() => toggleTheme(theme.id)}
                          className={cn(
                            'rounded-[22px] border p-4 text-left transition',
                            selected
                              ? 'border-white/25 bg-white/8 shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          )}
                        >
                          <div className={cn('mb-4 h-2 rounded-full bg-gradient-to-r', theme.accent)} />
                          <p className="text-lg font-black">{theme.label}</p>
                          <p className="mt-1 text-sm text-white/55">{theme.desc}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-[0.22em] text-white/35">Tema</span>
                            <span
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]',
                                selected ? 'bg-[#2eb300] text-white' : 'bg-white/8 text-white/45'
                              )}
                            >
                              {selected ? 'Selecionado' : 'Selecionar'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={cn(
                    'w-full rounded-[24px] border border-dashed p-4 text-left transition',
                    showCustom
                      ? 'border-[#ff8f77]/45 bg-[#d85b49]/10'
                      : 'border-white/12 bg-white/[0.03] hover:bg-white/[0.06]'
                  )}
                >
                  <p className="text-sm font-black uppercase tracking-[0.18em]">
                    {showCustom ? 'Ocultar palavras personalizadas' : 'Adicionar palavras personalizadas'}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Misture seus termos com os temas selecionados para criar partidas sob medida.
                  </p>
                </button>

                {showCustom && (
                  <textarea
                    value={customWords}
                    onChange={(event) => setCustomWords(event.target.value)}
                    placeholder="Raze, Ascent, Spike, Phantom, Jett..."
                    rows={4}
                    className="w-full resize-none rounded-[24px] border border-white/10 bg-[#08111c] px-5 py-4 text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                )}

                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full rounded-[22px] border border-[#ff9d90]/35 bg-gradient-to-b from-[#df6a58] to-[#b64333] px-5 py-4 text-base font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_35px_rgba(182,67,51,0.35)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Criando sala...' : 'Criar sala'}
                </button>
              </div>
            )}

            {tab === 'join' && (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-[#08111c]/86 p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/40">Codigo da sala</p>
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleJoin()}
                    placeholder="ex: cobra-tigre"
                    className="w-full rounded-[22px] border border-white/10 bg-black/20 px-5 py-4 text-xl text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </div>

                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full rounded-[22px] border border-[#7ebfff]/35 bg-gradient-to-b from-[#4e9ae0] to-[#2d78bf] px-5 py-4 text-base font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_35px_rgba(45,120,191,0.35)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar na sala'}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-[20px] border border-[#d85b49]/30 bg-[#d85b49]/10 px-4 py-3 text-sm font-bold text-[#ffac9f]">
                {error}
              </div>
            )}

            <p className="mt-5 text-center text-xs uppercase tracking-[0.22em] text-white/28">
              Compartilhe o codigo com seus amigos para jogar juntos
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
