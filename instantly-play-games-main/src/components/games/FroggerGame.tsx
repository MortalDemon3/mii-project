import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Heart, RotateCcw } from 'lucide-react';

const GRID_COLS = 11;
const GRID_ROWS = 13;
const CELL_SIZE = 48;
const CANVAS_W = GRID_COLS * CELL_SIZE;
const CANVAS_H = GRID_ROWS * CELL_SIZE;
const START_X = Math.floor(GRID_COLS / 2);
const START_WORLD_Y = 0;
const AHEAD_ROWS = 28;
const KEEP_ROWS_BEHIND = 10;
const LERP_SPEED = 14;
const MAX_HAZARD_STREAK = 5;
const RESPAWN_DELAY_MS = 500;
const LOG_MIN_GAP_CELLS = 2;

type RowType = 'highway' | 'river' | 'safe' | 'track';
type EntityType = 'car' | 'truck' | 'log' | 'train';

interface RowEntity {
  type: EntityType;
  x: number;
  width: number;
  speed: number;
  direction: 1 | -1;
  colorIdx: number;
}

interface TrackSchedule {
  direction: 1 | -1;
  speed: number;
  width: number;
  cycle: number;
  alarmDuration: number;
  passDuration: number;
  offset: number;
  colorIdx: number;
}

interface WorldRow {
  rowType: RowType;
  entities: RowEntity[];
  trackSchedule?: TrackSchedule;
}

interface PlayerPos {
  x: number;
  y: number;
}

interface FroggerGameProps {
  players: any[];
  playerId: string;
  broadcast: (event: string, payload: any) => void;
  gameState: any;
  onGameEnd: (scores: Record<string, number>) => void;
}

interface GenerationState {
  hazardStreak: number;
  corridorX: number;
}

const CAR_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899', '#22c55e'];
const TRUCK_COLORS = ['#78716c', '#a3a3a3', '#92400e', '#475569'];
const LOG_COLORS = ['#7c2d12', '#92400e', '#78350f', '#854d0e'];
const TRAIN_COLORS = ['#dc2626', '#0f172a', '#0369a1'];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(current: number, target: number, dt: number) {
  const t = Math.min(1, dt * LERP_SPEED);
  return current + (target - current) * t;
}

function shadeColor(color: string, percent: number) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function randomRowType(): RowType {
  const r = Math.random();
  if (r < 0.38) return 'highway';
  if (r < 0.72) return 'river';
  if (r < 0.87) return 'track';
  return 'safe';
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function placeEntitiesWithoutOverlap(
  widths: number[],
  minGap: number,
  maxWidth: number
) {
  const placed: { x: number; width: number }[] = [];
  const sortedWidths = [...widths].sort((a, b) => b - a);

  for (const width of sortedWidths) {
    let bestX = -1;
    let bestPenalty = Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const x = randomBetween(0, Math.max(0, maxWidth - width));
      let overlaps = false;
      let penalty = 0;
      for (const p of placed) {
        const leftA = x - minGap;
        const rightA = x + width + minGap;
        const leftB = p.x;
        const rightB = p.x + p.width;
        if (leftA < rightB && rightA > leftB) {
          overlaps = true;
          penalty += rightB - leftA;
        }
      }
      if (!overlaps) {
        bestX = x;
        bestPenalty = 0;
        break;
      }
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestX = x;
      }
    }
    if (bestX >= 0) {
      placed.push({ x: bestX, width });
    }
  }

  return placed;
}

