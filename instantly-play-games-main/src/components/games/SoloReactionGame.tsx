import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Difficulty } from '@/components/DifficultySelector';
import { Bot } from 'lucide-react';

interface SoloReactionGameProps {
  playerId: string;
  playerName: string;
  difficulty: Difficulty;
  onGameEnd: (scores: Record<string, number>) => void;
}

const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
const SHAPE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];
const TOTAL_ROUNDS = 5;

const BOT_TIMES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 600, max: 1200 },
  medium: { min: 300, max: 600 },
  hard: { min: 100, max: 250 },
};

export default function SoloReactionGame({ playerId, playerName, difficulty, onGameEnd }: SoloReactionGameProps) {
  const { t } = useTranslation();
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ [playerId]: 0, bot: 0 });
  const [shape, setShape] = useState<{ type: string; color: string; x: number; y: number } | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [clicked, setClicked] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (gameStarted) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameStarted(true);
          startRound(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted]);

  const startRound = useCallback((roundNum: number) => {
    const delay = 1000 + Math.random() * 3000;
    setTimeout(() => {
      const shapeData = {
        type: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 60,
      };
      setShape(shapeData);
      setRound(roundNum);
      setWaiting(false);
      setRoundWinner(null);
      setClicked(false);

      // Bot reaction
      const { min, max } = BOT_TIMES[difficulty];
      const botDelay = min + Math.random() * (max - min);
      botTimerRef.current = setTimeout(() => {
        setRoundWinner(prev => {
          if (prev) return prev;
          resolveRound('bot', roundNum);
          return 'bot';
        });
      }, botDelay);
    }, delay);
  }, [difficulty]);

  const resolveRound = useCallback((winnerId: string, roundNum: number) => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setShape(null);
    setWaiting(true);
    setScores(prev => {
      const updated = { ...prev, [winnerId]: (prev[winnerId] || 0) + 100 };
      setTimeout(() => {
        if (roundNum >= TOTAL_ROUNDS) {
          onGameEnd(updated);
        } else {
          startRound(roundNum + 1);
        }
      }, 2000);
      return updated;
    });
  }, [onGameEnd, startRound]);

  const handleClick = () => {
    if (clicked || !shape || roundWinner) return;
    setClicked(true);
    setRoundWinner(playerId);
    resolveRound(playerId, round);
  };

  const renderShape = () => {
    if (!shape) return null;
    const commonClasses = 'absolute cursor-pointer transition-transform hover:scale-110';
    const style: React.CSSProperties = { left: `${shape.x}%`, top: `${shape.y}%` };

    if (shape.type === 'circle') return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`${commonClasses} w-20 h-20 rounded-full`} style={{ ...style, backgroundColor: shape.color }} onClick={handleClick} />;
    if (shape.type === 'square') return <motion.div initial={{ scale: 0, rotate: 45 }} animate={{ scale: 1, rotate: 0 }} className={`${commonClasses} w-20 h-20 rounded-lg`} style={{ ...style, backgroundColor: shape.color }} onClick={handleClick} />;
    if (shape.type === 'triangle') return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`${commonClasses} w-0 h-0`} style={{ left: `${shape.x}%`, top: `${shape.y}%`, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderBottom: `70px solid ${shape.color}` }} onClick={handleClick} />;
    if (shape.type === 'star') return <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className={`${commonClasses} text-6xl`} style={{ ...style, color: shape.color }} onClick={handleClick}>★</motion.div>;
    return null;
  };

  const winnerLabel = roundWinner === 'bot' ? `🤖 ${t('common.bot')}` : playerName;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg">{t('common.round')} {round}/{TOTAL_ROUNDS}</div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{playerName}</div>
            <div className="font-display font-bold text-foreground">{scores[playerId]}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
              <Bot size={12} /> {t('common.bot')}
            </div>
            <div className="font-display font-bold text-foreground">{scores.bot}</div>
          </div>
        </div>
      </div>

      <div className="card-game rounded-2xl relative overflow-hidden" style={{ height: '60vh', minHeight: 400 }}>
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl font-bold text-gradient">{countdown}</motion.div>
          </div>
        )}

        {gameStarted && waiting && !roundWinner && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="font-display text-2xl text-muted-foreground">{t('games.reaction.getReady')}</motion.p>
          </div>
        )}

        {roundWinner && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
              <div className="text-5xl mb-3">⚡</div>
              <p className="font-display text-2xl font-bold text-foreground">{t('games.reaction.wasFastest', { name: winnerLabel })}</p>
              <p className="text-secondary font-display">{t('games.reaction.points')}</p>
            </motion.div>
          </div>
        )}

        <AnimatePresence>{renderShape()}</AnimatePresence>
      </div>
    </div>
  );
}
