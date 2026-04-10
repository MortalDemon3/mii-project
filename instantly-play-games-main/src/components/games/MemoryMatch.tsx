import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "@/lib/gameTypes";

type Difficulty = "easy" | "medium" | "hard";

interface CardData {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
  matchedBy: number | null;
}

interface MemoryState {
  type: "memory_state";
  cards: CardData[];
  scores: [number, number];
  turn: 0 | 1;
  phase: "playing" | "won";
  selected: number[];
  locked: boolean;
}

interface MemoryFlipRequest {
  type: "memory_flip_request";
  playerId: string;
  cardId: number;
}

interface MemoryMatchProps {
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
  difficulty?: Difficulty;
  onExit?: () => void;
}

const GRID_SIZE: Record<Difficulty, { cols: number; pairs: number; label: string }> = {
  easy:   { cols: 3, pairs: 6,  label: "Facile — 3×4"    },
  medium: { cols: 4, pairs: 8,  label: "Normal — 4×4"    },
  hard:   { cols: 5, pairs: 10, label: "Difficile — 4×5" },
};

const P_COLOR  = ["#818cf8", "#f472b6"] as const;
const P_GLOW   = ["rgba(129,140,248,.18)", "rgba(244,114,182,.18)"] as const;
const P_BORDER = ["rgba(129,140,248,.45)", "rgba(244,114,182,.45)"] as const;

const EMOJI_POOL = [
  "🌙","⭐","🔥","💎","🌊","🌸","🦋","🐉",
  "🎯","🎪","🏔","🌺","🦊","🎭","💫","🪄",
  "🌈","🦄","🎸","🧿",
];

function buildDeck(pairs: number): CardData[] {
  const doubled = [...EMOJI_POOL.slice(0, pairs), ...EMOJI_POOL.slice(0, pairs)];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, id) => ({ id, emoji, flipped: false, matched: false, matchedBy: null }));
}