function createHighwayEntities(level: number): RowEntity[] {
  const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  const count = 2 + Math.floor(Math.random() * 2);
  const speedScale = 1 + level * 0.05;
  const laneSpeed = (1.2 + Math.random() * 2.1) * speedScale;
  const baseType: EntityType = Math.random() > 0.35 ? 'car' : 'truck';
  const widths: number[] = Array.from({ length: count }).map(() => (Math.random() > 0.7 ? 2 : 1));
  const placements = placeEntitiesWithoutOverlap(widths, 0.85, GRID_COLS);
  const entities: RowEntity[] = [];
  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const type = Math.random() > 0.7 ? (baseType === 'car' ? 'truck' : 'car') : baseType;
    entities.push({
      type,
      x: placement.x,
      width: type === 'truck' ? Math.max(2, placement.width) : 1,
      speed: laneSpeed,
      direction,
      colorIdx: i,
    });
  }
  return entities;
}

function getRiverDifficultyParams(worldY: number) {
  if (worldY <= 20) return { minGap: 1, logCount: 6 };
  if (worldY <= 45) return { minGap: 2, logCount: 4 };
  return { minGap: 3, logCount: 3 };
}

function createRiverEntities(guaranteedX: number, worldY: number): RowEntity[] {
  const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  const { minGap, logCount } = getRiverDifficultyParams(worldY);
  const speed = 0.85 + Math.random() * 1.2;
  const entities: RowEntity[] = [];
  const occupied = Array.from({ length: GRID_COLS }, () => false);
  const reserved = Array.from({ length: GRID_COLS }, () => false);
  const markLogAndGap = (start: number, width: number) => {
    for (let cell = start; cell < start + width; cell += 1) occupied[cell] = true;
    const gapStart = Math.max(0, start - minGap);
    const gapEnd = Math.min(GRID_COLS - 1, start + width - 1 + minGap);
    for (let cell = gapStart; cell <= gapEnd; cell += 1) reserved[cell] = true;
  };
  const canPlaceLog = (start: number, width: number) => {
    if (start < 0 || start + width > GRID_COLS) return false;
    for (let cell = start; cell < start + width; cell += 1) {
      if (reserved[cell] || occupied[cell]) return false;
    }
    return true;
  };

  const safeLogWidth = 2;
  const safeLogLeft = clamp(Math.round(guaranteedX - 1), 0, GRID_COLS - safeLogWidth);
  markLogAndGap(safeLogLeft, safeLogWidth);
  entities.push({
    type: 'log',
    x: safeLogLeft,
    width: safeLogWidth,
    speed,
    direction,
    colorIdx: 0,
  });

  for (let i = 0; i < logCount; i += 1) {
    const width = worldY <= 20 ? (Math.random() > 0.4 ? 2 : 3) : (Math.random() > 0.6 ? 2 : 3);
    const validStarts: number[] = [];
    for (let start = 0; start <= GRID_COLS - width; start += 1) {
      if (canPlaceLog(start, width)) validStarts.push(start);
    }
    if (validStarts.length === 0) break;
    const start = validStarts[Math.floor(Math.random() * validStarts.length)];
    markLogAndGap(start, width);
    entities.push({
      type: 'log',
      x: start,
      width,
      speed,
      direction,
      colorIdx: i + 1,
    });
  }
  return entities;
}

function createTrackEntities(): RowEntity[] {
  return [];
}

function createTrackSchedule(): TrackSchedule {
  const width = 8 + Math.floor(Math.random() * 3);
  const speed = 34 + Math.random() * 8;
  const travelDistance = GRID_COLS + width + 4;
  const passDuration = travelDistance / speed;
  const alarmDuration = 0.42 + Math.random() * 0.18;
  const cooldown = 2 + Math.random() * 1.2;
  return {
    direction: Math.random() > 0.5 ? 1 : -1,
    speed,
    width,
    cycle: alarmDuration + passDuration + cooldown,
    alarmDuration,
    passDuration,
    offset: Math.random() * 3,
    colorIdx: Math.floor(Math.random() * TRAIN_COLORS.length),
  };
}

