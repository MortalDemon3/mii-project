// src/components/games/SoloTicTacToe.tsx
// Solo version (joueur vs bot) — suit le même pattern que SoloQuizGame / SoloReactionGame

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = "X" | "O";
type Cell = Player | null;
type Difficulty = "easy" | "hard";

interface SoloTicTacToeProps {
  /** Nom du joueur humain passé depuis DifficultySelector / AuthScreen */
  playerName?: string;
  /** Difficulté sélectionnée via DifficultySelector */
  difficulty?: Difficulty;
  /** Callback quand la partie se termine (pour remonter le score vers Scoreboard) */
  onGameEnd?: (result: { wins: number; losses: number; draws: number }) => void;
  /** Callback quitter */
  onExit?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Player; line: number[] } | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a] as Player, line: [a, b, c] };
  }
  return null;
}

/** Algorithme Minimax — bot imbattable en mode "hard" */
function minimax(board: Cell[], isMax: boolean): number {
  const res = checkWinner(board);
  if (res?.winner === "O") return 10;
  if (res?.winner === "X") return -10;
  if (board.every(Boolean)) return 0;

  const scores = board
    .map((v, i) => {
      if (v) return isMax ? -Infinity : Infinity;
      board[i] = isMax ? "O" : "X";
      const s = minimax(board, !isMax);
      board[i] = null;
      return s;
    });

  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function getBotMove(board: Cell[], difficulty: Difficulty): number {
  const empty = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);
  if (difficulty === "easy") return empty[Math.floor(Math.random() * empty.length)];

  let best = -Infinity;
  let move = empty[0];
  for (const i of empty) {
    board[i] = "O";
    const score = minimax(board, false);
    board[i] = null;
    if (score > best) { best = score; move = i; }
  }
  return move;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoloTicTacToe({
  playerName = "Joueur",
  difficulty = "hard",
  onGameEnd,
  onExit,
}: SoloTicTacToeProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [scores, setScores] = useState({ wins: 0, losses: 0, draws: 0 });
  const [result, setResult] = useState<{ winner: Player; line: number[] } | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [botThinking, setBotThinking] = useState(false);

  // ── Resolve round outcome ──────────────────────────────────────────────────
  const resolveBoard = useCallback(
    (next: Cell[]) => {
      const win = checkWinner(next);
      if (win) {
        setResult(win);
        setScores((s) => {
          const updated =
            win.winner === "X"
              ? { ...s, wins: s.wins + 1 }
              : { ...s, losses: s.losses + 1 };
          onGameEnd?.(updated);
          return updated;
        });
        return true;
      }
      if (next.every(Boolean)) {
        setIsDraw(true);
        setScores((s) => {
          const updated = { ...s, draws: s.draws + 1 };
          onGameEnd?.(updated);
          return updated;
        });
        return true;
      }
      return false;
    },
    [onGameEnd]
  );

  // ── Player click ──────────────────────────────────────────────────────────
  const handleCell = useCallback(
    (idx: number) => {
      if (board[idx] || result || isDraw || botThinking || current === "O") return;
      const next = [...board];
      next[idx] = "X";
      setBoard(next);
      if (!resolveBoard(next)) setCurrent("O");
    },
    [board, result, isDraw, botThinking, current, resolveBoard]
  );

  // ── Bot move ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (current !== "O" || result || isDraw) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const next = [...board];
      next[getBotMove(next, difficulty)] = "O";
      setBoard(next);
      setBotThinking(false);
      if (!resolveBoard(next)) setCurrent("X");
    }, 650);
    return () => clearTimeout(t);
  }, [current, board, result, isDraw, difficulty, resolveBoard]);

  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setResult(null);
    setIsDraw(false);
    setBotThinking(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const diffLabel = difficulty === "easy" ? "Facile" : "Difficile";

  return (
    <div style={css.root}>
      <style>{rawCss}</style>

      {/* Header */}
      <div style={css.header}>
        <button style={css.backBtn} onClick={onExit}>← Quitter</button>
        <div style={{ textAlign: "center" }}>
          <h2 style={css.title}>Morpion Solo</h2>
          <span style={css.diffBadge}>{diffLabel}</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Scoreboard inline */}
      <div style={css.scoreRow}>
        <ScoreBlock label={playerName} value={scores.wins} color="#818cf8" />
        <ScoreBlock label="NUL" value={scores.draws} color="rgba(255,255,255,.4)" />
        <ScoreBlock label="Bot 🤖" value={scores.losses} color="#f472b6" />
      </div>

      {/* Status */}
      <div style={css.statusBar}>
        {botThinking ? (
          <BotThinking />
        ) : result ? (
          <span style={{ ...css.status, color: result.winner === "X" ? "#818cf8" : "#f472b6" }}>
            {result.winner === "X" ? `🏆 ${playerName} gagne !` : "🤖 Le bot gagne !"}
          </span>
        ) : isDraw ? (
          <span style={{ ...css.status, color: "rgba(255,255,255,.6)" }}>Match nul !</span>
        ) : (
          <span style={{ ...css.status, color: current === "X" ? "#818cf8" : "#f472b6" }}>
            {current === "X" ? `Ton tour, ${playerName}` : "Bot réfléchit…"}
          </span>
        )}
      </div>

      {/* Board */}
      <div style={css.board}>
        {board.map((val, i) => {
          const isWin = result?.line.includes(i);
          const disabled = !!val || !!result || isDraw || botThinking || current === "O";
          return (
            <button
              key={i}
              style={{
                ...css.cell,
                ...(val === "X" ? css.cellX : {}),
                ...(val === "O" ? css.cellO : {}),
                ...(isWin ? css.cellWin : {}),
                ...(disabled && !val ? { cursor: "not-allowed", opacity: 0.5 } : {}),
              }}
              className={val ? "ttt-filled" : "ttt-empty"}
              onClick={() => handleCell(i)}
              disabled={disabled}
            >
              {val}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={css.actions}>
        <button style={css.btnPrimary} onClick={resetRound}>Rejouer</button>
        {onExit && <button style={css.btn} onClick={onExit}>Menu</button>}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={css.scoreBox}>
      <span style={css.scoreName}>{label}</span>
      <span style={{ ...css.scoreVal, color }}>{value}</span>
    </div>
  );
}

function BotThinking() {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#f472b6", fontSize: 12, letterSpacing: 3 }}>
      BOT RÉFLÉCHIT
      <span style={css.dots}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`ttt-dot dot-${i}`} style={css.dot} />
        ))}
      </span>
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rawCss = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
  .ttt-empty:hover:not(:disabled) { background: rgba(255,255,255,.06) !important; border-color: rgba(255,255,255,.2) !important; transform: scale(1.03); }
  .ttt-filled { animation: tttPop .22s cubic-bezier(.34,1.56,.64,1); }
  @keyframes tttPop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .ttt-dot { width:5px; height:5px; background:#f472b6; border-radius:50%; display:inline-block; animation: tttBlink 1.2s ease infinite; }
  .dot-1 { animation-delay:.2s; }
  .dot-2 { animation-delay:.4s; }
  @keyframes tttBlink { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
`;

const css: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 16px 40px",
    fontFamily: "'Space Mono', monospace",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  header: {
    width: "100%", maxWidth: 420, display: "flex",
    alignItems: "center", justifyContent: "space-between", marginBottom: 28,
  },
  backBtn: {
    background: "none", border: "none", color: "rgba(255,255,255,.35)",
    fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1,
    cursor: "pointer", padding: 0, width: 80, textAlign: "left",
  },
  title: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#fff", margin: 0 },
  diffBadge: {
    fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
    color: "rgba(255,255,255,.3)", fontFamily: "'Space Mono', monospace",
  },
  scoreRow: { display: "flex", gap: 12, marginBottom: 24 },
  scoreBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "12px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)",
    background: "rgba(255,255,255,.03)", minWidth: 80,
  },
  scoreName: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 4 },
  scoreVal: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem" },
  statusBar: { height: 40, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  status: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: 0.5 },
  dots: { display: "flex", gap: 4, alignItems: "center" },
  dot: { width: 5, height: 5, background: "#f472b6", borderRadius: "50%" },
  board: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28, width: "min(320px, 90vw)" },
  cell: {
    aspectRatio: "1", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)",
    background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "2.6rem", fontFamily: "'Syne', sans-serif",
    fontWeight: 800, cursor: "pointer", transition: "all .18s ease", color: "transparent",
  },
  cellX: { color: "#818cf8", borderColor: "rgba(129,140,248,.25)", background: "rgba(129,140,248,.07)" },
  cellO: { color: "#f472b6", borderColor: "rgba(244,114,182,.25)", background: "rgba(244,114,182,.07)" },
  cellWin: { borderColor: "rgba(250,204,21,.6)", background: "rgba(250,204,21,.08)", boxShadow: "0 0 28px rgba(250,204,21,.18)" },
  actions: { display: "flex", gap: 12 },
  btnPrimary: {
    padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(99,102,241,.45)",
    background: "rgba(99,102,241,.18)", color: "#a5b4fc", fontFamily: "'Space Mono', monospace",
    fontSize: 11, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
  },
  btn: {
    padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontFamily: "'Space Mono', monospace",
    fontSize: 11, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
  },
};