export default function MemoryMatch({
                                      players,
                                      playerId,
                                      broadcast,
                                      gameState,
                                      onGameEnd,
                                      difficulty = "medium",
                                      onExit,
                                    }: MemoryMatchProps) {
  const { cols, pairs, label } = GRID_SIZE[difficulty];
  const [state, setState] = useState<MemoryState | null>(null);
  const [wrongPair, setWrongPair] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"match" | "miss" | null>(null);
  const gameEndedRef = useRef(false);

  const isHost = players.find((p) => p.isHost)?.id === playerId;
  const playerIndex = players.findIndex((p) => p.id === playerId) as 0 | 1;

  // Init host
  useEffect(() => {
    if (!isHost || state || players.length < 2) return;
    const initial: MemoryState = {
      type: "memory_state",
      cards: buildDeck(pairs),
      scores: [0, 0],
      turn: 0,
      phase: "playing",
      selected: [],
      locked: false,
    };
    setState(initial);
    broadcast("game_state", initial);
  }, [isHost, state, players, pairs, broadcast]);

  // Sync état reçu (non-host)
  useEffect(() => {
    if (!gameState) return;

    if (gameState.type === "memory_state") {
      setState(gameState as MemoryState);
      const s = gameState as MemoryState;
      if (s.phase === "won" && !gameEndedRef.current) {
        gameEndedRef.current = true;
        const scores: Record<string, number> = {};
        players.forEach((p, i) => { scores[p.id] = s.scores[i] || 0; });
        onGameEnd(scores);
      }
      return;
    }

    if (gameState.type === "memory_flip_request" && isHost) {
      const req = gameState as MemoryFlipRequest;
      applyFlip(req.playerId, req.cardId);
    }
  }, [gameState, isHost, players, onGameEnd]);

  const applyFlip = useCallback((actingPlayerId: string, cardId: number) => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.locked || prev.phase !== "playing") return prev;

      const actingIndex = players.findIndex((p) => p.id === actingPlayerId);
      if (actingIndex !== prev.turn) return prev;

      const card = prev.cards[cardId];
      if (!card || card.flipped || card.matched) return prev;

      const newCards = prev.cards.map((c) => c.id === cardId ? { ...c, flipped: true } : c);
      const newSelected = [...prev.selected, cardId];

      if (newSelected.length < 2) {
        const next: MemoryState = { ...prev, cards: newCards, selected: newSelected };
        broadcast("game_state", next);
        return next;
      }

      // Deux cartes retournées — évaluation
      const [a, b] = newSelected;
      const isMatch = newCards[a].emoji === newCards[b].emoji;

      if (isMatch) {
        const afterCards = newCards.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, matchedBy: prev.turn } : c
        );
        const newScores: [number, number] = [...prev.scores] as [number, number];
        newScores[prev.turn] += 1;
        const totalMatched = afterCards.filter((c) => c.matched).length / 2;
        const won = totalMatched >= pairs;

        const next: MemoryState = {
          ...prev,
          cards: afterCards,
          scores: newScores,
          selected: [],
          locked: false,
          phase: won ? "won" : "playing",
          turn: prev.turn, // garde le même tour si match
        };

        broadcast("game_state", next);

        if (won && !gameEndedRef.current) {
          gameEndedRef.current = true;
          const finalScores: Record<string, number> = {};
          players.forEach((p, i) => { finalScores[p.id] = newScores[i] || 0; });
          setTimeout(() => onGameEnd(finalScores), 0);
        }

        return next;
      } else {
        // Mauvaise paire — on montre les cartes retournées puis on les remet
        const lockedNext: MemoryState = {
          ...prev,
          cards: newCards,
          selected: newSelected,
          locked: true,
        };
        broadcast("game_state", lockedNext);

        setTimeout(() => {
          setState((current) => {
            if (!current) return current;
            const flippedBack = current.cards.map((c) =>
                c.id === a || c.id === b ? { ...c, flipped: false } : c
            );
            const nextTurn: 0 | 1 = current.turn === 0 ? 1 : 0;
            const next: MemoryState = {
              ...current,
              cards: flippedBack,
              selected: [],
              locked: false,
              turn: nextTurn,
            };
            broadcast("game_state", next);
            return next;
          });
        }, 1000);

        return lockedNext;
      }
    });
  }, [players, pairs, broadcast, onGameEnd]);

  const handleCard = useCallback((cardId: number) => {
    if (!state || state.phase !== "playing" || state.locked) return;
    if (state.turn !== playerIndex) return;

    const card = state.cards[cardId];
    if (!card || card.flipped || card.matched) return;

    if (isHost) {
      applyFlip(playerId, cardId);
    } else {
      broadcast("game_state", {
        type: "memory_flip_request",
        playerId,
        cardId,
      } satisfies MemoryFlipRequest);
    }
  }, [state, playerIndex, isHost, playerId, applyFlip, broadcast]);

  if (!state) {
    return <div className="text-center text-muted-foreground py-12">Waiting for second player...</div>;
  }

  const isMyTurn = state.turn === playerIndex;

  return (
      <div style={S.root}>
        <style>{CSS}</style>

        {/* Header */}
        <div style={S.header}>
          <button style={S.backBtn} onClick={onExit}>← Quitter</button>
          <div style={{ textAlign: "center" }}>
            <h2 style={S.title}>Memory</h2>
            <span style={S.sub}>{label}</span>
          </div>
          <div style={{ width: 80 }} />
        </div>

        {/* Player panels */}
        <div style={S.playersRow}>
          {([0, 1] as const).map((p) => {
            const isActive = state.turn === p && state.phase === "playing";
            const rgb = p === 0 ? "129,140,248" : "244,114,182";
            return (
                <div key={p} style={{
                  ...S.playerPanel,
                  borderColor: isActive ? P_COLOR[p] : "rgba(255,255,255,.07)",
                  background: isActive ? `rgba(${rgb},.07)` : "rgba(255,255,255,.02)",
                  boxShadow: isActive ? `0 0 28px rgba(${rgb},.12)` : "none",
                }}>
              <span className={isActive ? "duo-blink" : ""} style={{
                ...S.activeDot,
                background: isActive ? P_COLOR[p] : "transparent",
              }} />
                  <span style={{ ...S.pName, color: P_COLOR[p] }}>{players[p]?.name ?? `P${p + 1}`}</span>
                  <span style={{ ...S.pScore, color: P_COLOR[p] }}>{state.scores[p]}</span>
                  <span style={S.pPairesLabel}>paires</span>
                </div>
            );
          })}
        </div>

        {/* Status */}
        <div style={S.statusBar}>
        <span style={{ ...S.statusTxt, color: P_COLOR[state.turn] }}>
          {state.phase === "playing"
              ? isMyTurn ? "Ton tour" : `Tour de ${players[state.turn]?.name}`
              : "Partie terminée"}
        </span>
        </div>

        {/* Grid */}
        <div style={{
          ...S.grid,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          maxWidth: cols * 76 + (cols - 1) * 10,
        }}>
          {state.cards.map((card) => {
            const faceUp = card.flipped || card.matched;
            const p = card.matchedBy;
            const isWrong = state.selected.includes(card.id) && state.locked && !card.matched;
            return (
                <div key={card.id} style={S.cardScene} onClick={() => handleCard(card.id)}>
                  <div
                      className={[
                        "duo-card",
                        faceUp ? "duo-flipped" : "",
                        card.matched ? "duo-matched" : "",
                        isWrong ? "duo-wrong" : "",
                      ].filter(Boolean).join(" ")}
                      style={S.cardBody}
                  >
                    <div style={S.cardBack}>
                      <div style={S.backLines} />
                      <span style={S.backDeco}>✦</span>
                    </div>
                    <div style={{
                      ...S.cardFront,
                      ...(card.matched && p !== null ? {
                        background: P_GLOW[p as 0 | 1],
                        border: `1px solid ${P_BORDER[p as 0 | 1]}`,
                        boxShadow: `0 0 18px ${P_GLOW[p as 0 | 1]}`,
                      } : {}),
                    }}>
                      <span style={S.cardEmoji}>{card.emoji}</span>
                      {card.matched && p !== null && (
                          <span style={{ ...S.matchOwnerDot, background: P_COLOR[p as 0 | 1] }} />
                      )}
                    </div>
                  </div>
                </div>
            );
          })}
        </div>

        {/* Win overlay */}
        {state.phase === "won" && (
            <div style={S.wonOverlay} className="duo-won-in">
              <span style={{ fontSize: "3rem" }}>{state.scores[0] === state.scores[1] ? "🤝" : "🏆"}</span>
              <span style={S.wonTitle}>
            {state.scores[0] > state.scores[1]
                ? `${players[0]?.name} gagne !`
                : state.scores[1] > state.scores[0]
                    ? `${players[1]?.name} gagne !`
                    : "Match nul !"}
          </span>
              <div style={S.wonScoresRow}>
                {([0, 1] as const).map((p) => (
                    <div key={p} style={S.wonScoreBox}>
                      <span style={{ ...S.wonPName, color: P_COLOR[p] }}>{players[p]?.name}</span>
                      <span style={{ ...S.wonPScore, color: P_COLOR[p] }}>{state.scores[p]}</span>
                      <span style={S.wonPLabel}>paires</span>
                    </div>
                ))}
              </div>
              <button style={S.wonBtnSec} onClick={onExit}>Menu</button>
            </div>
        )}
      </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
.duo-card {
  width: 100%; height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.4,0,0.2,1);
  cursor: pointer;
}
.duo-flipped { transform: rotateY(180deg); }
.duo-matched { transform: rotateY(180deg); }
.duo-card:not(.duo-flipped):not(.duo-matched):hover {
  transform: rotateY(14deg) scale(1.05);
}
.duo-wrong {
  animation: duo-shake 0.45s ease;
}
@keyframes duo-shake {
  0%,100% { transform: rotateY(180deg) translateX(0); }
  20%     { transform: rotateY(180deg) translateX(-5px); }
  40%     { transform: rotateY(180deg) translateX(5px); }
  60%     { transform: rotateY(180deg) translateX(-4px); }
  80%     { transform: rotateY(180deg) translateX(4px); }
}
.duo-blink { animation: duo-dot-blink 1.2s ease infinite; }
@keyframes duo-dot-blink { 0%,100%{opacity:.4} 50%{opacity:1} }
.duo-won-in { animation: duo-won 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes duo-won {
  from { opacity:0; transform: translateY(24px) scale(0.93); }
  to   { opacity:1; transform: translateY(0)    scale(1); }
}
`;

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#07080f",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "20px 16px 48px",
    fontFamily: "'Space Mono', monospace",
    backgroundImage: "radial-gradient(ellipse at 15% 15%, rgba(129,140,248,.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(244,114,182,.05) 0%, transparent 55%)",
  },
  header: {
    width: "100%", maxWidth: 500, display: "flex",
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
  playersRow: { display: "flex", gap: 12, marginBottom: 12, width: "100%", maxWidth: 460 },
  playerPanel: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    padding: "12px 10px 10px", borderRadius: 14, border: "1px solid",
    transition: "all .28s ease", position: "relative", gap: 2,
  },
  activeDot: { width: 7, height: 7, borderRadius: "50%", marginBottom: 4, transition: "background .3s" },
  pName: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 },
  pScore: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2rem", lineHeight: 1 },
  pPairesLabel: { fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.2)", textTransform: "uppercase" },
  statusBar: { height: 34, display: "flex", alignItems: "center", marginBottom: 10 },
  statusTxt: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".9rem", letterSpacing: .5 },
  grid: { display: "grid", gap: 10, marginBottom: 32 },
  cardScene: { width: 70, height: 90, perspective: "600px", cursor: "pointer" },
  cardBody:  { width: "100%", height: "100%", position: "relative" },
  cardBack: {
    position: "absolute", inset: 0, borderRadius: 12,
    background: "linear-gradient(135deg, #110d2e 0%, #0d1a2e 100%)",
    border: "1px solid rgba(129,140,248,.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backfaceVisibility: "hidden", overflow: "hidden", zIndex: 2,
  },
  backLines: {
    position: "absolute", inset: 0,
    backgroundImage: "repeating-linear-gradient(45deg, rgba(129,140,248,.05) 0px, rgba(129,140,248,.05) 1px, transparent 1px, transparent 9px)",
  },
  backDeco: { fontSize: "1.3rem", color: "rgba(129,140,248,.4)", position: "relative", zIndex: 1 },
  cardFront: {
    position: "absolute", inset: 0, borderRadius: 12,
    background: "linear-gradient(135deg, #1c1c2e 0%, #12121f 100%)",
    border: "1px solid rgba(255,255,255,.1)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 4,
    backfaceVisibility: "hidden",
    transform: "rotateY(180deg)",
    transition: "background .3s, border-color .3s, box-shadow .3s",
    zIndex: 2,
  },
  cardEmoji: { fontSize: "2.2rem", lineHeight: 1 },
  matchOwnerDot: { width: 6, height: 6, borderRadius: "50%" },
  wonOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(7,8,15,.92)", backdropFilter: "blur(10px)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 12, zIndex: 50,
  },
  wonTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2rem", color: "#fff" },
  wonScoresRow: { display: "flex", gap: 28, marginTop: 8 },
  wonScoreBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  wonPName: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".85rem" },
  wonPScore: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2.5rem", lineHeight: 1 },
  wonPLabel: { fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,.25)", textTransform: "uppercase" },
  wonBtnSec: {
    marginTop: 12, padding: "10px 28px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.4)", fontFamily: "'Space Mono', monospace",
    fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
  },
};