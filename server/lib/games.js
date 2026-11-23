export const GAMES = {
  tictactoe: {
    id: 'tictactoe',
    name: 'TicTacToe',
    tagline: 'Think. Win.',
    description: 'The classic 3×3 duel of logic. Read your opponent, control the diagonals and strike first.',
    category: 'Classic',
    minPlayers: 2,
    maxPlayers: 2,
    ratingBot: 1000,
    icon: 'template',
    gradient: 'linear-gradient(140deg, #0f766e 0%, #064e3b 55%, #071b14 100%)',
    accent: '#22d3ee',
    playTime: '3 min',
  },
  reversi: {
    id: 'reversi',
    name: 'Reversi',
    tagline: 'Flip. Conquer. Win.',
    description: 'Capture tiles by sandwiching your rival’s pieces. One lucky corner can flip the whole board.',
    category: 'Strategy',
    minPlayers: 2,
    maxPlayers: 2,
    ratingBot: 1150,
    icon: 'template',
    gradient: 'linear-gradient(140deg, #065f46 0%, #052e23 55%, #06120d 100%)',
    accent: '#10e58a',
    playTime: '8 min',
  },
  ludo: {
    id: 'ludo',
    name: 'Ludo',
    tagline: 'Roll. Move. Win.',
    description: 'Race all four tokens around the board. Slay rivals, guard your start square and roll sixes at the right time.',
    category: 'Dice',
    minPlayers: 2,
    maxPlayers: 4,
    ratingBot: 1080,
    icon: 'template',
    gradient: 'linear-gradient(140deg, #7c2d12 0%, #4c1d10 50%, #200f0a 100%)',
    accent: '#fb923c',
    playTime: '12 min',
  },
  snakes: {
    id: 'snakes',
    name: 'Snake & Ladder',
    tagline: 'Climb. Don’t Fall.',
    description: 'Roll the dice, climb ladders, dodge the snakes and be the first to square 100 with an exact landing.',
    category: 'Dice',
    minPlayers: 2,
    maxPlayers: 4,
    ratingBot: 920,
    icon: 'template',
    gradient: 'linear-gradient(140deg, #4c1d95 0%, #2e1065 55%, #120b26 100%)',
    accent: '#8b5cf6',
    playTime: '6 min',
  },
}

export const GAME_LIST = Object.values(GAMES)

export function getGame(id) {
  return GAMES[id]
}
