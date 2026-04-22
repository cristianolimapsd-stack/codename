  occupiedBy?: Player
  active: boolean
  onClick: () => void
}

function RoleCard({ title, placeholder, occupiedBy, active, onClick }: RoleCardProps) {
  return (
    <div className="mt-5 rounded-[22px] border border-white/15 bg-black/12 px-4 py-6 text-center">
      <p className="text-center text-[12px] font-black uppercase tracking-[0.22em] text-white/60">{title}</p>

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
            {team === 'red' ? 'Agentes' : 'Agentes'}
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
            <p className="text-sm font-bold text-white/80">{players.length} jogador{players.length !== 1 ? 'es' : ''}</p>
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
          {players.length === 0 && <p className="text-sm italic text-white/35">Nenhum jogador neste time ainda.</p>}
        </div>
      </div>
    </aside>
  )
}

export default function RoomPageRedesign() {
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
