import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eraser, Bot } from 'lucide-react';
import { PICTIONARY_WORDS } from '@/lib/gameTypes';
import { Difficulty } from '@/components/DifficultySelector';

interface SoloPictionaryGameProps {
  playerId: string;
  playerName: string;
  difficulty: Difficulty;
  onGameEnd: (scores: Record<string, number>) => void;
}

const COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];
const ROUND_TIME = 60;
const TOTAL_ROUNDS = 4; // 2 rounds player draws, 2 rounds bot draws

// Simple SVG path data for bot drawing
const BOT_DRAWINGS: Record<string, { paths: { d: string; color: string; width: number }[] }> = {
  cat: { paths: [
    { d: 'M200,350 Q200,250 250,200 Q300,150 350,200 Q400,150 450,200 Q500,250 500,350 Q500,400 400,420 Q350,430 300,420 Q200,400 200,350', color: '#f97316', width: 3 },
    { d: 'M280,300 A10,10 0 1,1 300,300', color: '#000', width: 3 },
    { d: 'M380,300 A10,10 0 1,1 400,300', color: '#000', width: 3 },
    { d: 'M340,340 L350,350 L360,340', color: '#ec4899', width: 3 },
  ]},
  sun: { paths: [
    { d: 'M350,300 A80,80 0 1,1 350,299.99', color: '#eab308', width: 4 },
    { d: 'M350,180 L350,140', color: '#eab308', width: 3 },
    { d: 'M350,420 L350,460', color: '#eab308', width: 3 },
    { d: 'M230,300 L190,300', color: '#eab308', width: 3 },
    { d: 'M470,300 L510,300', color: '#eab308', width: 3 },
  ]},
  house: { paths: [
    { d: 'M200,350 L200,500 L500,500 L500,350', color: '#ef4444', width: 3 },
    { d: 'M180,350 L350,200 L520,350', color: '#8b5cf6', width: 4 },
    { d: 'M320,500 L320,400 L400,400 L400,500', color: '#22c55e', width: 3 },
  ]},
  star: { paths: [
    { d: 'M350,150 L380,270 L500,270 L400,340 L430,460 L350,380 L270,460 L300,340 L200,270 L320,270 Z', color: '#eab308', width: 3 },
  ]},
  heart: { paths: [
    { d: 'M350,450 Q200,350 200,250 Q200,150 300,150 Q350,150 350,200 Q350,150 400,150 Q500,150 500,250 Q500,350 350,450', color: '#ef4444', width: 4 },
  ]},
  tree: { paths: [
    { d: 'M330,500 L330,350 L370,350 L370,500', color: '#92400e', width: 3 },
    { d: 'M350,350 L250,350 L300,280 L260,280 L350,180 L440,280 L400,280 L450,350 Z', color: '#22c55e', width: 3 },
  ]},
  fish: { paths: [
    { d: 'M200,300 Q300,200 450,300 Q300,400 200,300', color: '#3b82f6', width: 3 },
    { d: 'M450,300 L500,250 L500,350 Z', color: '#3b82f6', width: 3 },
    { d: 'M300,290 A5,5 0 1,1 310,290', color: '#000', width: 2 },
  ]},
};

// Map words to available bot drawings
const DRAWABLE_WORDS = Object.keys(BOT_DRAWINGS);

const BOT_GUESS_TIMES: Record<Difficulty, { min: number; max: number; correctChance: number }> = {
  easy: { min: 40, max: 55, correctChance: 0.3 },
  medium: { min: 20, max: 40, correctChance: 0.6 },
  hard: { min: 8, max: 20, correctChance: 0.85 },
};

