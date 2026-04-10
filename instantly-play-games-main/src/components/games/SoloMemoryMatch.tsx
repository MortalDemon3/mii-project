// src/components/games/SoloMemoryMatch.tsx

import { useState, useEffect, useCallback, useRef } from "react";

type Difficulty = "easy" | "medium" | "hard";

interface CardData {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

interface SoloMemoryMatchProps {
  playerName?: string;
  difficulty?: Difficulty;
  onGameEnd?: (result: { moves: number; time: number; pairs: number }) => void;
  onExit?: () => void;
}

const GRID_SIZE: Record<Difficulty, { cols: number; pairs: number; label: string }> = {
  easy:   { cols: 3, pairs: 6,  label: "Facile — 3×4"   },
  medium: { cols: 4, pairs: 8,  label: "Normal — 4×4"   },
  hard:   { cols: 5, pairs: 10, label: "Difficile — 4×5" },
};

const EMOJI_POOL = [
  "🌙","⭐","🔥","💎","🌊","🌸","🦋","🐉",
  "🎯","🎪","🏔","🌺","🦊","🎭","💫","🪄",
  "🌈","🦄","🎸","🧿",
];

function buildDeck(pairs: number): CardData[] {
  const emojis = EMOJI_POOL.slice(0, pairs);
  const doubled = [...emojis, ...emojis];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function SoloMemoryMatch({
  playerName = "Joueur",
  difficulty = "medium",
  onGameEnd,
  onExit,
}: SoloMemoryMatchProps) {
  const { cols, pairs, label } = GRID_SIZE[difficulty];

  const [cards, setCards]         = useState<CardData[]>(() => buildDeck(pairs));
  const [selected, setSelected]   = useState<number[]>([]);
  const [moves, setMoves]         = useState(0);
  const [matched, setMatched]     = useState(0);
  const [locked, setLocked]       = useState(false);
  const [phase, setPhase]         = useState<"idle" | "playing" | "won">("idle");
  const [time, setTime]           = useState(0);
  const [bestTime, setBestTime]   = useState<number | null>(null);
  const [combo, setCombo]         = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [wrongPair, setWrongPair] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && matched === pairs) {
      setPhase("won");
      setBestTime(b => b === null || time < b ? time : b);
      onGameEnd?.({ moves, time, pairs });
    }
  }, [matched, pairs, phase]); // eslint-disable-line

  const handleCard = useCallback((id: number) => {
    if (locked || cards[id].flipped || cards[id].matched) return;
    if (phase === "idle") setPhase("playing");

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newSel = [...selected, id];
    setCards(newCards);
    setSelected(newSel);

    if (newSel.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newSel;

      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          ));
          setMatched(m => m + 1);
          setCombo(c => c + 1);
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 900);
          setSelected([]);
          setLocked(false);
        }, 500);
      } else {
        setCombo(0);
        setWrongPair([a, b]);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
          setWrongPair([]);
          setLocked(false);
        }, 1000);
      }
    }
  }, [locked, cards, selected, phase]);

  const restart = () => {
    setCards(buildDeck(pairs));
    setSelected([]);
    setMoves(0);
    setMatched(0);
    setLocked(false);
    setPhase("idle");
    setTime(0);
    setCombo(0);
    setShowCombo(false);
    setWrongPair([]);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <div style={S.header}>
        <button style={S.backBtn} onClick={onExit}>← Quitter</button>
        <div style={{ textAlign: "center" }}>
          <h2 style={S.title}>Memory</h2>
          <span style={S.sub}>{label}</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={S.statsRow}>
        <StatBox label="COUPS"  value={String(moves)}       color="#e879f9" />
        <StatBox label="TEMPS"  value={fmt(time)}           color="#38bdf8" />
        <StatBox label="PAIRES" value={`${matched}/${pairs}`} color="#4ade80" />
        {bestTime !== null && <StatBox label="RECORD" value={fmt(bestTime)} color="#fbbf24" />}
      </div>

      <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        {showCombo && combo >= 2 && (
          <span className="sm-combo-pop" style={S.comboBadge}>🔥 Combo ×{combo}</span>
        )}
      </div>

      <div style={{ ...S.grid, gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols * 76 + (cols - 1) * 10 }}>
        {cards.map(card => (
          <SoloCard
            key={card.id}
            card={card}
            isWrong={wrongPair.includes(card.id)}
            onClick={() => handleCard(card.id)}
          />
        ))}
      </div>

      {phase === "won" && (
        <div style={S.wonOverlay} className="sm-won-in">
          <span style={{ fontSize: "3rem" }}>🎉</span>
          <span style={S.wonTitle}>Bravo {playerName} !</span>
          <span style={S.wonSub}>{moves} coups · {fmt(time)}</span>
          {bestTime === time && time > 0 && (
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "#fbbf24" }}>🏆 Nouveau record !</span>
          )}
          <button style={S.wonBtn} onClick={restart}>Rejouer</button>
          <button style={S.wonBtnSec} onClick={onExit}>Menu</button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={S.statBox}>
      <span style={S.statLabel}>{label}</span>
      <span style={{ ...S.statVal, color }}>{value}</span>
    </div>
  );
}

