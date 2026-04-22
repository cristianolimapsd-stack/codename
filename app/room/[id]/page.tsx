'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { revealCard, applyHint, passTurn, createInitialState } from '@/lib/gameLogic'
import type { GameState, Player, PlayerTeam, PlayerRole } from '@/types/game'

const TEAM_SURFACES = {
  red: {
    panel: 'from-[#a53f2f] via-[#c55342] to-[#df7159]',
    border: 'border-[#f29a84]/45',
    text: 'text-[#ffb9ab]',
    badge: 'bg-[#d85b49]',
    shadow: 'shadow-[0_18px_45px_rgba(216,91,73,0.2)]',
  },
  blue: {
    panel: 'from-[#145c8b] via-[#247ebd] to-[#4da7e8]',
    border: 'border-[#88d3ff]/45',
    text: 'text-[#a8d9ff]',
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

function getThemesFromState(gameState: GameState) {
  if (Array.isArray(gameState.theme)) return gameState.theme
  if (typeof gameState.theme === 'string' && gameState.theme.trim()) return [gameState.theme]
  return ['geral']
}

function PersonBadge({ name, crowned = false }: { name: string; crowned?: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      {crowned ? (
        <div className="absolute -left-1 top-0 z-10 text-[28px] drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]">
          👑
        </div>
      ) : null}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="22" r="12" fill="rgba(255,255,255,0.82)" />
          <path d="M14 55c2-10 10-16 18-16s16 6 18 16" fill="rgba(255,255,255,0.82)" />
        </svg>
        <div className="absolute inset-x-3 bottom-2 rounded-full bg-[#0b3050]/85 px-2 py-1 text-center text-sm font-black text-white">
          {name}
        </div>
      </div>
    </div>
  )
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
    <div className="mt-5 rounded-[24px] border border-white/15 bg-black/12 px-5 py-5 text-center">
      <p className="text-center text-[12px] font-black uppercase tracking-[0.22em] text-white/60">{title}</p>

      <div className="mt-4 flex min-h-[172px] flex-col items-center justify-center gap-3">
        {occupiedBy ? (
          <>
            <PersonBadge name={occupiedBy.name} crowned={active} />
            <div>
              <p className="text-[13px] uppercase tracking-[0.2em] text-white/55">
                {occupiedBy.role === 'spymaster' ? 'Mestre-Espiao' : 'Agente'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/8 text-3xl font-black text-white/85">
              {getInitials(placeholder)}
            </div>
            <div>
              <p className="text-3xl font-black uppercase tracking-[0.06em]">{placeholder}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">Vaga disponivel</p>
            </div>
          </>
        )}
      </div>
