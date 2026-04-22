-- Tabela principal das salas
create table rooms (
  id text primary key,
  state jsonb not null,
  created_at timestamp with time zone default now()
);

-- Tabela de jogadores
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  name text not null,
  team text check (team in ('red', 'blue', 'spectator')) default 'spectator',
  role text check (role in ('spymaster', 'operative')) default 'operative',
  joined_at timestamp with time zone default now()
);

-- Habilitar Realtime nas duas tabelas
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- Política de acesso público (para desenvolvimento sem auth)
alter table rooms enable row level security;
alter table players enable row level security;

create policy "Allow all on rooms" on rooms for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
