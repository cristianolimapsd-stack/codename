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

export default function Home() {
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
    setThemes((prev) =>
      prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]
    )
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

      const { data, error: roomErr } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', roomId)
        .single()

      if (roomErr || !data) throw new Error('Sala não encontrada!')

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
      setError(e.message || 'Erro ao entrar na sala')
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0a1018_0%,#17273a_45%,#2a4561_100%)] text-white">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_2px,transparent_2px,transparent_24px)] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,83,74,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(74,144,217,0.12),transparent_24%),radial-gradient(circle_at_bottom_center,rgba(255,255,255,0.04),transparent_35%)]" />

      <div className="absolute left-10 top-16 h-28 w-20 rotate-[-12deg] rounded-[20px] border border-white/10 bg-[#cf6d59]/20 shadow-2xl" />
      <div className="absolute left-28 top-24 h-28 w-20 rotate-[11deg] rounded-[20px] border border-white/10 bg-[#4b90d8]/20 shadow-2xl" />
      <div className="absolute bottom-16 right-20 h-28 w-20 rotate-[10deg] rounded-[20px] border border-white/10 bg-[#c8c09a]/18 shadow-2xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_520px]">
          <section className="max-w-[680px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#0f1b28]/70 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-white/70 backdrop-blur-md">
              Tempo real
              <span className="h-2 w-2 rounded-full bg-[#4fe26d]" />
              Salas privadas
            </div>

            <h1 className="text-[clamp(3.8rem,9vw,7.4rem)] font-black uppercase leading-[0.9] tracking-[-0.05em]">
              <span className="text-white">Code</span>
              <span className="text-[#ff6e5c]">Names</span>
            </h1>

            <p className="mt-6 max-w-[52ch] text-lg leading-8 text-white">
              Monte salas temáticas, convide seus amigos e jogue uma versão mais elegante e
              personalizada do Codenames com temas como Valorant, Marvel Rivals, palavras
              customizadas e multiplayer em tempo real.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Tema</p>
                <p className="mt-2 text-2xl font-black">Valorant</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Agentes, mapas, armas e callouts.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Modo</p>
                <p className="mt-2 text-2xl font-black">Lobby rápido</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Crie uma sala e compartilhe o código.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Custom</p>
                <p className="mt-2 text-2xl font-black">Suas palavras</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Adicione o vocabulário que quiser.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-[rgba(31,49,72,0.78)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-6 rounded-[28px] border border-white/10 bg-[#1c2738] p-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu apelido de agente..."
                className="w-full rounded-[20px] border border-[#2a3444] bg-[#08111c] px-5 py-4 text-lg text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
              />
            </div>

            <div className="mb-5 flex rounded-[24px] border border-[#101826] bg-[#08111c] p-1.5">
              <button
                onClick={() => setTab('create')}
                className={cn(
                  'flex-1 rounded-[18px] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition',
                  tab === 'create' ? 'bg-[#d85b49] text-white shadow-lg' : 'text-white/55 hover:text-white'
                )}
              >
                Criar sala
              </button>
              <button
                onClick={() => setTab('join')}
                className={cn(
                  'flex-1 rounded-[18px] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition',
                  tab === 'join' ? 'bg-[#3f8ed8] text-white shadow-lg' : 'text-white/55 hover:text-white'
                )}
              >
                Entrar
              </button>
            </div>

            {tab === 'create' && (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-[#23364b]/75 p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/45">
                    Pacotes de palavras
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        id: 'geral',
                        label: 'Geral PT-BR',
                        desc: 'Base ampla para partidas clássicas',
                        accent: 'from-[#c89d6b] to-[#d5b384]',
                      },
                      {
                        id: 'valorant',
                        label: 'Valorant',
                        desc: 'Agentes, mapas, armas e habilidades',
                        accent: 'from-[#9b463c] to-[#e26b57]',
                      },
                      {
                        id: 'marvel-rivals',
                        label: 'Marvel Rivals',
                        desc: 'Heróis, mapas, poderes e facções',
                        accent: 'from-[#8c2330] to-[#3f8ed8]',
                      },
                    ].map((theme) => {
                      const selected = themes.includes(theme.id)

                      return (
                        <button
                          key={theme.id}
                          onClick={() => toggleTheme(theme.id)}
                          className={cn(
                            'rounded-[22px] border p-4 text-left transition',
                            selected
                              ? 'border-white/20 bg-white/[0.08] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          )}
                        >
                          <div className={cn('mb-4 h-2 rounded-full bg-gradient-to-r', theme.accent)} />
                          <p className="text-lg font-black">{theme.label}</p>
                          <p className="mt-1 text-sm leading-6 text-white/60">{theme.desc}</p>

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                              Tema
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]',
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
                  <p className="mt-1 text-sm text-white/60">
                    Misture seus termos com os temas selecionados para criar partidas sob medida.
                  </p>
                </button>

                {showCustom && (
                  <textarea
                    value={customWords}
                    onChange={(e) => setCustomWords(e.target.value)}
                    placeholder="Raze, Ascent, Spike, Iron Man, Hulk..."
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
                <div className="rounded-[28px] border border-white/10 bg-[#23364b]/75 p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-white/45">
                    Código da sala
                  </p>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
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

            <p className="mt-5 text-center text-xs uppercase tracking-[0.22em] text-white/35">
              Compartilhe o código com seus amigos para jogar juntos
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
