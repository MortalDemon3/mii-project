import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Player } from "@/lib/gameTypes";

type Mark = "X" | "O";
type Cell = Mark | null;

interface TicTacToeGameState {
  type: "tictactoe_state";
  board: Cell[];
  currentTurnPlayerId: string;
  markByPlayerId: Record<string, Mark>;
  winnerId: string | null;
  winningLine: number[];
  isDraw: boolean;
}

interface TicTacToeMoveRequest {
  type: "tictactoe_move_request";
  playerId: string;
  cellIndex: number;
}

interface TicTacToeProps {
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
  onExit?: () => void;
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const buildState = (players: Player[]): TicTacToeGameState | null => {
  if (players.length < 2) return null;
  return {
    type: "tictactoe_state",
    board: Array(9).fill(null),
    currentTurnPlayerId: players[0].id,
    markByPlayerId: {
      [players[0].id]: "X",
      [players[1].id]: "O",
    },
    winnerId: null,
    winningLine: [],
    isDraw: false,
  };
};

const resolveWinner = (board: Cell[]) => {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
};

export default function TicTacToe({
                                    players,
                                    playerId,
                                    broadcast,
                                    gameState,
                                    onGameEnd,
                                    onExit,
                                  }: TicTacToeProps) {
  const [state, setState] = useState<TicTacToeGameState | null>(null);
  const warnedTurnRef = useRef(false);
  const gameEndedRef = useRef(false);

  const hostId = players.find((p) => p.isHost)?.id;
  const isHost = hostId === playerId;

  useEffect(() => {
    if (!isHost || state || players.length < 2) return;
    const initial = buildState(players);
    if (!initial) return;
    setState(initial);
    broadcast("game_state", initial);
  }, [isHost, state, players, broadcast]);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.type === "tictactoe_state") {
      setState(gameState as TicTacToeGameState);
      if (
          !gameEndedRef.current &&
          ((gameState as TicTacToeGameState).winnerId || (gameState as TicTacToeGameState).isDraw)
      ) {
        gameEndedRef.current = true;
        const scores: Record<string, number> = {};
        players.forEach((p) => {
          scores[p.id] = (gameState as TicTacToeGameState).winnerId === p.id ? 1 : 0;
        });
        onGameEnd(scores);
      }
      return;
    }

    if (gameState.type === "tictactoe_move_request" && isHost) {
      const request = gameState as TicTacToeMoveRequest;
      applyMoveIfValid(request.playerId, request.cellIndex);
    }
  }, [gameState, isHost, players, onGameEnd]);

  const applyMoveIfValid = useCallback(
      (actingPlayerId: string, cellIndex: number) => {
        setState((prev) => {
          if (!prev) return prev;
          if (prev.winnerId || prev.isDraw) return prev;
          if (prev.currentTurnPlayerId !== actingPlayerId) return prev;
          if (cellIndex < 0 || cellIndex > 8 || prev.board[cellIndex]) return prev;

          const mark = prev.markByPlayerId[actingPlayerId];
          if (!mark) return prev;

          const board = [...prev.board];
          board[cellIndex] = mark;

          const winningLine = resolveWinner(board);
          const winnerId = winningLine ? actingPlayerId : null;
          const isDraw = !winnerId && board.every(Boolean);
          const otherId = Object.keys(prev.markByPlayerId).find((id) => id !== actingPlayerId) ?? actingPlayerId;

          const nextState: TicTacToeGameState = {
            ...prev,
            board,
            currentTurnPlayerId: winnerId || isDraw ? prev.currentTurnPlayerId : otherId,
            winnerId,
            winningLine: winningLine ?? [],
            isDraw,
          };

          broadcast("game_state", nextState);

          if ((winnerId || isDraw) && !gameEndedRef.current) {
            gameEndedRef.current = true;
            const scores: Record<string, number> = {};
            players.forEach((p) => {
              scores[p.id] = winnerId === p.id ? 1 : 0;
            });
            setTimeout(() => onGameEnd(scores), 0);
          }

          return nextState;
        });
      },
      [broadcast, players, onGameEnd]
  );

  const handleCellClick = useCallback(
      (index: number) => {
        if (!state || state.winnerId || state.isDraw) return;

        if (state.currentTurnPlayerId !== playerId) {
          if (!warnedTurnRef.current) {
            toast.warning("Not your turn");
            warnedTurnRef.current = true;
            setTimeout(() => {
              warnedTurnRef.current = false;
            }, 900);
          }
          return;
        }

        if (isHost) {
          applyMoveIfValid(playerId, index);
        } else {
          broadcast("game_state", {
            type: "tictactoe_move_request",
            playerId,
            cellIndex: index,
          } satisfies TicTacToeMoveRequest);
        }
      },
      [state, playerId, isHost, applyMoveIfValid, broadcast]
  );

  const localMark = state?.markByPlayerId[playerId];
  const isMyTurn = state?.currentTurnPlayerId === playerId;
  const winnerName = useMemo(
      () => players.find((p) => p.id === state?.winnerId)?.name ?? null,
      [players, state?.winnerId]
  );

  if (!state) {
    return <div className="text-center text-muted-foreground py-12">Waiting for second player...</div>;
  }

  return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">You are {localMark ?? "spectator"}</div>
          {onExit && (
              <button className="text-sm underline text-muted-foreground hover:text-foreground" onClick={onExit}>
                Quit
              </button>
          )}
        </div>

        <div className="mb-4 text-center font-display text-lg">
          {state.winnerId
              ? `Winner: ${winnerName ?? "Unknown"}`
              : state.isDraw
                  ? "Draw"
                  : isMyTurn
                      ? "Your turn"
                      : "Opponent turn"}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {state.board.map((cell, idx) => {
            const isWinCell = state.winningLine.includes(idx);
            const disabled = Boolean(cell) || Boolean(state.winnerId) || state.isDraw || !isMyTurn;
            return (
                <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={disabled}
                    className={`h-24 rounded-lg border text-3xl font-bold transition ${
                        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:scale-[1.02]"
                    } ${isWinCell ? "border-yellow-400 bg-yellow-500/10" : "border-border bg-card"}`}
                >
                  {cell}
                </button>
            );
          })}
        </div>
      </div>
  );
}