import { useEffect, useRef, useState, useCallback } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SoloDinoProps {
  playerName?: string;
  onGameEnd?: (result: { score: number; best: number }) => void;
  onExit?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 800;
const H = 260;
const GROUND_Y   = H - 44;
const GRAVITY    = 0.6;   // par frame à 60fps
const JUMP_V     = -13;   // par frame à 60fps
const BASE_SPEED = 5;     // px par frame à 60fps

const DINO_W = 44;
const DINO_H = 52;

const C = {
  bg:        "#0a0c14",
  ground:    "#1e2235",
  groundLine:"#2a3050",
  neonGreen: "#39ff88",
  neonBlue:  "#38d9f5",
  neonPink:  "#ff4daa",
  neonYellow:"#f5e642",
  text:      "#c8d0f0",
  textMuted: "#4a5280",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dino {
  x: number; y: number; vy: number;
  onGround: boolean;
  legFrame: number; legTimer: number;
  ducking: boolean;
}

interface Obstacle {
  x: number; y: number; w: number; h: number;
  type: "cactus" | "bird";
  variant: number;
}

interface Cloud { x: number; y: number; w: number; speed: number; }
interface Star  { x: number; y: number; r: number; blink: number; }

interface GameState {
  dino: Dino;
  obstacles: Obstacle[];
  clouds: Cloud[];
  stars: Star[];
  speed: number;
  frame: number;
  nextObstacle: number;
  score: number;
  flashScore: number;
  groundOffset: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoloDino({ playerName = "Joueur", onGameEnd, onExit }: SoloDinoProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const stateRef    = useRef<GameState | null>(null);
  const rafRef      = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore] = useState(0);
  const [best,  setBest]  = useState(0);
  const phaseRef = useRef<"idle" | "playing" | "dead">("idle");
  const scoreRef = useRef(0);
  const bestRef  = useRef(0);

  // ── Init ──────────────────────────────────────────────────────────────────
  function makeState(): GameState {
    return {
      dino: { x: 80, y: GROUND_Y - DINO_H, vy: 0, onGround: true, legFrame: 0, legTimer: 0, ducking: false },
      obstacles: [],
      clouds: [
        { x: 200, y: 40, w: 90,  speed: 0.4 },
        { x: 500, y: 60, w: 70,  speed: 0.3 },
        { x: 700, y: 30, w: 110, speed: 0.5 },
      ],
      stars: Array.from({ length: 60 }, () => ({
        x: Math.random() * W,
        y: Math.random() * (GROUND_Y - 20),
        r: Math.random() * 1.2 + 0.3,
        blink: Math.random() * Math.PI * 2,
      })),
      speed: BASE_SPEED,
      frame: 0,
      nextObstacle: 90,
      score: 0,
      flashScore: 0,
      groundOffset: 0,
    };
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const jump = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "dead") { startGame(); return; }
    const s = stateRef.current;
    if (s && s.dino.onGround && !s.dino.ducking) {
      s.dino.vy = JUMP_V;
      s.dino.onGround = false;
    }
  }, []);

  const duck = useCallback((on: boolean) => {
    const s = stateRef.current;
    if (!s || phaseRef.current !== "playing") return;
    s.dino.ducking = on;
    if (on && !s.dino.onGround) s.dino.vy = Math.max(s.dino.vy, 3);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Space","ArrowUp","KeyW","KeyZ"].includes(e.code)) { e.preventDefault(); jump(); }
      if (["ArrowDown","KeyS"].includes(e.code))              { e.preventDefault(); duck(true); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (["ArrowDown","KeyS"].includes(e.code)) duck(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [jump, duck]);

  // ── Obstacle spawn ────────────────────────────────────────────────────────
  function spawnObstacle(s: GameState) {
    if (s.score > 300 && Math.random() < 0.3) {
      const yOpts = [GROUND_Y - DINO_H - 8, GROUND_Y - DINO_H * 1.6, GROUND_Y - DINO_H * 2.2];
      s.obstacles.push({ x: W + 20, y: yOpts[Math.floor(Math.random() * yOpts.length)], w: 46, h: 28, type: "bird", variant: 0 });
    } else {
      const variant = Math.floor(Math.random() * 3);
      const dims = [[22,48],[28,56],[42,52]];
      const [w, h] = dims[variant];
      s.obstacles.push({ x: W + 20, y: GROUND_Y - h, w, h, type: "cactus", variant });
    }
  }

  // ── Start / Die ───────────────────────────────────────────────────────────
  function startGame() {
    stateRef.current    = makeState();
    phaseRef.current    = "playing";
    lastTimeRef.current = 0;
    setPhase("playing");
    scoreRef.current = 0;
    setScore(0);
  }

  function die() {
    phaseRef.current = "dead";
    setPhase("dead");
    const s = scoreRef.current;
    const b = Math.max(bestRef.current, s);
    bestRef.current = b;
    setBest(b);
    setScore(s);
    onGameEnd?.({ score: s, best: b });
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    stateRef.current = makeState();
    drawFrame(ctx, stateRef.current);

    function loop(timestamp: number) {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;
      if (!s) return;

      if (phaseRef.current !== "playing") {
        drawFrame(ctx, s);
        return;
      }

      // ── Delta time ──────────────────────────────────────────────────────
      // 16.667 ms = 1 frame à 60 fps
      // delta = 1.0 à 60fps, ~0.5 à 120fps, ~0.42 à 144fps
      // clamp à 3 pour éviter un saut si l'onglet était en arrière-plan
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimeRef.current) / 16.667, 3);
      lastTimeRef.current = timestamp;

      // ── Update ──────────────────────────────────────────────────────────
      s.frame++;
      s.speed = BASE_SPEED + s.score / 400;

      // Score
      s.score += s.speed * 0.08 * delta;
      scoreRef.current = Math.floor(s.score);
      if (s.frame % 6 === 0) setScore(Math.floor(s.score));
      if (Math.floor(s.score) % 100 === 0 && Math.floor(s.score) > 0) s.flashScore = 30;
      if (s.flashScore > 0) s.flashScore--;

      // Ground scroll
      s.groundOffset = (s.groundOffset + s.speed * delta) % 40;

      // Dino physics
      const dino = s.dino;
      dino.vy += GRAVITY * delta;
      dino.y  += dino.vy * delta;
      const floorY = GROUND_Y - (dino.ducking ? DINO_H * 0.55 : DINO_H);
      if (dino.y >= floorY) {
        dino.y = floorY; dino.vy = 0; dino.onGround = true;
      } else {
        dino.onGround = false;
      }

      // Leg animation
      if (dino.onGround && !dino.ducking) {
        dino.legTimer++;
        if (dino.legTimer > Math.max(4, 10 - s.speed)) {
          dino.legTimer = 0;
          dino.legFrame = dino.legFrame === 0 ? 1 : 0;
        }
      }

      // Clouds & stars
      s.clouds.forEach(c => { c.x -= c.speed * delta; if (c.x + c.w < 0) c.x = W + 60; });
      s.stars.forEach(st => { st.blink += 0.04 * delta; });

      // Obstacles
      s.nextObstacle -= delta;
      if (s.nextObstacle <= 0) {
        spawnObstacle(s);
        s.nextObstacle = Math.max(Math.floor(60 + Math.random() * 80 - s.speed * 3), 35);
      }
      s.obstacles.forEach(o => { o.x -= s.speed * delta; });
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -10);
      s.obstacles.forEach(o => { if (o.type === "bird") o.variant = s.frame % 18 < 9 ? 0 : 1; });

      // Collision
      const dinoBox = {
        x: dino.x + 6, y: dino.y + 4,
        w: (dino.ducking ? DINO_W * 1.1 : DINO_W) - 12,
        h: (dino.ducking ? DINO_H * 0.55 : DINO_H) - 8,
      };
      for (const o of s.obstacles) {
        if (
            dinoBox.x < o.x + o.w - 4 && dinoBox.x + dinoBox.w > o.x + 4 &&
            dinoBox.y < o.y + o.h - 4 && dinoBox.y + dinoBox.h > o.y + 4
        ) { die(); break; }
      }

      drawFrame(ctx, s);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawFrame(ctx: CanvasRenderingContext2D, s: GameState) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    s.stars.forEach(st => {
      const a = 0.3 + 0.3 * Math.sin(st.blink);
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${a})`; ctx.fill();
    });

    s.clouds.forEach(c => drawCloud(ctx, c.x, c.y, c.w));

    ctx.fillStyle = C.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    const grd = ctx.createLinearGradient(0, GROUND_Y, W, GROUND_Y);
    grd.addColorStop(0,   "rgba(57,255,136,0)");
    grd.addColorStop(0.3, "rgba(57,255,136,0.7)");
    grd.addColorStop(0.7, "rgba(56,217,245,0.7)");
    grd.addColorStop(1,   "rgba(56,217,245,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y, W, 2);

    ctx.strokeStyle = C.groundLine; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) {
      const x = ((i - s.groundOffset) % W + W) % W;
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 8); ctx.lineTo(x + 20, GROUND_Y + 8); ctx.stroke();
    }

    s.obstacles.forEach(o => o.type === "cactus" ? drawCactus(ctx, o) : drawBird(ctx, o));
    drawDino(ctx, s.dino);
    drawHUD(ctx, s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    ctx.fillStyle = "rgba(50,60,100,0.5)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5,  y + 12, w * 0.5,  10, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.3,  y + 16, w * 0.28,  8, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.72, y + 15, w * 0.24,  7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDino(ctx: CanvasRenderingContext2D, d: Dino) {
    const x = d.x, y = d.y;
    const G = C.neonGreen, G2 = "#2dcc6f", G3 = "#1fa857";
    ctx.save();
    ctx.shadowColor = G; ctx.shadowBlur = 16;

    if (d.ducking) {
      const bx = x, by = y, bw = 56, bh = 28;
      ctx.shadowBlur = 8; ctx.strokeStyle = G; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.quadraticCurveTo(bx - 26, by + 16, bx - 18, by + 24); ctx.stroke();
      ctx.shadowBlur = 14; ctx.fillStyle = G;
      roundRect(ctx, bx, by + 6, bw, bh, 7); ctx.fill();
      roundRect(ctx, bx + 36, by - 6, 28, 22, 6); ctx.fill();
      ctx.fillStyle = G2; roundRect(ctx, bx + 50, by + 10, 18, 8, 3); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.bg;       ctx.beginPath(); ctx.arc(bx + 58, by + 2, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.neonBlue; ctx.beginPath(); ctx.arc(bx + 59, by + 2, 3,   0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.bg;       ctx.beginPath(); ctx.arc(bx + 60, by + 1.5, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(bx + 57.5, by, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = G3; ctx.beginPath(); ctx.arc(bx + 64, by + 8, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = G2; roundRect(ctx, bx + 28, by + 10, 14, 8, 3); ctx.fill();
      ctx.fillStyle = G;
      roundRect(ctx, bx + 8,  by + bh + 2, 10, 10, 3); ctx.fill();
      roundRect(ctx, bx + 26, by + bh + 2, 10, 10, 3); ctx.fill();
      ctx.fillStyle = G3;
      roundRect(ctx, bx + 6,  by + bh + 9, 14, 4, 2); ctx.fill();
      roundRect(ctx, bx + 24, by + bh + 9, 14, 4, 2); ctx.fill();

    } else {
      ctx.shadowBlur = 8; ctx.strokeStyle = G; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + 4, y + DINO_H * 0.55); ctx.quadraticCurveTo(x - 18, y + DINO_H * 0.5, x - 10, y + DINO_H * 0.75); ctx.stroke();
      ctx.shadowBlur = 14; ctx.fillStyle = G;
      roundRect(ctx, x, y + DINO_H * 0.3, DINO_W, DINO_H * 0.7, 8); ctx.fill();
      roundRect(ctx, x + DINO_W * 0.45, y + DINO_H * 0.08, DINO_W * 0.45, DINO_H * 0.38, 6); ctx.fill();
      roundRect(ctx, x + DINO_W * 0.3,  y, DINO_W * 0.75, DINO_H * 0.38, 8); ctx.fill();
      ctx.fillStyle = G2; roundRect(ctx, x + DINO_W * 0.6, y + DINO_H * 0.28, DINO_W * 0.48, DINO_H * 0.12, 4); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.bg;       ctx.beginPath(); ctx.arc(x + DINO_W * 0.82, y + DINO_H * 0.14, 6,   0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.neonBlue; ctx.beginPath(); ctx.arc(x + DINO_W * 0.84, y + DINO_H * 0.14, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.bg;       ctx.beginPath(); ctx.arc(x + DINO_W * 0.85, y + DINO_H * 0.13, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(x + DINO_W * 0.80, y + DINO_H * 0.11, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = G3; ctx.beginPath(); ctx.arc(x + DINO_W * 1.02, y + DINO_H * 0.23, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 6; ctx.fillStyle = G2;
      roundRect(ctx, x + DINO_W * 0.5, y + DINO_H * 0.45, DINO_W * 0.3, DINO_H * 0.15, 4); ctx.fill();
      ctx.shadowBlur = 10; ctx.fillStyle = G;
      if (d.onGround) {
        if (d.legFrame === 0) {
          roundRect(ctx, x + 6,  y + DINO_H * 0.82, 11, DINO_H * 0.22, 4); ctx.fill();
          roundRect(ctx, x + 22, y + DINO_H * 0.72, 11, DINO_H * 0.18, 4); ctx.fill();
        } else {
          roundRect(ctx, x + 6,  y + DINO_H * 0.72, 11, DINO_H * 0.18, 4); ctx.fill();
          roundRect(ctx, x + 22, y + DINO_H * 0.82, 11, DINO_H * 0.22, 4); ctx.fill();
        }
      } else {
        roundRect(ctx, x + 6,  y + DINO_H * 0.78, 11, DINO_H * 0.16, 4); ctx.fill();
        roundRect(ctx, x + 22, y + DINO_H * 0.78, 11, DINO_H * 0.16, 4); ctx.fill();
      }
      ctx.fillStyle = G3;
      roundRect(ctx, x + 4,  y + DINO_H * 0.93, 15, 5, 2); ctx.fill();
      roundRect(ctx, x + 20, y + DINO_H * 0.93, 15, 5, 2); ctx.fill();
    }

    ctx.restore();
  }

  function drawCactus(ctx: CanvasRenderingContext2D, o: Obstacle) {
    ctx.save();
    ctx.shadowColor = C.neonPink; ctx.shadowBlur = 12; ctx.fillStyle = C.neonPink;
    const { x, y, w, h } = o;
    roundRect(ctx, x + w * 0.35, y, w * 0.3, h, 4); ctx.fill();
    if (o.variant !== 0) {
      roundRect(ctx, x, y + h * 0.25, w * 0.38, h * 0.12, 3); ctx.fill();
      roundRect(ctx, x, y + h * 0.05, w * 0.12, h * 0.25, 3); ctx.fill();
    }
    if (o.variant === 2) {
      roundRect(ctx, x + w * 0.62, y + h * 0.35, w * 0.38, h * 0.12, 3); ctx.fill();
      roundRect(ctx, x + w * 0.88, y + h * 0.12, w * 0.12, h * 0.27, 3); ctx.fill();
    }
    ctx.restore();
  }

  function drawBird(ctx: CanvasRenderingContext2D, o: Obstacle) {
    ctx.save();
    ctx.shadowColor = C.neonYellow; ctx.shadowBlur = 14;
    ctx.fillStyle = C.neonYellow; ctx.strokeStyle = C.neonYellow;
    ctx.lineWidth = 3; ctx.lineCap = "round";
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
    const wingY = o.variant === 0 ? cy - 12 : cy + 8;
    ctx.beginPath(); ctx.moveTo(cx - 16, cy); ctx.quadraticCurveTo(cx - 28, wingY, cx - 8, wingY + (o.variant === 0 ? 6 : -6)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 16, cy); ctx.quadraticCurveTo(cx + 28, wingY, cx + 8, wingY + (o.variant === 0 ? 6 : -6)); ctx.stroke();
    ctx.fillStyle = C.neonYellow;
    ctx.beginPath(); ctx.moveTo(cx + 16, cy - 2); ctx.lineTo(cx + 24, cy); ctx.lineTo(cx + 16, cy + 2); ctx.fill();
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(cx + 8, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawHUD(ctx: CanvasRenderingContext2D, s: GameState) {
    const sc = Math.floor(s.score);
    ctx.save();
    ctx.font = `bold 22px 'Courier New', monospace`; ctx.textAlign = "right";
    if (s.flashScore > 0) { ctx.shadowColor = C.neonGreen; ctx.shadowBlur = 20; ctx.fillStyle = "#fff"; }
    else ctx.fillStyle = C.text;
    ctx.fillText(String(sc).padStart(5, "0"), W - 20, 36);
    if (bestRef.current > 0) {
      ctx.font = "14px 'Courier New', monospace"; ctx.fillStyle = C.textMuted; ctx.shadowBlur = 0;
      ctx.fillText(`BEST ${String(bestRef.current).padStart(5, "0")}`, W - 20, 58);
    }
    if (phaseRef.current !== "playing") {
      ctx.fillStyle = "rgba(10,12,20,0.7)"; ctx.fillRect(0, 0, W, H);
      const isDead = phaseRef.current === "dead";
      ctx.font = "40px serif"; ctx.textAlign = "center"; ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.fillText(isDead ? "💥" : "🦕", W / 2, H / 2 - 40);
      ctx.shadowColor = isDead ? C.neonPink : C.neonGreen; ctx.shadowBlur = 20;
      ctx.font = "bold 26px 'Courier New', monospace";
      ctx.fillStyle = isDead ? C.neonPink : C.neonGreen;
      ctx.fillText(isDead ? "GAME OVER" : "DINO RUNNER", W / 2, H / 2 + 5);
      ctx.shadowBlur = 0; ctx.font = "13px 'Courier New', monospace"; ctx.fillStyle = C.text;
      ctx.fillText(isDead ? `SCORE : ${sc}${bestRef.current === sc && sc > 0 ? "  🏆 RECORD !" : ""}` : "APPUIE SUR ESPACE POUR JOUER", W / 2, H / 2 + 32);
      if (isDead) {
        ctx.font = "12px 'Courier New', monospace"; ctx.fillStyle = C.textMuted;
        ctx.fillText("ESPACE ou TAP pour rejouer", W / 2, H / 2 + 56);
      }
    }
    ctx.restore();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div style={S.root}>
        <style>{CSS}</style>
        <div style={S.header}>
          <button style={S.backBtn} onClick={onExit}>← Quitter</button>
          <div style={{ textAlign: "center" }}>
            <h2 style={S.title}>Dino Runner</h2>
            <span style={S.sub}>Mode Solo</span>
          </div>
          <div style={{ width: 80 }} />
        </div>

        <div style={S.scoreStrip}>
          <StatBox label="SCORE"    value={String(score).padStart(5, "0")} color="#39ff88" />
          <StatBox label="MEILLEUR" value={String(best).padStart(5, "0")}  color="#f5e642" />
        </div>

        <div style={S.canvasWrap}>
          <canvas
              ref={canvasRef} width={W} height={H} style={S.canvas}
              onClick={jump}
              onTouchStart={e => { e.preventDefault(); jump(); }}
          />
        </div>

        <div style={S.mobileRow}>
          <button style={S.mobileBtn} onPointerDown={jump} onTouchStart={e => { e.preventDefault(); jump(); }}>
            ▲ Sauter
          </button>
          <button
              style={{ ...S.mobileBtn, borderColor: "rgba(56,217,245,.35)", color: "#38d9f5" }}
              onPointerDown={() => duck(true)} onPointerUp={() => duck(false)}
              onTouchStart={e => { e.preventDefault(); duck(true); }} onTouchEnd={() => duck(false)}
          >
            ▼ S'accroupir
          </button>
        </div>

        <p style={S.hint}>
          {phase === "idle"
              ? "Appuie sur Espace · ↑ / W · Z ou tap pour démarrer"
              : phase === "playing"
                  ? "↓ / S pour s'accroupir et éviter les oiseaux"
                  : "Appuie sur Espace ou tap pour rejouer"}
        </p>
      </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
      <div style={Sb.box}>
        <span style={Sb.label}>{label}</span>
        <span style={{ ...Sb.val, color, fontFamily: "'Courier New', monospace" }}>{value}</span>
      </div>
  );
}

const Sb: Record<string, React.CSSProperties> = {
  box:   { display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)", minWidth: 100 },
  label: { fontSize: 8, letterSpacing: 3, color: "rgba(200,208,240,.3)", textTransform: "uppercase", marginBottom: 2 },
  val:   { fontWeight: 700, fontSize: "1.2rem", letterSpacing: 2 },
};

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');`;

const S: Record<string, React.CSSProperties> = {
  root:       { minHeight: "100vh", background: "#0a0c14", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 12px 40px", fontFamily: "'Space Mono', monospace", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(57,255,136,.04) 0%, transparent 60%)" },
  header:     { width: "100%", maxWidth: 820, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:    { background: "none", border: "none", color: "rgba(200,208,240,.3)", fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", padding: 0, width: 80, textAlign: "left" },
  title:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#39ff88", margin: 0, letterSpacing: -0.5 },
  sub:        { fontSize: 9, letterSpacing: 3, color: "rgba(200,208,240,.25)", textTransform: "uppercase" },
  scoreStrip: { display: "flex", gap: 12, marginBottom: 14 },
  canvasWrap: { borderRadius: 16, border: "1px solid rgba(57,255,136,.15)", overflow: "hidden", boxShadow: "0 0 60px rgba(57,255,136,.07), 0 0 120px rgba(56,217,245,.04)", maxWidth: "100%", cursor: "pointer" },
  canvas:     { display: "block", maxWidth: "100%", height: "auto", touchAction: "none" },
  mobileRow:  { display: "flex", gap: 12, marginTop: 16 },
  mobileBtn:  { padding: "12px 24px", borderRadius: 10, border: "1px solid rgba(57,255,136,.35)", background: "rgba(57,255,136,.08)", color: "#39ff88", fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", userSelect: "none" },
  hint:       { marginTop: 14, fontSize: 10, letterSpacing: 2, color: "rgba(200,208,240,.25)", textTransform: "uppercase", textAlign: "center" },
};
 