import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player, PICTIONARY_WORDS } from '@/lib/gameTypes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface PictionaryGameProps {
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
}

const COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];
const ROUND_TIME = 60;
const TOTAL_ROUNDS = 3;

export default function PictionaryGame({ players, playerId, broadcast, gameState, onGameEnd }: PictionaryGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState<{ name: string; text: string; correct?: boolean }[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [drawerId, setDrawerId] = useState('');
  const [timer, setTimer] = useState(ROUND_TIME);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [guessedPlayers, setGuessedPlayers] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const roundRef = useRef(1);

  const isDrawer = drawerId === playerId;
  const isHost = players.find(p => p.isHost)?.id === playerId;

  // Keep roundRef in sync
  useEffect(() => { roundRef.current = round; }, [round]);

  const applyRoundState = useCallback((newDrawerId: string, word: string, roundNum: number, newScores?: Record<string, number>) => {
    setDrawerId(newDrawerId);
    setCurrentWord(word);
    setRound(roundNum);
    roundRef.current = roundNum;
    if (newScores) setScores(newScores);
    setGuessedPlayers(new Set());
    setMessages([]);
    setTimer(ROUND_TIME);
    setInitialized(true);
    clearCanvas();
  }, []);

  // Initialize game - host only
  useEffect(() => {
    if (initialized) return;
    if (isHost && players.length > 0) {
      const word = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
      const drawer = players[0].id;
      const initialScores: Record<string, number> = {};
      players.forEach(p => initialScores[p.id] = 0);

      // Apply locally
      applyRoundState(drawer, word, 1, initialScores);

      broadcast('game_state', {
        type: 'pictionary_init',
        word,
        drawerId: drawer,
        round: 1,
        scores: initialScores,
      });
    }
  }, [isHost, players, initialized, broadcast, applyRoundState]);

  // Listen for game state from OTHER players
  useEffect(() => {
    if (!gameState) return;

    if (gameState.type === 'pictionary_init' && !isHost) {
      applyRoundState(gameState.drawerId, gameState.word, gameState.round, gameState.scores);
    }
    if (gameState.type === 'pictionary_draw') {
      drawLine(gameState.from, gameState.to, gameState.color, gameState.size);
    }
    if (gameState.type === 'pictionary_clear') {
      clearCanvas();
    }
    if (gameState.type === 'pictionary_guess') {
      setMessages(prev => [...prev, { name: gameState.playerName, text: gameState.text, correct: gameState.correct }]);
      if (gameState.correct) {
        setScores(prev => ({
          ...prev,
          [gameState.playerId]: (prev[gameState.playerId] || 0) + gameState.points,
        }));
        setGuessedPlayers(prev => new Set([...prev, gameState.playerId]));
      }
    }
    if (gameState.type === 'pictionary_next_round' && !isHost) {
      applyRoundState(gameState.drawerId, gameState.word, gameState.round);
    }
    if (gameState.type === 'pictionary_end') {
      onGameEnd(gameState.scores);
    }
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (!initialized) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (isHost) nextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [initialized, round, isHost]);

  const nextRound = useCallback(() => {
    const currentRound = roundRef.current;
    const nextRoundNum = currentRound + 1;
    if (nextRoundNum > TOTAL_ROUNDS) {
      setScores(prev => {
        broadcast('game_state', { type: 'pictionary_end', scores: prev });
        onGameEnd(prev);
        return prev;
      });
      return;
    }
    const nextDrawerIndex = (players.findIndex(p => p.id === drawerId) + 1) % players.length;
    const newDrawer = players[nextDrawerIndex].id;
    const newWord = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];

    // Apply locally for host
    applyRoundState(newDrawer, newWord, nextRoundNum);

    // Broadcast to others
    broadcast('game_state', {
      type: 'pictionary_next_round',
      drawerId: newDrawer,
      word: newWord,
      round: nextRoundNum,
    });
  }, [players, drawerId, broadcast, onGameEnd, applyRoundState]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

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
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer || !lastPos.current) return;
    const pos = getCanvasPos(e);
    const color = isEraser ? '#1a1a2e' : brushColor;
    const size = isEraser ? 20 : brushSize;
    drawLine(lastPos.current, pos, color, size);
    broadcast('game_state', {
      type: 'pictionary_draw',
      from: lastPos.current,
      to: pos,
      color,
      size,
    });
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isDrawer || guessedPlayers.has(playerId)) return;
    const isCorrect = guess.trim().toLowerCase() === currentWord.toLowerCase();
    const points = isCorrect ? Math.max(10, Math.floor(timer * 1.5)) : 0;
    const playerName = players.find(p => p.id === playerId)?.name || 'Player';

    const msgPayload = {
      type: 'pictionary_guess',
      playerId,
      playerName,
      text: isCorrect ? `${playerName} guessed it! 🎉` : guess.trim(),
      correct: isCorrect,
      points,
    };

    // Apply locally
    setMessages(prev => [...prev, { name: msgPayload.playerName, text: msgPayload.text, correct: isCorrect }]);
    if (isCorrect) {
      setScores(prev => ({ ...prev, [playerId]: (prev[playerId] || 0) + points }));
      setGuessedPlayers(prev => new Set([...prev, playerId]));
    }

    // Broadcast to others
    broadcast('game_state', msgPayload);
    setGuess('');
  };

  const handleClear = () => {
    clearCanvas();
    broadcast('game_state', { type: 'pictionary_clear' });
  };

  const drawerName = players.find(p => p.id === drawerId)?.name || 'Someone';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg">
          Round {round}/{TOTAL_ROUNDS}
        </div>
        <div className="font-display text-2xl font-bold text-accent">
          {timer}s
        </div>
        <div className="text-sm text-muted-foreground">
          {isDrawer ? (
            <span>Your word: <strong className="text-foreground">{currentWord}</strong></span>
          ) : (
            <span>🎨 <strong>{drawerName}</strong> is drawing...</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="card-game rounded-2xl p-3 relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full rounded-xl cursor-crosshair touch-none"
              style={{ aspectRatio: '800/500', background: '#1a1a2e' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
            {isDrawer && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${brushColor === c && !isEraser ? 'border-foreground scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { setBrushColor(c); setIsEraser(false); }}
                  />
                ))}
                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`p-1.5 rounded-lg transition-colors ${isEraser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  <Eraser size={18} />
                </button>
                <select
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="bg-muted text-foreground rounded-lg px-2 py-1 text-sm border border-border"
                >
                  <option value={2}>Thin</option>
                  <option value={5}>Medium</option>
                  <option value={10}>Thick</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleClear} className="ml-auto border-border text-foreground">
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="card-game rounded-2xl p-4 flex flex-col h-[400px] lg:h-auto">
          <h3 className="font-display text-sm font-bold text-muted-foreground mb-3">Chat</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-sm ${msg.correct ? 'text-secondary font-bold' : 'text-foreground/80'}`}
              >
                <span className="font-medium">{msg.name}:</span> {msg.text}
              </motion.div>
            ))}
          </div>

          {!isDrawer && !guessedPlayers.has(playerId) && (
            <form onSubmit={handleGuess} className="flex gap-2">
              <Input
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Type your guess..."
                className="bg-muted border-border text-foreground text-sm placeholder:text-muted-foreground"
                autoFocus
              />
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                →
              </Button>
            </form>
          )}
          {guessedPlayers.has(playerId) && !isDrawer && (
            <p className="text-secondary text-sm text-center font-display">✓ You guessed it!</p>
          )}
        </div>
      </div>
    </div>
  );
}
