// Banco de palavras PT-BR Geral
export const geralWords: string[] = [
  // Natureza
  'floresta', 'montanha', 'rio', 'oceano', 'deserto', 'vulcão', 'ilha', 'caverna',
  'estrela', 'lua', 'sol', 'nuvem', 'trovão', 'chuva', 'neve', 'tornado',
  // Animais
  'tubarão', 'leão', 'cobra', 'águia', 'lobo', 'urso', 'golfinho', 'aranha',
  'elefante', 'tigre', 'pantera', 'raposa', 'corvo', 'polvos', 'crocodilo',
  // Objetos
  'espelho', 'lanterna', 'bússola', 'âncora', 'chave', 'cofre', 'mapa', 'relógio',
  'telescópio', 'binóculo', 'faca', 'corda', 'escada', 'porta', 'janela',
  // Lugares
  'hospital', 'mercado', 'castelo', 'ponte', 'túnel', 'fábrica', 'museu', 'banco',
  'farol', 'estação', 'aeroporto', 'porto', 'cemitério', 'palácio', 'prisão',
  // Profissões
  'piloto', 'médico', 'detetive', 'cientista', 'espião', 'hacker', 'chef',
  'soldado', 'policial', 'professor', 'engenheiro', 'capitão', 'mecânico',
  // Conceitos
  'mistério', 'sombra', 'segredo', 'código', 'missão', 'alvo', 'armadilha',
  'veneno', 'perigo', 'silêncio', 'explosão', 'fuga', 'perseguição', 'traição',
  // Tecnologia
  'robô', 'drone', 'satélite', 'radar', 'laser', 'chip', 'vírus', 'antena',
  'bateria', 'câmera', 'computador', 'servidor', 'programa', 'escudo',
  // Mitologia / Fantasia
  'dragão', 'bruxa', 'vampiro', 'fantasma', 'mago', 'portal', 'feitiço',
  'espada', 'escudo', 'armadura', 'tridente', 'arco', 'flecha',
  // Ações
  'ataque', 'defesa', 'invasão', 'bloqueio', 'resgate', 'sabotagem', 'infiltração',
  // Cores e elementos
  'fogo', 'água', 'terra', 'vento', 'gelo', 'raio', 'sombra', 'luz',
]

// Banco de palavras Valorant
export const valorantWords: string[] = [
  // Agentes
  'Jett', 'Reyna', 'Phoenix', 'Yoru', 'Neon', 'Iso',
  'Sage', 'Skye', 'Breach', 'KAY/O', 'Fade', 'Gekko',
  'Brimstone', 'Viper', 'Omen', 'Astra', 'Harbor', 'Clove',
  'Sova', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse',
  'Raze', 'Reyna',
  // Classes de agentes
  'Duelista', 'Sentinela', 'Iniciador', 'Controlador',
  // Mapas
  'Ascent', 'Bind', 'Split', 'Haven', 'Icebox', 'Breeze',
  'Fracture', 'Pearl', 'Lotus', 'Sunset', 'Abyss',
  // Armas - Rifles
  'Phantom', 'Vandal', 'Guardian', 'Bulldog', 'Marshal',
  // Armas - SMGs
  'Spectre', 'Stinger',
  // Armas - Pistolas
  'Classic', 'Ghost', 'Sheriff', 'Shorty', 'Frenzy',
  // Armas - Heavys
  'Odin', 'Ares',
  // Armas - Snipers
  'Operator', 'Outlaw',
  // Armas - Shotguns
  'Bucky', 'Judge',
  // Habilidades e termos
  'Orbe', 'Spike', 'Defuse', 'Plant', 'Rush', 'Eco',
  'Full-buy', 'Half-buy', 'Save', 'Clutch', 'Ace',
  // Termos de jogo
  'Valorant', 'Radianita', 'Radiant', 'Imortal', 'Ascendente',
  'Diamante', 'Platina', 'Ouro', 'Prata', 'Bronze', 'Ferro',
  // Termos táticos
  'Flank', 'Entry', 'Lurk', 'Rotate', 'Retake', 'Peek',
  'Smoke', 'Flash', 'Molly', 'Util', 'Trade',
  'Crossfire', 'Post-plant', 'Anti-eco',
  // Locais comuns
  'A-site', 'B-site', 'Mid', 'CT', 'Heaven',
  'Short', 'Long', 'Cubby',
  // Organizações
  'VALORANT', 'VCT', 'Sentinels', 'NRG', 'Loud', 'Fnatic', 'MIBR', 'KRU',
  // Players
  'Sacy', 'Aspas', 'Zekken', 'MwZera', 'TenZ', 'TcK', 'Coreano', 'Xarola',
]

// Combina os dois bancos sem duplicatas
export function getWordBank(themes: string[], customWords: string[] = []): string[] {
  const banks: Record<string, string[]> = {
    geral: geralWords,
    valorant: valorantWords,
  }

  const combined = new Set<string>()
  themes.forEach(t => (banks[t] || []).forEach(w => combined.add(w)))
  customWords.forEach(w => w.trim() && combined.add(w.trim()))

  return Array.from(combined)
}
