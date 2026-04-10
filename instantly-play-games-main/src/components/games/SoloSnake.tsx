// src/components/games/SoloSnake.tsx
// Mode solo uniquement — suit le même pattern que SoloQuizGame / SoloReactionGame

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Phase = "idle" | "playing" | "dead";
type Difficulty = "easy" | "medium" | "hard";

interface Point { x: number; y: number }

interface SoloSnakeProps {
  playerName?: string;
  difficulty?: Difficulty;
  onGameEnd?: (result: { score: number; best: number }) => void;
  onExit?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID = 20;        // 20×20 cells
const CELL = 22;        // px per cell

const SPEED: Record<Difficulty, number> = {
  easy:   180,
  medium: 110,
  hard:   65,
};

const DIFF_LABEL: Record<Difficulty, string> = {
  easy:   "Facile",
  medium: "Normal",
  hard:   "Difficile",
};

const initSnake = (): Point[] => [
  { x: 10, y: 10 },
  { x: 9,  y: 10 },
  { x: 8,  y: 10 },
];

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

function eq(a: Point, b: Point) { return a.x === b.x && a.y === b.y; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoloSnake({
  playerName = "Joueur",
  difficulty = "medium",
  onGameEnd,
  onExit,
}: SoloSnakeProps) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [snake, setSnake]       = useState<Point[]>(initSnake());
  const [food, setFood]         = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir]           = useState<Direction>("RIGHT");
  const [score, setScore]       = useState(0);
  const [best, setBest]         = useState(0);
  const [flashFood, setFlashFood] = useState(false);

  // refs pour éviter stale closures dans le game loop
  const snakeRef  = useRef(snake);
  const dirRef    = useRef(dir);
  const foodRef   = useRef(food);
  const phaseRef  = useRef(phase);
  const scoreRef  = useRef(score);

