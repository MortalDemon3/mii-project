import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Player } from "@/lib/gameTypes";

interface ReactionGameProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
}

interface ReactionState {
  type: "reaction_state";
  round: number;
  totalRounds: number;
  countdown: number;
  waiting: boolean;
  shape: { type: string; color: string; x: number; y: number } | null;
  roundWinnerId: string | null;
  roundClaimed: boolean;
  scores: Record<string, number>;
  ended: boolean;
}

const SHAPES = ["circle", "square", "triangle", "star"] as const;
const SHAPE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ec4899"];
const TOTAL_ROUNDS = 5;

const buildInitialState = (players: Player[]): ReactionState => {
  const scores: Record<string, number> = {};
  players.forEach((p) => { scores[p.id] = 0; });
  return {
    type: "reaction_state",
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    countdown: 3,
    waiting: true,
    shape: null,
    roundWinnerId: null,
    roundClaimed: false,
    scores,
    ended: false,
  };
};

export default function ReactionGame({
                                       players, playerId, broadcast, gameState, onGameEnd,
                                     }: ReactionGameProps) {
  const [state, setState] = useState<ReactionState>(() => buildInitialState(players));
  const isHost = players.find((p) => p.isHost)?.id === playerId;
  const hasInitializedRef = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const pushState = useCallback((next: ReactionState) => {
    setState(next);
    broadcast("game_state", next);
  }, [broadcast]);

  const scheduleRound = useCallback((roundNum: number, currentScores: Record<string, number>) => {
    if (!isHost) return;
    const delay = 900 + Math.random() * 2000;
    window.setTimeout(() => {
      const shape = {
        type: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 60,
      };
      const next: ReactionState = {
        ...stateRef.current,
        scores: currentScores,
        round: roundNum,
        waiting: false,
        shape,
        roundWinnerId: null,
        roundClaimed: false,
      };
      pushState(next);
    }, delay);
  }, [isHost, pushState]);

  const handleWinner = useCallback((winnerId: string, currentScores: Record<string, number>, roundNum: number) => {
    if (!isHost) return;
    const updatedScores = {
      ...currentScores,
      [winnerId]: (currentScores[winnerId] || 0) + 100,
    };
    const interState: ReactionState = {
      ...stateRef.current,
      scores: updatedScores,
      roundWinnerId: winnerId,
      roundClaimed: true,
      shape: null,
      waiting: true,
    };
    pushState(interState);

    window.setTimeout(() => {
      if (roundNum >= TOTAL_ROUNDS) {
        pushState({ ...interState, ended: true });
      } else {
        scheduleRound(roundNum + 1, updatedScores);
      }
    }, 1500);
  }, [isHost, pushState, scheduleRound]);

  // Init host
  useEffect(() => {
    if (!isHost || hasInitializedRef.current || players.length < 2) return;
    hasInitializedRef.current = true;

    const initial = buildInitialState(players);
    pushState(initial);

    let tick = initial.countdown;
    const countdownTimer = window.setInterval(() => {
      tick--;
      const next: ReactionState = { ...stateRef.current, countdown: tick };
      if (tick <= 0) {
        window.clearInterval(countdownTimer);
        setState(next);
        broadcast("game_state", next);
        scheduleRound(1, next.scores);
      } else {
        pushState(next);
      }
    }, 1000);
  }, [isHost, players]);

  // Sync état reçu (non-host)
  useEffect(() => {
    if (!gameState || gameState.type !== "reaction_state") return;
    setState(gameState as ReactionState);
  }, [gameState]);

  // Host traite le claim d'un non-host
  useEffect(() => {
    if (!isHost || !gameState) return;
    if (
        gameState.type === "reaction_claim" &&
        typeof gameState.winnerId === "string" &&
        gameState.round === stateRef.current.round &&
        !stateRef.current.roundClaimed
    ) {
      handleWinner(gameState.winnerId, stateRef.current.scores, stateRef.current.round);
    }
  }, [gameState]);

  // Fin de partie
  useEffect(() => {
    if (state.ended) onGameEnd(state.scores);
  }, [state.ended]);

  // Claim — plus de Supabase, on broadcast directement
  const claimRound = useCallback(() => {
    const s = stateRef.current;
    if (!s.shape || s.roundClaimed || s.ended) return;

    if (isHost) {
      // Le host se déclare gagnant directement
      handleWinner(playerId, s.scores, s.round);
    } else {
      // Non-host envoie son claim au host
      broadcast("game_state", {
        type: "reaction_claim",
        winnerId: playerId,
        round: s.round,
      });
    }
  }, [isHost, playerId, handleWinner, broadcast]);

  const winnerName = useMemo(
      () => state.roundWinnerId
          ? players.find((p) => p.id === state.roundWinnerId)?.name ?? "Unknown"
          : null,
      [state.roundWinnerId, players]
  );

  const renderShape = () => {
    if (!state.shape) return null;
    const common = {
      className: "absolute cursor-pointer transition-transform hover:scale-110",
      style: { left: `${state.shape.x}%`, top: `${state.shape.y}%` },
      onClick: claimRound,
    };
    if (state.shape.type === "circle") {
      return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} {...common}
                         style={{ ...common.style, width: 80, height: 80, borderRadius: "9999px", background: state.shape.color }} />;
    }
    if (state.shape.type === "square") {
      return <motion.div initial={{ scale: 0, rotate: 45 }} animate={{ scale: 1, rotate: 0 }} {...common}
                         style={{ ...common.style, width: 80, height: 80, borderRadius: 12, background: state.shape.color }} />;
    }
    if (state.shape.type === "triangle") {
      return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} {...common}
                         style={{ ...common.style, width: 0, height: 0, borderLeft: "40px solid transparent",
                           borderRight: "40px solid transparent", borderBottom: `70px solid ${state.shape.color}` }} />;
    }
    return (
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} {...common}
                    style={{ ...common.style, fontSize: 64, color: state.shape.color }}>★</motion.div>
    );
  };

  return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-lg">Round {state.round}/{state.totalRounds}</div>
          <div className="flex gap-4">
            {players.map((p) => (
                <div key={p.id} className="text-center">
                  <div className="text-xs text-muted-foreground">{p.name}</div>
                  <div className="font-display font-bold text-foreground">{state.scores[p.id] || 0}</div>
                </div>
            ))}
          </div>
        </div>
        <div className="card-game rounded-2xl relative overflow-hidden" style={{ height: "60vh", minHeight: 400 }}>
          {state.countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-7xl font-display font-bold text-gradient">
                {state.countdown}
              </div>
          )}
          {!state.ended && state.waiting && !state.roundWinnerId && state.countdown === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-display text-muted-foreground">
                Get ready...
              </div>
          )}
          {state.roundWinnerId && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/40">
                <div className="text-center">
                  <div className="text-5xl mb-3">⚡</div>
                  <p className="font-display text-2xl font-bold text-foreground">{winnerName} was fastest!</p>
                  <p className="text-secondary font-display">+100 points</p>
                </div>
              </div>
          )}
          {renderShape()}
        </div>
      </div>
  );
}