export default function SoloPictionaryGame({ playerId, playerName, difficulty, onGameEnd }: SoloPictionaryGameProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState<{ name: string; text: string; correct?: boolean }[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [isPlayerDrawing, setIsPlayerDrawing] = useState(true);
  const [timer, setTimer] = useState(ROUND_TIME);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({ [playerId]: 0, bot: 0 });
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const roundRef = useRef(1);

  useEffect(() => { roundRef.current = round; }, [round]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startRound = useCallback((roundNum: number) => {
    const playerDraws = roundNum % 2 === 1;
    setIsPlayerDrawing(playerDraws);
    setRound(roundNum);
    roundRef.current = roundNum;
    setTimer(ROUND_TIME);
    setMessages([]);
    setGuess('');

    if (playerDraws) {
      const word = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
      setCurrentWord(word);
    } else {
      const word = DRAWABLE_WORDS[Math.floor(Math.random() * DRAWABLE_WORDS.length)];
      setCurrentWord(word);
    }

    setTimeout(() => clearCanvas(), 50);
  }, [clearCanvas]);

  // Initialize
  useEffect(() => { startRound(1); }, []);

  // Bot draws when it's bot's turn
  useEffect(() => {
    if (isPlayerDrawing || !currentWord) return;
    const drawing = BOT_DRAWINGS[currentWord];
    if (!drawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pathIdx = 0;
    const drawNext = () => {
      if (pathIdx >= drawing.paths.length) return;
      const p = drawing.paths[pathIdx];
      const path2d = new Path2D(p.d);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.stroke(path2d);
      pathIdx++;
      setTimeout(drawNext, 800 + Math.random() * 500);
    };
    setTimeout(drawNext, 1500);
  }, [isPlayerDrawing, currentWord, round]);

  // Bot guesses when player draws
  useEffect(() => {
    if (!isPlayerDrawing || !currentWord) return;
    const cfg = BOT_GUESS_TIMES[difficulty];
    const delay = (cfg.min + Math.random() * (cfg.max - cfg.min)) * 1000;
    const correct = Math.random() < cfg.correctChance;

    const to = setTimeout(() => {
      if (correct) {
        const timeLeft = Math.max(1, ROUND_TIME - Math.floor(delay / 1000));
        const pts = Math.max(10, Math.floor(timeLeft * 1.5));
        setScores(prev => ({ ...prev, bot: prev.bot + pts }));
        setMessages(prev => [...prev, { name: `🤖 ${t('common.bot')}`, text: t('games.pictionary.botGuessed', { word: currentWord }), correct: true }]);
      } else {
        const wrongWords = PICTIONARY_WORDS.filter(w => w !== currentWord);
        const wrongGuess = wrongWords[Math.floor(Math.random() * wrongWords.length)];
        setMessages(prev => [...prev, { name: `🤖 ${t('common.bot')}`, text: wrongGuess }]);
      }
    }, delay);
    return () => clearTimeout(to);
  }, [isPlayerDrawing, currentWord, round, difficulty, t]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          nextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  const nextRound = useCallback(() => {
    const next = roundRef.current + 1;
    if (next > TOTAL_ROUNDS) {
      onGameEnd(scores);
      return;
    }
    startRound(next);
  }, [onGameEnd, scores, startRound]);

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => { if (!isPlayerDrawing) return; setIsDrawing(true); lastPos.current = getCanvasPos(e); };
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isPlayerDrawing || !lastPos.current) return;
    const pos = getCanvasPos(e);
    const color = isEraser ? '#1a1a2e' : brushColor;
    const size = isEraser ? 20 : brushSize;
    drawLine(lastPos.current, pos, color, size);
    lastPos.current = pos;
  };
  const handlePointerUp = () => { setIsDrawing(false); lastPos.current = null; };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isPlayerDrawing) return;
    const isCorrect = guess.trim().toLowerCase() === currentWord.toLowerCase();
    const points = isCorrect ? Math.max(10, Math.floor(timer * 1.5)) : 0;

    setMessages(prev => [...prev, { name: playerName, text: isCorrect ? `${playerName} ${t('games.pictionary.guessedIt', { name: '' })}` : guess.trim(), correct: isCorrect }]);
    if (isCorrect) {
      setScores(prev => ({ ...prev, [playerId]: prev[playerId] + points }));
      setTimeout(() => nextRound(), 2000);
    }
    setGuess('');
  };

  const handleClear = () => clearCanvas();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg">{t('common.round')} {round}/{TOTAL_ROUNDS}</div>
        <div className="font-display text-2xl font-bold text-accent">{timer}s</div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{playerName}</div>
            <div className="font-display font-bold text-sm">{scores[playerId]}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Bot size={12} /> {t('common.bot')}</div>
            <div className="font-display font-bold text-sm">{scores.bot}</div>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-2 text-center">
        {isPlayerDrawing ? (
          <span>{t('games.pictionary.yourWord')} <strong className="text-foreground">{currentWord}</strong> — {t('games.pictionary.youDraw')}</span>
        ) : (
          <span>{t('games.pictionary.botIsDrawing')}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="card-game rounded-2xl p-3 relative">
            <canvas
              ref={canvasRef}
              width={700}
              height={500}
              className="w-full rounded-xl cursor-crosshair touch-none"
              style={{ aspectRatio: '700/500', background: '#1a1a2e' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
            {isPlayerDrawing && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} className={`w-7 h-7 rounded-full border-2 transition-transform ${brushColor === c && !isEraser ? 'border-foreground scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => { setBrushColor(c); setIsEraser(false); }} />
                ))}
                <button onClick={() => setIsEraser(!isEraser)} className={`p-1.5 rounded-lg transition-colors ${isEraser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Eraser size={18} />
                </button>
                <select value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="bg-muted text-foreground rounded-lg px-2 py-1 text-sm border border-border">
                  <option value={2}>{t('games.pictionary.thin')}</option>
                  <option value={5}>{t('games.pictionary.medium')}</option>
                  <option value={10}>{t('games.pictionary.thick')}</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleClear} className="ml-auto border-border text-foreground">{t('games.pictionary.clear')}</Button>
              </div>
            )}
          </div>
        </div>

        <div className="card-game rounded-2xl p-4 flex flex-col h-[400px] lg:h-auto">
          <h3 className="font-display text-sm font-bold text-muted-foreground mb-3">{t('games.pictionary.chat')}</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`text-sm ${msg.correct ? 'text-secondary font-bold' : 'text-foreground/80'}`}>
                <span className="font-medium">{msg.name}:</span> {msg.text}
              </motion.div>
            ))}
          </div>
          {!isPlayerDrawing && (
            <form onSubmit={handleGuess} className="flex gap-2">
              <Input value={guess} onChange={e => setGuess(e.target.value)} placeholder={t('games.pictionary.guessPlaceholder')} className="bg-muted border-border text-foreground text-sm placeholder:text-muted-foreground" autoFocus />
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">→</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