  snakeRef.current  = snake;
  dirRef.current    = dir;
  foodRef.current   = food;
  phaseRef.current  = phase;
  scoreRef.current  = score;

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      z: "UP", q: "LEFT",    // AZERTY
    };
    const opposite: Record<Direction, Direction> = {
      UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
    };
    const next = map[e.key];
    if (!next) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phaseRef.current === "idle" || phaseRef.current === "dead") startGame();
      }
      return;
    }
    e.preventDefault();
    if (phaseRef.current === "playing" && next !== opposite[dirRef.current]) {
      setDir(next);
      dirRef.current = next;
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    const tick = () => {
      const head = snakeRef.current[0];
      const delta: Record<Direction, Point> = {
        UP:    { x: 0,  y: -1 },
        DOWN:  { x: 0,  y: 1  },
        LEFT:  { x: -1, y: 0  },
        RIGHT: { x: 1,  y: 0  },
      };
      const d = delta[dirRef.current];
      const next: Point = {
        x: (head.x + d.x + GRID) % GRID,
        y: (head.y + d.y + GRID) % GRID,
      };

      // Self-collision
      if (snakeRef.current.slice(1).some(s => eq(s, next))) {
        setPhase("dead");
        phaseRef.current = "dead";
        const s = scoreRef.current;
        setBest(b => { const nb = Math.max(b, s); onGameEnd?.({ score: s, best: Math.max(b, s) }); return nb; });
        return;
      }

      const ate = eq(next, foodRef.current);
      const newSnake = ate
        ? [next, ...snakeRef.current]
        : [next, ...snakeRef.current.slice(0, -1)];

      setSnake(newSnake);

      if (ate) {
        const ns = scoreRef.current + 10;
        setScore(ns);
        scoreRef.current = ns;
        const newFood = randomFood(newSnake);
        setFood(newFood);
        foodRef.current = newFood;
        setFlashFood(true);
        setTimeout(() => setFlashFood(false), 300);
      }
    };

    const id = setInterval(tick, SPEED[difficulty]);
    return () => clearInterval(id);
  }, [phase, difficulty]); // eslint-disable-line

  const startGame = () => {
    const s = initSnake();
    const f = randomFood(s);
    setSnake(s);
    setFood(f);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setScore(0);
    scoreRef.current = 0;
    setPhase("playing");
    phaseRef.current = "playing";
  };

  // ── Mobile controls ───────────────────────────────────────────────────────
  const swipe = (d: Direction) => {
    const opposite: Record<Direction, Direction> = {
      UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
    };
    if (phase === "playing" && d !== opposite[dir]) {
      setDir(d);
      dirRef.current = d;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const boardPx = GRID * CELL;

  return (
    <div style={css.root}>
      <style>{rawCss}</style>

      {/* Header */}
      <div style={{ ...css.header, maxWidth: boardPx + 8 }}>
        <button style={css.backBtn} onClick={onExit}>← Quitter</button>
        <div style={{ textAlign: "center" }}>
          <h2 style={css.title}>Snake</h2>
          <span style={css.diffBadge}>{DIFF_LABEL[difficulty]}</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Score strip */}
      <div style={{ ...css.scoreStrip, width: boardPx + 8 }}>
        <div style={css.scoreBox}>
          <span style={css.scoreLabel}>SCORE</span>
          <span style={{ ...css.scoreVal, color: "#4ade80" }}>{score}</span>
        </div>
        <div style={css.scoreBox}>
          <span style={css.scoreLabel}>MEILLEUR</span>
          <span style={{ ...css.scoreVal, color: "rgba(255,255,255,.5)" }}>{best}</span>
        </div>
        <div style={css.scoreBox}>
          <span style={css.scoreLabel}>LONGUEUR</span>
          <span style={{ ...css.scoreVal, color: "#38bdf8" }}>{snake.length}</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ ...css.boardWrap, width: boardPx + 8, height: boardPx + 8 }}>
        <canvas
          style={{ display: "none" }}
        />
        <div style={{ ...css.board, width: boardPx, height: boardPx }}>
          {/* Grid lines */}
          <svg style={css.gridSvg} width={boardPx} height={boardPx}>
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <g key={i}>
                <line x1={i * CELL} y1={0} x2={i * CELL} y2={boardPx} stroke="rgba(255,255,255,.03)" strokeWidth={1} />
                <line x1={0} y1={i * CELL} x2={boardPx} y2={i * CELL} stroke="rgba(255,255,255,.03)" strokeWidth={1} />
              </g>
            ))}
          </svg>

          {/* Snake */}
          {snake.map((seg, i) => {
            const isHead = i === 0;
            const progress = i / snake.length;
            return (
              <div
                key={`${seg.x}-${seg.y}-${i}`}
                style={{
                  ...css.seg,
                  left: seg.x * CELL,
                  top:  seg.y * CELL,
                  width: CELL - 2,
                  height: CELL - 2,
                  borderRadius: isHead ? 7 : 4,
                  background: isHead
                    ? "#4ade80"
                    : `rgba(74,222,128,${Math.max(0.15, 0.85 - progress * 0.7)})`,
                  boxShadow: isHead ? "0 0 14px rgba(74,222,128,.6)" : "none",
                  zIndex: isHead ? 3 : 2,
                }}
              />
            );
          })}

          {/* Food */}
          <div
            className={flashFood ? "food-flash" : "food-pulse"}
            style={{
              ...css.food,
              left: food.x * CELL,
              top:  food.y * CELL,
              width: CELL - 2,
              height: CELL - 2,
            }}
          />

          {/* Overlay: idle / dead */}
          {phase !== "playing" && (
            <div style={css.overlay}>
              {phase === "idle" && (
                <OverlayContent
                  emoji="🐍"
                  title="Snake"
                  sub="Mange un maximum de pommes"
                  btnLabel="Jouer"
                  onBtn={startGame}
                  hint="Flèches / WASD / ZQSD"
                />
              )}
              {phase === "dead" && (
                <OverlayContent
                  emoji="💀"
                  title={`Score : ${score}`}
                  sub={score >= best && score > 0 ? "🏆 Nouveau record !" : `Meilleur : ${best}`}
                  btnLabel="Rejouer"
                  onBtn={startGame}
                  hint="ou appuie sur Espace"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile d-pad */}
      <div style={css.dpad}>
        <div style={css.dpadRow}>
          <DpadBtn label="▲" onClick={() => swipe("UP")} />
        </div>
        <div style={css.dpadRow}>
          <DpadBtn label="◀" onClick={() => swipe("LEFT")} />
          <div style={{ width: 48, height: 48 }} />
          <DpadBtn label="▶" onClick={() => swipe("RIGHT")} />
        </div>
        <div style={css.dpadRow}>
          <DpadBtn label="▼" onClick={() => swipe("DOWN")} />
        </div>
      </div>

      {phase !== "playing" && (
        <button style={css.startMobile} onClick={startGame}>
          {phase === "idle" ? "▶ Commencer" : "↺ Rejouer"}
        </button>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverlayContent({
  emoji, title, sub, btnLabel, onBtn, hint,
}: {
  emoji: string; title: string; sub: string;
  btnLabel: string; onBtn: () => void; hint: string;
}) {
  return (
    <div style={css.overlayInner}>
      <span style={css.overlayEmoji}>{emoji}</span>
      <span style={css.overlayTitle}>{title}</span>
      <span style={css.overlaySub}>{sub}</span>
      <button style={css.overlayBtn} onClick={onBtn}>{btnLabel}</button>
      <span style={css.overlayHint}>{hint}</span>
    </div>
  );
}

function DpadBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button style={css.dpadBtn} onPointerDown={onClick}>
      {label}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rawCss = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');

  @keyframes foodPulse {
    0%,100% { transform: scale(1);   box-shadow: 0 0 10px rgba(251,113,133,.5); }
    50%      { transform: scale(1.2); box-shadow: 0 0 22px rgba(251,113,133,.9); }
  }
  @keyframes foodFlash {
    0%   { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(0.8); opacity: 0; }
  }
  .food-pulse { animation: foodPulse 1.2s ease infinite; }
  .food-flash { animation: foodFlash .3s ease forwards; }

  @keyframes overlayIn {
    from { opacity: 0; transform: translateY(12px) scale(.97); }
    to   { opacity: 1; transform: translateY(0)     scale(1);   }
  }
`;

const css: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#080c10",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 12px 32px",
    fontFamily: "'Space Mono', monospace",
  },
  header: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    background: "none", border: "none", color: "rgba(255,255,255,.3)",
    fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1,
    cursor: "pointer", padding: 0, width: 80, textAlign: "left",
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: "1.4rem", color: "#4ade80", margin: 0, letterSpacing: -0.5,
  },
  diffBadge: {
    fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
    color: "rgba(255,255,255,.25)",
  },
  scoreStrip: {
    display: "flex",
    gap: 8,
    marginBottom: 10,
  },
  scoreBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px 0",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.06)",
    background: "rgba(255,255,255,.02)",
  },
  scoreLabel: {
    fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.25)",
    textTransform: "uppercase", marginBottom: 2,
  },
  scoreVal: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem",
  },
  boardWrap: {
    position: "relative",
    padding: 4,
    borderRadius: 16,
    border: "1px solid rgba(74,222,128,.15)",
    background: "rgba(0,0,0,.4)",
    boxShadow: "0 0 60px rgba(74,222,128,.06), inset 0 0 40px rgba(0,0,0,.5)",
    marginBottom: 16,
  },
  board: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
    background: "#060a0e",
  },
  gridSvg: {
    position: "absolute", top: 0, left: 0, pointerEvents: "none",
  },
  seg: {
    position: "absolute",
    transition: "left .08s linear, top .08s linear",
  },
  food: {
    position: "absolute",
    background: "#fb7185",
    borderRadius: 6,
    zIndex: 2,
  },
  overlay: {
    position: "absolute", inset: 0,
    background: "rgba(6,10,14,.88)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10, borderRadius: 12,
  },
  overlayInner: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    animation: "overlayIn .35s ease both",
  },
  overlayEmoji: { fontSize: "2.5rem" },
  overlayTitle: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: "1.5rem", color: "#fff", letterSpacing: -0.5,
  },
  overlaySub: { fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase" },
  overlayBtn: {
    marginTop: 8,
    padding: "12px 32px",
    borderRadius: 10,
    border: "1px solid rgba(74,222,128,.4)",
    background: "rgba(74,222,128,.15)",
    color: "#4ade80",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    letterSpacing: 1,
  },
  overlayHint: { fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,.2)", textTransform: "uppercase" },
  dpad: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    marginBottom: 8,
  },
  dpadRow: { display: "flex", gap: 4 },
  dpadBtn: {
    width: 48, height: 48, borderRadius: 10,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.6)",
    fontSize: "1.1rem", cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    display: "flex", alignItems: "center", justifyContent: "center",
    userSelect: "none",
  },
  startMobile: {
    padding: "12px 32px",
    borderRadius: 10,
    border: "1px solid rgba(74,222,128,.3)",
    background: "rgba(74,222,128,.1)",
    color: "#4ade80",
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    cursor: "pointer",
  },
};