function getTrackStateAtTime(schedule: TrackSchedule, elapsed: number) {
  const phase = (elapsed + schedule.offset) % schedule.cycle;
  const alarmActive = phase < schedule.alarmDuration;
  const passProgress = (phase - schedule.alarmDuration) / schedule.passDuration;
  const trainActive = passProgress >= 0 && passProgress <= 1;
  if (!trainActive) {
    return { alarmActive, trainActive: false, trainX: 0 };
  }
  const from = schedule.direction === 1 ? -schedule.width - 2 : GRID_COLS + 2;
  const to = schedule.direction === 1 ? GRID_COLS + 2 : -schedule.width - 2;
  const trainX = from + (to - from) * passProgress;
  return { alarmActive, trainActive: true, trainX };
}

function generateRow(worldY: number, guaranteedX: number, hazardStreak: number): { row: WorldRow; nextHazardStreak: number } {
  if (worldY <= 1 || worldY % 9 === 0 || hazardStreak >= MAX_HAZARD_STREAK) {
    return { row: { rowType: 'safe', entities: [] }, nextHazardStreak: 0 };
  }
  const level = 1 + Math.floor(worldY / 20);
  const rowType = randomRowType();
  if (rowType === 'highway') return { row: { rowType, entities: createHighwayEntities(level) }, nextHazardStreak: hazardStreak + 1 };
  if (rowType === 'river') return { row: { rowType, entities: createRiverEntities(guaranteedX, worldY) }, nextHazardStreak: hazardStreak + 1 };
  if (rowType === 'track') return { row: { rowType, entities: createTrackEntities(), trackSchedule: createTrackSchedule() }, nextHazardStreak: hazardStreak + 1 };
  return { row: { rowType: 'safe', entities: [] }, nextHazardStreak: 0 };
}

function worldToScreenY(worldY: number, cameraY: number) {
  const row = worldY - cameraY;
  return CANVAS_H - (row + 1) * CELL_SIZE;
}

function drawTrack(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, y + 11, CANVAS_W, 4);
  ctx.fillRect(0, y + 33, CANVAS_W, 4);
  ctx.fillStyle = '#475569';
  for (let i = 0; i < GRID_COLS + 1; i += 1) {
    ctx.fillRect(i * CELL_SIZE - 2, y + 8, 6, 32);
  }
}

function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, direction: 1 | -1) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 4, w - 2, CELL_SIZE - 8, 10);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  for (let wx = x + 10; wx < x + w - 10; wx += 18) {
    ctx.fillRect(wx, y + 12, 12, 8);
  }
  ctx.fillStyle = '#fde047';
  const noseX = direction === 1 ? x + w - 7 : x + 3;
  ctx.fillRect(noseX, y + 16, 4, 12);
}

function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, sinkingFactor: number) {
  const logHeight = Math.max(10, (CELL_SIZE - 18) * sinkingFactor);
  const offsetY = 12 + (1 - sinkingFactor) * 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + offsetY, w - 4, logHeight, 8);
  ctx.fill();
  ctx.fillStyle = shadeColor(color, 24);
  ctx.fillRect(x + 8, y + offsetY + 3, Math.max(12, w - 16), Math.max(2, logHeight * 0.17));
}

