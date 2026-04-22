# 🎮 Codenames - App Completo

## Stack
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Realtime**: Supabase (WebSocket / Realtime)
- **Deploy**: Vercel (frontend) + Supabase (free tier backend)

---

## 📁 Estrutura do Projeto

```
codenames-app/
├── app/
│   ├── page.tsx              # Home - criar/entrar sala
│   ├── room/[id]/page.tsx    # Sala do jogo
│   └── layout.tsx
├── components/
│   ├── Board.tsx             # Grid 5x5
│   ├── Card.tsx              # Carta individual
│   ├── TeamPanel.tsx         # Painel dos times
│   ├── HintInput.tsx         # Input da dica (spymaster)
│   ├── ThemeSelector.tsx     # Seletor de tema + palavras customizadas
│   └── RoleModal.tsx         # Modal de escolha de papel
├── lib/
│   ├── supabase.ts           # Client Supabase
│   ├── gameLogic.ts          # Lógica do jogo
│   └── wordbanks/
│       ├── geral.ts          # ~200 palavras PT-BR
│       ├── valorant.ts       # ~150 palavras Valorant
│       └── index.ts          # Exporta tudo + merge
├── types/
│   └── game.ts               # Tipos TypeScript
├── .env.local.example
├── package.json
└── supabase-schema.sql       # Schema do banco
```

---

## 🚀 Setup Rápido

### 1. Clone e instale
```bash
git clone <seu-repo>
cd codenames-app
npm install
```

### 2. Crie projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Vá em **SQL Editor** e rode o arquivo `supabase-schema.sql`
3. Copie a **URL** e **anon key** do projeto

### 3. Configure variáveis de ambiente
```bash
cp .env.local.example .env.local
# Edite .env.local com suas credenciais do Supabase
```

### 4. Rode localmente
```bash
npm run dev
```

### 5. Deploy no Vercel
```bash
npx vercel
# Adicione as env vars NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🎯 Funcionalidades

- ✅ Criar sala e compartilhar link
- ✅ Entrar com nome
- ✅ Escolher time (vermelho/azul) e papel (spymaster/operativo)
- ✅ Grid 5x5 com cores escondidas para operativos
- ✅ Spymaster vê todas as cores
- ✅ Dar dicas (palavra + número)
- ✅ Revelar cartas com clique
- ✅ Detecção de vitória/derrota (incluindo assassino)
- ✅ Temas: Geral PT-BR, Valorant
- ✅ Adicionar palavras customizadas
- ✅ Sincronização em tempo real via Supabase
- ✅ Chat de dicas visível por todos

---

## 🗃️ Schema do Supabase

Veja o arquivo `supabase-schema.sql` — cria as tabelas `rooms` e `players`.