function SoloCard({ card, isWrong, onClick }: {
  card: CardData; isWrong: boolean; onClick: () => void;
}) {
  const faceUp = card.flipped || card.matched;

  return (
    <div style={S.cardScene} onClick={onClick}>
      <div
        className={[
          "sm-card",
          faceUp    ? "sm-flipped" : "",
          card.matched ? "sm-matched" : "",
          isWrong   ? "sm-wrong"   : "",
        ].filter(Boolean).join(" ")}
        style={S.cardBody}
      >
        {/* BACK — visible quand non retournée */}
        <div style={S.cardBack}>
          <span style={S.backDeco}>✦</span>
          <div style={S.backLines} />
        </div>

        {/* FRONT — visible quand retournée, emoji au centre */}
        <div style={{
          ...S.cardFront,
          ...(card.matched ? S.cardFrontMatched : {}),
        }}>
          <span style={S.cardEmoji}>{card.emoji}</span>
        </div>
      </div>
    </div>
  );
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');

.sm-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.sm-card .sm-face {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.sm-flipped  { transform: rotateY(180deg); }
.sm-matched  { transform: rotateY(180deg); }

.sm-card:not(.sm-flipped):not(.sm-matched):hover {
  transform: rotateY(12deg) scale(1.05);
}
.sm-wrong { animation: sm-shake 0.45s ease; }
@keyframes sm-shake {
  0%,100% { transform: rotateY(180deg) translateX(0); }
  20%     { transform: rotateY(180deg) translateX(-5px); }
  40%     { transform: rotateY(180deg) translateX(5px); }
  60%     { transform: rotateY(180deg) translateX(-4px); }
  80%     { transform: rotateY(180deg) translateX(4px); }
}
.sm-matched .sm-front-face {
  animation: sm-match-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes sm-match-pop {
  0%   { transform: rotateY(180deg) scale(0.82); }
  60%  { transform: rotateY(180deg) scale(1.12); }
  100% { transform: rotateY(180deg) scale(1); }
}

.sm-combo-pop { animation: sm-combo 0.8s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes sm-combo {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.sm-won-in { animation: sm-won 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes sm-won {
  from { opacity: 0; transform: translateY(24px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ── Styles ─────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#07080f",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "20px 16px 48px",
    fontFamily: "'Space Mono', monospace",
    backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(232,121,249,.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(56,189,248,.05) 0%, transparent 55%)",
  },
  header: {
    width: "100%", maxWidth: 480, display: "flex",
    alignItems: "center", justifyContent: "space-between", marginBottom: 20,
  },
  backBtn: {
    background: "none", border: "none", color: "rgba(255,255,255,.3)",
    fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1,
    cursor: "pointer", padding: 0, width: 80, textAlign: "left",
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: "1.5rem", color: "#fff", margin: 0, letterSpacing: -0.5,
  },
  sub: { fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,.25)", textTransform: "uppercase" },

  statsRow: { display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap", justifyContent: "center" },
  statBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "8px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)", minWidth: 72,
  },
  statLabel: { fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.25)", textTransform: "uppercase", marginBottom: 2 },
  statVal: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem" },
  comboBadge: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: "1rem", color: "#fbbf24", letterSpacing: 1,
  },

  grid: { display: "grid", gap: 10, marginBottom: 32 },

  // Card scene gives the 3D perspective
  cardScene: {
    width: 70, height: 90,
    perspective: "600px",
    cursor: "pointer",
  },
  // cardBody is the element that rotates
  cardBody: {
    width: "100%", height: "100%",
    position: "relative",
  },

  // Back face (shown by default)
  cardBack: {
    position: "absolute", inset: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg, #1a1040 0%, #0d1a2e 100%)",
    border: "1px solid rgba(232,121,249,.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
    zIndex: 2,
  },
  backDeco: {
    fontSize: "1.3rem", color: "rgba(232,121,249,.45)",
    position: "relative", zIndex: 1,
  },
  backLines: {
    position: "absolute", inset: 0,
    backgroundImage: "repeating-linear-gradient(45deg, rgba(232,121,249,.04) 0px, rgba(232,121,249,.04) 1px, transparent 1px, transparent 9px)",
  },

  // Front face (shown when flipped — rotated 180° then backface-hidden reveals it)
  cardFront: {
    position: "absolute", inset: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg, #1c1c2e 0%, #12121f 100%)",
    border: "1px solid rgba(255,255,255,.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backfaceVisibility: "hidden",
    transform: "rotateY(180deg)", // starts hidden, revealed when parent flips
    zIndex: 2,
  },
  cardFrontMatched: {
    background: "linear-gradient(135deg, #0d2416 0%, #0a1a0f 100%)",
    border: "1px solid rgba(74,222,128,.35)",
    boxShadow: "0 0 20px rgba(74,222,128,.15)",
  },
  cardEmoji: { fontSize: "2.2rem", lineHeight: 1 },

  // Won overlay
  wonOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(7,8,15,.92)", backdropFilter: "blur(10px)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 12, zIndex: 50,
  },
  wonTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#fff" },
  wonSub: { fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,.4)", textTransform: "uppercase" },
  wonBtn: {
    marginTop: 12, padding: "14px 40px", borderRadius: 12,
    border: "1px solid rgba(232,121,249,.4)", background: "rgba(232,121,249,.15)",
    color: "#e879f9", fontFamily: "'Syne', sans-serif", fontWeight: 700,
    fontSize: "1rem", cursor: "pointer", letterSpacing: 1,
  },
  wonBtnSec: {
    padding: "10px 28px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.4)", fontFamily: "'Space Mono', monospace",
    fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
  },
};
