import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Player } from "@/lib/gameTypes";

const ROWS = 6;
const COLS = 7;
type Disc = 1 | 2;
type Cell = Disc | null;
type Board = Cell[][];

interface Connect4State {
  type: "connect4_state";
  board: Board;
  currentTurnPlayerId: string;
  discByPlayerId: Record<string, Disc>;
  winnerId: string | null;
  winningCells: [number, number][];
  isDraw: boolean;
}

interface Connect4MoveRequest {
  type: "connect4_move_request";
  playerId: string;
  col: number;
}

interface Connect4GameProps {
  players: Player[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
}

const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const findWinningCells = (board: Board, row: number, col: number, disc: Disc): [number, number][] => {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const line: [number, number][] = [[row, col]];
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== disc) break;
      line.push([r, c]);
    }
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== disc) break;
      line.push([r, c]);
    }
    if (line.length >= 4) return line;
  }
  return [];
};

export default function Connect4Game({ players, playerId, broadcast, gameState, onGameEnd }: Connect4GameProps) {
  const [state, setState] = useState<Connect4State | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const warnedTurnRef = useRef(false);
  const gameEndedRef = useRef(false);
  const isHost = players.find((p) => p.isHost)?.id === playerId;

  useEffect(() => {
    if (!isHost || state || players.length < 2) return;
    const initial: Connect4State = {
      type: "connect4_state",
      board: emptyBoard(),
      currentTurnPlayerId: players[0].id,
      discByPlayerId: { [players[0].id]: 1, [players[1].id]: 2 },
      winnerId: null,
      winningCells: [],
      isDraw: false,
    };
    setState(initial);
    broadcast("game_state", initial);
  }, [isHost, state, players, broadcast]);

  const commitDrop = useCallback(
      (actingPlayerId: string, col: number) => {
        setState((prev) => {
          if (!prev) return prev;
          if (prev.winnerId || prev.isDraw) return prev;
          if (prev.currentTurnPlayerId !== actingPlayerId) return prev;
          if (col < 0 || col >= COLS) return prev;

          const board = prev.board.map((r) => [...r]);
          let row = -1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (!board[r][col]) { row = r; break; }
          }
          if (row < 0) return prev;

          const disc = prev.discByPlayerId[actingPlayerId];
          if (!disc) return prev;
          board[row][col] = disc;

          const winningCells = findWinningCells(board, row, col, disc);
          const winnerId = winningCells.length ? actingPlayerId : null;
          const isDraw = !winnerId && board.every((r) => r.every(Boolean));
          const otherId = Object.keys(prev.discByPlayerId).find((id) => id !== actingPlayerId) ?? actingPlayerId;

          const next: Connect4State = {
            ...prev,
            board,
            winnerId,
            winningCells,
            isDraw,
            currentTurnPlayerId: winnerId || isDraw ? prev.currentTurnPlayerId : otherId,
          };

          broadcast("game_state", next);

          // Host appelle onGameEnd directement car il ne reçoit pas son propre broadcast
          if ((winnerId || isDraw) && !gameEndedRef.current) {
            gameEndedRef.current = true;
            const scores: Record<string, number> = {};
            players.forEach((p) => {
              scores[p.id] = winnerId === p.id ? 1 : 0;
            });
            setTimeout(() => onGameEnd(scores), 0);
          }

          return next;
        });
      },
      [broadcast, players, onGameEnd]
  );

  useEffect(() => {
    if (!gameState) return;

    if (gameState.type === "connect4_state") {
      setState(gameState as Connect4State);
      if (
          !gameEndedRef.current &&
          ((gameState as Connect4State).winnerId || (gameState as Connect4State).isDraw)
      ) {
        gameEndedRef.current = true;
        const scores: Record<string, number> = {};
        players.forEach((p) => {
          scores[p.id] = (gameState as Connect4State).winnerId === p.id ? 1 : 0;
        });
        onGameEnd(scores);
      }
      return;
    }

    if (gameState.type === "connect4_move_request" && isHost) {
      const req = gameState as Connect4MoveRequest;
      commitDrop(req.playerId, req.col);
    }
  }, [gameState, isHost, players, onGameEnd, commitDrop]);

  const isMyTurn = state?.currentTurnPlayerId === playerId;

  const requestDrop = useCallback(
      (col: number) => {
        if (!state || state.winnerId || state.isDraw) return;
        if (!isMyTurn) {
          if (!warnedTurnRef.current) {
            warnedTurnRef.current = true;
            toast.warning("Not your turn");
            setTimeout(() => { warnedTurnRef.current = false; }, 900);
          }
          return;
        }
        if (isHost) {
          commitDrop(playerId, col);
        } else {
          broadcast("game_state", { type: "connect4_move_request", playerId, col } satisfies Connect4MoveRequest);
        }
      },
      [state, isMyTurn, isHost, commitDrop, playerId, broadcast]
  );

  const winnerName = useMemo(
      () => players.find((p) => p.id === state?.winnerId)?.name ?? null,
      [players, state?.winnerId]
  );

  if (!state) {
    return <div className="text-center text-muted-foreground py-12">Waiting for second player...</div>;
  }

  return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 text-center font-display text-lg">
          {state.winnerId
              ? `Winner: ${winnerName ?? "Unknown"}`
              : state.isDraw
                  ? "Draw"
                  : isMyTurn
                      ? "Your turn"
                      : "Opponent turn"}
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: COLS }).map((_, col) => (
              <button
                  key={`drop-${col}`}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => requestDrop(col)}
                  disabled={!isMyTurn || Boolean(state.winnerId) || state.isDraw}
                  className={`${!isMyTurn ? "cursor-not-allowed opacity-60" : "cursor-pointer"} h-8 rounded bg-muted`}
              >
                {hoverCol === col && isMyTurn ? "▼" : ""}
              </button>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 p-3 rounded-xl bg-card border border-border">
          {state.board.flatMap((row, r) =>
              row.map((cell, c) => {
                const winning = state.winningCells.some(([wr, wc]) => wr === r && wc === c);
                return (
                    <button
                        key={`${r}-${c}`}
                        onClick={() => requestDrop(c)}
                        disabled={!isMyTurn || Boolean(state.winnerId) || state.isDraw}
                        className={`h-12 w-12 rounded-full border transition ${
                            !isMyTurn ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                            cell === 1 ? "bg-red-500 border-red-400" : cell === 2 ? "bg-yellow-400 border-yellow-300" : "bg-slate-800 border-slate-700"
                        } ${winning ? "ring-2 ring-yellow-200" : ""}`}
                    />
                );
              })
          )}
        </div>
      </div>
  );
}