function drawTrackAlarm(ctx: CanvasRenderingContext2D, y: number, elapsed: number, active: boolean) {
  if (!active) return;
  const blinkOn = Math.floor(elapsed * 8) % 2 === 0;
  if (!blinkOn) return;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(8, y + CELL_SIZE / 2, 7, 0, Math.PI * 2);
  ctx.arc(CANVAS_W - 8, y + CELL_SIZE / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(239,68,68,0.18)';
  ctx.fillRect(0, y + 2, CANVAS_W, CELL_SIZE - 4);
}

function drawHighway(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = '#2a2e3a';
  ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
  ctx.strokeStyle = 'rgba(234,179,8,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([CELL_SIZE * 0.45, CELL_SIZE * 0.35]);
  ctx.beginPath();
  ctx.moveTo(0, y + CELL_SIZE / 2);
  ctx.lineTo(CANVAS_W, y + CELL_SIZE / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRiver(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
  ctx.fillStyle = 'rgba(147,197,253,0.18)';
  ctx.fillRect(0, y + CELL_SIZE * 0.15, CANVAS_W, 5);
  ctx.fillRect(0, y + CELL_SIZE * 0.65, CANVAS_W, 4);
}

function drawSafe(ctx: CanvasRenderingContext2D, y: number, worldY: number) {
  ctx.fillStyle = worldY === 0 ? '#2d6a30' : '#3a7d3e';
  ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
}

function drawCarShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, type: 'car' | 'truck', direction: 1 | -1) {
  const r = 6;
  ctx.save();
  if (type === 'car') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 8, w - 4, h - 16, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(135,206,250,0.7)';
    const windX = direction === 1 ? x + w - 16 : x + 4;
    ctx.beginPath();
    ctx.roundRect(windX, y + 12, 12, h - 24, 3);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 12, y + 6, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 12, y + 6, 5, 0, Math.PI * 2);
    ctx.arc(x + 12, y + h - 6, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 12, y + h - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    const hlX = direction === 1 ? x + w - 6 : x + 2;
    ctx.beginPath();
    ctx.arc(hlX, y + 14, 3, 0, Math.PI * 2);
    ctx.arc(hlX, y + h - 14, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 6, w - 4, h - 12, r);
    ctx.fill();
    const cabW = CELL_SIZE * 0.6;
    const cabX = direction === 1 ? x + w - cabW - 4 : x + 4;
    ctx.fillStyle = shadeColor(color, -30);
    ctx.beginPath();
    ctx.roundRect(cabX, y + 4, cabW, h - 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(135,206,250,0.7)';
    const windX2 = direction === 1 ? cabX + cabW - 10 : cabX + 2;
    ctx.beginPath();
    ctx.roundRect(windX2, y + 10, 8, h - 20, 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    for (const wx of [x + 14, x + w * 0.4, x + w - 14]) {
      ctx.beginPath();
      ctx.arc(wx, y + 4, 5, 0, Math.PI * 2);
      ctx.arc(wx, y + h - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawChicken(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, size * 0.32, size * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.18, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.18, cy - size * 0.18);
  ctx.lineTo(cx + size * 0.32, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.1);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx + size * 0.06, cy - size * 0.22, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - size * 0.36, 4, 0, Math.PI * 2);
  ctx.arc(cx + 4, cy - size * 0.38, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + size * 0.36);
  ctx.lineTo(cx - 10, cy + size * 0.44);
  ctx.moveTo(cx - 6, cy + size * 0.36);
  ctx.lineTo(cx - 2, cy + size * 0.44);
  ctx.moveTo(cx + 6, cy + size * 0.36);
  ctx.lineTo(cx + 10, cy + size * 0.44);
  ctx.moveTo(cx + 6, cy + size * 0.36);
  ctx.lineTo(cx + 2, cy + size * 0.44);
  ctx.stroke();
}

export default function FroggerGame({ playerId, onGameEnd }: FroggerGameProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const worldRef = useRef<Map<number, WorldRow>>(new Map());
  const generationRef = useRef<GenerationState>({ hazardStreak: 0, corridorX: START_X });
  const loopRef = useRef<number>();
  const startTimeRef = useRef(performance.now());
  const playerTargetRef = useRef<PlayerPos>({ x: START_X, y: START_WORLD_Y });
  const playerRenderRef = useRef<PlayerPos>({ x: START_X, y: START_WORLD_Y });
  const cameraRef = useRef(0);
  const hitRef = useRef(false);
  const gameOverRef = useRef(false);
  const checkpointRef = useRef(START_WORLD_Y);
  const respawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore] = useState(0);
  const [highestY, setHighestY] = useState(START_WORLD_Y);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [hit, setHit] = useState(false);
  const [checkpointY, setCheckpointY] = useState(START_WORLD_Y);
  const [frameTick, setFrameTick] = useState(0);

  const level = 1 + Math.floor(highestY / 20);

  hitRef.current = hit;
  gameOverRef.current = gameOver;

  const ensureRows = useCallback((upToWorldY: number) => {
    for (let y = 0; y <= upToWorldY; y += 1) {
      if (worldRef.current.has(y)) continue;
      const corridorShift = Math.random() < 0.35 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      generationRef.current.corridorX = clamp(generationRef.current.corridorX + corridorShift, 1, GRID_COLS - 2);
      const generated = generateRow(y, generationRef.current.corridorX, generationRef.current.hazardStreak);
      generationRef.current.hazardStreak = generated.nextHazardStreak;
      worldRef.current.set(y, generated.row);
    }
  }, []);

  const pruneRows = useCallback((minWorldY: number) => {
    const keys = Array.from(worldRef.current.keys());
    for (const y of keys) {
      if (y < minWorldY) worldRef.current.delete(y);
    }
  }, []);

  const applyDeath = useCallback(() => {
    if (hitRef.current || gameOverRef.current) return;
    setHit(true);
    setLives(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setGameOver(true);
        return 0;
      }
      if (respawnTimeoutRef.current) clearTimeout(respawnTimeoutRef.current);
      respawnTimeoutRef.current = setTimeout(() => {
        setHit(false);
        const newTarget: PlayerPos = {
          x: START_X,
          y: checkpointRef.current,
        };
        playerTargetRef.current = newTarget;
        playerRenderRef.current = { ...newTarget };
      }, RESPAWN_DELAY_MS);
      return next;
    });
  }, []);

  const moveChicken = useCallback((dx: number, dy: number) => {
    if (gameOverRef.current || hitRef.current) return;
    const current = playerTargetRef.current;
    const next: PlayerPos = {
      x: clamp(Math.round(current.x + dx), 0, GRID_COLS - 1),
      y: Math.max(0, Math.round(current.y + dy)),
    };
    playerTargetRef.current = next;
    if (next.y > highestY) {
      const delta = next.y - highestY;
      setHighestY(next.y);
      setScore(s => s + delta * 10);
    }
  }, [highestY]);

  useEffect(() => {
    ensureRows(GRID_ROWS + AHEAD_ROWS);
  }, [ensureRows]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); moveChicken(0, 1); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); moveChicken(0, -1); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); moveChicken(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); moveChicken(1, 0); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moveChicken]);

  useEffect(() => {
    if (gameOver) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      const elapsed = (now - startTimeRef.current) / 1000;
      last = now;

      const targetCamera = Math.max(0, Math.floor(playerTargetRef.current.y) - (GRID_ROWS - 4));
      cameraRef.current = targetCamera;
      ensureRows(targetCamera + GRID_ROWS + AHEAD_ROWS);
      pruneRows(Math.max(0, targetCamera - KEEP_ROWS_BEHIND));

      worldRef.current.forEach(row => {
        row.entities.forEach(entity => {
          entity.x += entity.speed * entity.direction * dt;
          if (entity.direction > 0 && entity.x > GRID_COLS + 2) entity.x = -entity.width - 2;
          else if (entity.direction < 0 && entity.x < -entity.width - 2) entity.x = GRID_COLS + 2;
        });
      });

      const target = playerTargetRef.current;
      const render = playerRenderRef.current;
      const nextRender: PlayerPos = {
        x: lerp(render.x, target.x, dt),
        y: lerp(render.y, target.y, dt),
      };

      const row = worldRef.current.get(Math.round(nextRender.y));
      if (!hitRef.current && row) {
        if (row.rowType === 'safe') {
          const safeY = Math.round(nextRender.y);
          if (safeY > checkpointRef.current) {
            checkpointRef.current = safeY;
            setCheckpointY(safeY);
          }
        }

        if (row.rowType === 'river') {
          const center = nextRender.x + 0.5;
          const carrying = row.entities.find(entity => {
            if (entity.type !== 'log') return false;
            return center >= entity.x && center <= entity.x + entity.width;
          });
          if (!carrying) {
            applyDeath();
          } else {
            const drift = carrying.speed * carrying.direction * dt;
            playerTargetRef.current = { x: playerTargetRef.current.x + drift, y: playerTargetRef.current.y };
            nextRender.x += drift;
          }
        }

        if (row.rowType === 'highway') {
          const left = nextRender.x + 0.2;
          const right = nextRender.x + 0.8;
          const hitVehicle = row.entities.some(entity => {
            if (entity.type !== 'car' && entity.type !== 'truck') return false;
            const eLeft = entity.x + 0.08;
            const eRight = entity.x + entity.width - 0.08;
            return left < eRight && right > eLeft;
          });
          if (hitVehicle) applyDeath();
        }

        if (row.rowType === 'track') {
          if (!row.trackSchedule) {
            applyDeath();
          } else {
            const nowState = getTrackStateAtTime(row.trackSchedule, elapsed);
            const prevState = getTrackStateAtTime(row.trackSchedule, Math.max(0, elapsed - dt));
            if (nowState.trainActive || prevState.trainActive) {
              const left = nextRender.x + 0.15;
              const right = nextRender.x + 0.85;
              const prevTrainLeft = prevState.trainActive ? prevState.trainX : nowState.trainX;
              const prevTrainRight = prevTrainLeft + row.trackSchedule.width;
              const nowTrainLeft = nowState.trainActive ? nowState.trainX : prevState.trainX;
              const nowTrainRight = nowTrainLeft + row.trackSchedule.width;
              const sweptLeft = Math.min(prevTrainLeft, nowTrainLeft);
              const sweptRight = Math.max(prevTrainRight, nowTrainRight);
              if (left < sweptRight && right > sweptLeft) applyDeath();
            }
          }
        }
      }

      if (!hitRef.current) {
        const clampedX = clamp(nextRender.x, 0, GRID_COLS - 1);
        if (clampedX !== nextRender.x) {
          applyDeath();
          nextRender.x = clampedX;
          playerTargetRef.current = { ...playerTargetRef.current, x: clampedX };
        }
      }

      playerRenderRef.current = nextRender;
      setFrameTick(v => v + 1);
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      if (respawnTimeoutRef.current) {
        clearTimeout(respawnTimeoutRef.current);
        respawnTimeoutRef.current = null;
      }
    };
  }, [applyDeath, ensureRows, gameOver, pruneRows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    void frameTick;

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const cameraY = cameraRef.current;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    for (let screenRow = 0; screenRow < GRID_ROWS; screenRow += 1) {
      const worldY = cameraY + screenRow;
      const row = worldRef.current.get(worldY);
      if (!row) continue;
      const py = worldToScreenY(worldY, cameraY);

      if (row.rowType === 'safe') drawSafe(ctx, py, worldY);
      if (row.rowType === 'highway') drawHighway(ctx, py);
      if (row.rowType === 'river') drawRiver(ctx, py);
      if (row.rowType === 'track') {
        drawTrack(ctx, py);
        if (row.trackSchedule) {
          const state = getTrackStateAtTime(row.trackSchedule, elapsed);
          drawTrackAlarm(ctx, py, elapsed, state.alarmActive);
          if (state.trainActive) {
            drawTrain(
              ctx,
              state.trainX * CELL_SIZE,
              py,
              row.trackSchedule.width * CELL_SIZE,
              TRAIN_COLORS[row.trackSchedule.colorIdx % TRAIN_COLORS.length],
              row.trackSchedule.direction
            );
          }
        }
      }

      row.entities.forEach(entity => {
        const ex = entity.x * CELL_SIZE;
        const ew = entity.width * CELL_SIZE;
        if (entity.type === 'car' || entity.type === 'truck') {
          const palette = entity.type === 'truck' ? TRUCK_COLORS : CAR_COLORS;
          drawCarShape(ctx, ex, py, ew, CELL_SIZE, palette[entity.colorIdx % palette.length], entity.type, entity.direction);
          return;
        }
        if (entity.type === 'train') {
          drawTrain(ctx, ex, py, ew, TRAIN_COLORS[entity.colorIdx % TRAIN_COLORS.length], entity.direction);
          return;
        }
        const baseColor = LOG_COLORS[entity.colorIdx % LOG_COLORS.length];
        drawLog(ctx, ex, py, ew, baseColor, 1);
      });
    }

    const player = playerRenderRef.current;
    const playerY = worldToScreenY(player.y, cameraY);
    if (!hit && playerY >= -CELL_SIZE && playerY <= CANVAS_H) {
      drawChicken(ctx, player.x * CELL_SIZE, playerY, CELL_SIZE);
    }
  }, [frameTick, hit]);

  const handleRestart = () => {
    worldRef.current = new Map();
    generationRef.current = { hazardStreak: 0, corridorX: START_X };
    startTimeRef.current = performance.now();
    playerTargetRef.current = { x: START_X, y: START_WORLD_Y };
    playerRenderRef.current = { x: START_X, y: START_WORLD_Y };
    checkpointRef.current = START_WORLD_Y;
    if (respawnTimeoutRef.current) {
      clearTimeout(respawnTimeoutRef.current);
      respawnTimeoutRef.current = null;
    }
    cameraRef.current = 0;
    ensureRows(GRID_ROWS + AHEAD_ROWS);
    setLives(3);
    setScore(0);
    setHighestY(START_WORLD_Y);
    setCheckpointY(START_WORLD_Y);
    setHit(false);
    setGameOver(false);
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} size={22} className={i < lives ? 'text-red-500 fill-red-500' : 'text-muted-foreground/30'} />
          ))}
        </div>
        <div className="font-display text-lg font-bold text-foreground">{t('common.score')}: {score}</div>
        <div className="text-sm text-muted-foreground font-display">
          {t('common.level')} {level} - CP {checkpointY}
        </div>
      </div>

      <div className="relative mx-auto rounded-xl overflow-hidden border-2 border-border select-none" style={{ width: CANVAS_W, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={e => {
            if (!touchStart.current) return;
            const dx = e.changedTouches[0].clientX - touchStart.current.x;
            const dy = e.changedTouches[0].clientY - touchStart.current.y;
            touchStart.current = null;
            if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
              moveChicken(0, 1);
              return;
            }
            if (Math.abs(dx) > Math.abs(dy)) moveChicken(dx > 0 ? 1 : -1, 0);
            else moveChicken(0, dy < 0 ? 1 : -1);
          }}
        />

        {gameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
            <p className="text-4xl mb-2">💀</p>
            <h3 className="font-display text-2xl font-bold text-white mb-1">{t('games.frogger.gameOver')}</h3>
            <p className="text-white/80 text-lg mb-4">{t('common.score')}: {score}</p>
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="secondary" size="sm">
                <RotateCcw size={16} className="mr-1" /> {t('common.retry')}
              </Button>
              <Button onClick={() => onGameEnd({ [playerId]: score })} size="sm">{t('common.finish')}</Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 md:hidden">
        <Button variant="outline" size="icon" onClick={() => moveChicken(0, 1)} className="w-12 h-12"><ArrowUp /></Button>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => moveChicken(-1, 0)} className="w-12 h-12"><ArrowLeft /></Button>
          <Button variant="outline" size="icon" onClick={() => moveChicken(0, -1)} className="w-12 h-12"><ArrowDown /></Button>
          <Button variant="outline" size="icon" onClick={() => moveChicken(1, 0)} className="w-12 h-12"><ArrowRight /></Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">{t('common.controls')}</p>
    </div>
  );
}
