export type GameType = 'pictionary' | 'reaction' | 'quiz' | 'frogger' | 'connect4' | 'tictactoe'| 'snake'| 'memory'| 'dino';

export interface GameInfo {
  id: GameType;
  name: string;
  emoji: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  colorClass: string;
  howToPlay: string[];
}

export const GAMES: Record<GameType, GameInfo> = {
  pictionary: {
    id: 'pictionary',
    name: 'Pictionary',
    emoji: '🎨',
    description: 'Draw & guess words with friends!',
    minPlayers: 2,
    maxPlayers: 8,
    colorClass: 'game-pictionary',
    howToPlay: [
      'One player draws a secret word on the canvas',
      'Other players type guesses in the chat',
      'Guess correctly before the timer runs out to earn points',
      'Faster guesses = more points!',
    ],
  },
  reaction: {
    id: 'reaction',
    name: 'Reaction',
    emoji: '⚡',
    description: 'Test your reflexes, be the fastest!',
    minPlayers: 1,
    maxPlayers: 8,
    colorClass: 'game-reaction',
    howToPlay: [
      'Wait for a shape to appear on screen',
      'Click/tap it as fast as you can',
      'First player to click wins the round',
      'Best of multiple rounds wins the game!',
    ],
  },
  quiz: {
    id: 'quiz',
    name: 'Trivia',
    emoji: '❓',
    description: 'Answer fast, score big!',
    minPlayers: 1,
    maxPlayers: 8,
    colorClass: 'game-quiz',
    howToPlay: [
      'A question appears for all players at once',
      'Pick the correct answer from 4 choices',
      'Faster correct answers earn more points',
      'Leaderboard updates after each question!',
    ],
  },
  frogger: {
    id: 'frogger',
    name: 'Chicken Road',
    emoji: '🐔',
    description: 'Help the chicken cross the road!',
    minPlayers: 1,
    maxPlayers: 1,
    colorClass: 'game-frogger',
    howToPlay: [
      'Guide the chicken across busy lanes of traffic',
      'Use arrow keys or swipe to move',
      'Avoid cars and trucks — one hit and you lose a life!',
      'Reach the other side to score points. How far can you go?',
    ],
  },
  connect4: {
    id: 'connect4',
    name: 'Puissance 4',
    emoji: '🔴',
    description: 'Alignez 4 jetons pour gagner !',
    minPlayers: 2,
    maxPlayers: 2,
    colorClass: 'game-connect4',
    howToPlay: [
      'Chaque joueur place un jeton à tour de rôle.',
      'Le but est d\'aligner 4 jetons (horizontal, vertical ou diagonal).',
      'En mode solo, tu affrontes une IA redoutable.',
    ],
  },
  tictactoe: {
    id: 'tictactoe',
    name: 'Morpion',
    emoji: '❌',
    description: 'Match 3 to win!',
    minPlayers: 1,
    maxPlayers: 2,
    colorClass: 'game-reaction', // Ou crée une classe game-tictactoe dans ton CSS
    howToPlay: [
      'Align three identical symbols (X or O) horizontally, vertically, or diagonally.',
      'Click on an empty square to place your symbol during your turn.',
      'In Solo mode, challenge an unbeatable AI in "Hard" or practice in "Easy".',
      'If all squares are filled without an alignment of three, the game ends in a draw.',
    ],
  },
    snake: {
      id: 'snake',
      name: 'Snake',
      emoji: '🐍',
      description: 'Eat apples and grow longer!',
      minPlayers: 1,
      maxPlayers: 1,
      colorClass: 'game-snake',
      howToPlay: [
        'Use arrow keys or WASD to move the snake',
        'Eat the red food to grow and score points',
        'Do not hit the walls or your own tail',
        'The game speeds up as you get longer!'
      ],
    },
      memory: {
        id: 'memory',
        name: 'Memory',
        emoji: '🧠',
        description: 'Find all matching pairs of emojis!',
        minPlayers: 1,
        maxPlayers: 2,
        colorClass: 'game-memory',
        howToPlay: [
          'Flip two cards to find a matching pair of emojis.',
          'In Solo, find all pairs in the shortest time possible.',
          'In Multiplayer, if you find a pair, you play again!',
          'The player with the most pairs at the end wins.',
        ],
      },
  dino: {
    id: 'dino',
    name: 'Neon Dino',
    emoji: '🦖',
    description: 'Jump over obstacles!',
    minPlayers: 1,
    maxPlayers: 1,
    colorClass: 'game-dino',
    howToPlay: [
      'Press SPACE or Tap to jump',
      'Avoid obstacles (cactuses and birds)',
      'The game speeds up over time',
      'Try to beat your high score!'
    ],
  },
};

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  isHost: boolean;
  isGuest: boolean;
  score: number;
  connected: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  gameType: GameType;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  gameState: any;
}

export const PICTIONARY_WORDS = [
  'cat', 'dog', 'house', 'tree', 'sun', 'moon', 'car', 'boat', 'fish', 'bird',
  'flower', 'star', 'heart', 'cloud', 'rain', 'snow', 'fire', 'mountain', 'ocean', 'river',
  'pizza', 'cake', 'apple', 'banana', 'guitar', 'drum', 'piano', 'robot', 'rocket', 'train',
  'airplane', 'bicycle', 'umbrella', 'crown', 'diamond', 'sword', 'shield', 'castle', 'dragon', 'unicorn',
  'rainbow', 'butterfly', 'spider', 'snake', 'elephant', 'giraffe', 'penguin', 'dolphin', 'octopus', 'dinosaur',
];

export const QUIZ_QUESTIONS = [
  { question: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { question: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], answer: 1 },
  { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer: 2 },
  { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
  { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
  { question: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'Thailand', 'Japan', 'Korea'], answer: 2 },
  { question: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2 },
  { question: 'How many bones are in the human body?', options: ['106', '206', '306', '406'], answer: 1 },
  { question: 'What is the chemical symbol for water?', options: ['O2', 'CO2', 'H2O', 'NaCl'], answer: 2 },
  { question: 'Which animal is the tallest in the world?', options: ['Elephant', 'Giraffe', 'Whale', 'Ostrich'], answer: 1 },
  { question: 'What year did the Titanic sink?', options: ['1905', '1912', '1920', '1935'], answer: 1 },
  { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
  { question: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '8'], answer: 2 },
  { question: 'What color is a ruby?', options: ['Blue', 'Green', 'Red', 'Purple'], answer: 2 },
];

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateGuestId(): string {
  return 'guest_' + Math.random().toString(36).substring(2, 10);
}