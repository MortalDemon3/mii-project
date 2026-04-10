import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Player } from '@/lib/gameTypes';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PlayerAvatar from '@/components/PlayerAvatar';

interface ScoreboardProps {
  players: Player[];
  scores: Record<string, number>;
  onPlayAgain: () => void;
  onHome: () => void;
  isGuest: boolean;
}

export default function Scoreboard({ players, scores, onPlayAgain, onHome, isGuest }: ScoreboardProps) {
  const { t } = useTranslation();
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
      <motion.div initial={{ y: -20 }} animate={{ y: 0 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-6xl mb-4">🏆</motion.div>
      <h2 className="font-display text-3xl font-bold text-gradient mb-8">{t('scoreboard.gameOver')}</h2>

      <div className="card-game rounded-2xl p-6 mb-6 space-y-3">
        {sorted.map((player, i) => (
          <motion.div key={player.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className={`flex items-center gap-4 p-3 rounded-xl ${i === 0 ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-muted/30'}`}>
            <span className="text-2xl w-10">{medals[i] || `#${i + 1}`}</span>
            <PlayerAvatar player={player} size="sm" showName={false} />
            <span className="font-display font-bold text-foreground flex-1 text-left">{player.name}</span>
            <span className="font-display text-lg font-bold text-accent">{scores[player.id] || 0}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={onPlayAgain} className="btn-play">
          <RotateCcw size={18} className="mr-2" /> {t('scoreboard.playAgain')}
        </Button>
        <Button onClick={onHome} variant="outline" className="border-border text-foreground hover:bg-muted">
          <Home size={18} className="mr-2" /> {t('scoreboard.home')}
        </Button>
      </div>

      {isGuest && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 text-sm text-muted-foreground">{t('scoreboard.guestNote')}</motion.p>
      )}
    </motion.div>
  );
}
