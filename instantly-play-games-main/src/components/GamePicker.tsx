import { motion } from 'framer-motion';
import { GAMES, GameType, GameInfo } from '@/lib/gameTypes';
import { HelpCircle, Users, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import HowToPlayModal from './HowToPlayModal';

interface GameCardProps {
  game: GameInfo;
  onSelect: (gameType: GameType, mode: 'solo' | 'multi') => void;
}

function GameCard({ game, onSelect }: GameCardProps) {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = useState(false);

  const colorMap: Record<GameType, string> = {
    pictionary: 'from-pink-500 to-rose-600',
    reaction: 'from-orange-400 to-amber-500',
    quiz: 'from-blue-400 to-cyan-500',
    frogger: 'from-yellow-400 to-orange-500',
    connect4: 'from-red-500 to-red-700',
    tictactoe: 'from-indigo-500 to-purple-600',
    snake: 'from-green-500 to-emerald-600',
    memory: 'from-violet-500 to-fuchsia-600',
    dino: 'from-green-400 to-cyan-500',
  };

  const canSolo = game.minPlayers === 1;
  const canMulti = game.maxPlayers > 1;

  return (
    <>
      <div className="card-game rounded-2xl p-6 relative overflow-hidden group">
        <button
          onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <HelpCircle size={16} />
        </button>

        <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[game.id]} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />

        <div className="text-5xl mb-4">{game.emoji}</div>
        <h3 className="font-display text-xl font-bold text-foreground mb-2">{game.name}</h3>
        <p className="text-muted-foreground text-sm">{game.description}</p>

        <div className="mt-4 flex gap-2">
          {canSolo && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(game.id, 'solo')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-display font-medium transition-colors"
            >
              <User size={14} /> {t('common.solo')}
            </motion.button>
          )}
          {canMulti && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(game.id, 'multi')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-foreground text-sm font-display font-medium transition-colors"
            >
              <Users size={14} /> {t('common.multiplayer')}
            </motion.button>
          )}
        </div>

        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorMap[game.id]}`} />
      </div>

      <HowToPlayModal
        game={game}
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}

interface GamePickerProps {
  onSelect: (gameType: GameType, mode: 'solo' | 'multi') => void;
}

export default function GamePicker({ onSelect }: GamePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {Object.values(GAMES).map((game, i) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <GameCard game={game} onSelect={onSelect} />
        </motion.div>
      ))}
    </div>
  );
}
