"use client";
// Fiche CM4 : le fragment shader et le modèle d'éclairage de Phong.
// Sources : vidéo iiv-03-phong (plan.json, video.srt) et README du CM4.
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import {
  ArrowMarkers,
  C,
  Choice,
  Code,
  Figure,
  Formula,
  Idea,
  Note,
  Points,
  Reveal,
  Section,
  Slider,
  Stepper,
  Trap,
  motion,
  type Color,
} from "../kit";

// ---------------------------------------------------------------------------
// Petits outils

type V3 = [number, number, number];
type P2 = { x: number; y: number };
type W3 = [number, number, number];

const deg = Math.PI / 180;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** R = 2·dot(L, N)·N − L : le miroir de L autour de N. */
const reflect = (L: V3, N: V3): V3 => {
  const k = 2 * dot(L, N);
  return [k * N[0] - L[0], k * N[1] - L[1], k * N[2] - L[2]];
};
/** Arrondi pour les attributs SVG (même texte côté serveur et navigateur). */
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Nombre à la française : virgule décimale, vrai signe moins. */
function fr(x: number, d = 2) {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d).replace(".", ",").replace("-", "−");
}
const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
/** 0,063 ou 2·10⁻¹⁰ pour les toutes petites valeurs. */
function small(x: number) {
  if (x >= 0.001) return fr(x, 3);
  if (x <= 0) return "0";
  const e = Math.floor(Math.log10(x));
  const m = Math.round(x / 10 ** e);
  return `${m}·10${String(e)
    .split("")
    .map((ch) => SUP[ch] ?? ch)
    .join("")}`;
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Animation pilotée par requestAnimationFrame (les setState se font dans le callback). */
function useTween() {
  const raf = useRef(0);
  useEffect(() => {
    const r = raf;
    return () => cancelAnimationFrame(r.current);
  }, []);
  return useCallback((ms: number, frame: (t: number) => void) => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      frame(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);
}

function Play({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
    >
      ▶ {children}
    </button>
  );
}

/** Texte SVG avec un halo couleur du fond, lisible par-dessus les traits. */
function T({
  x,
  y,
  children,
  color = C.ink,
  size = 13,
  anchor = "start",
  weight,
}: {
  x: number;
  y: number;
  children: ReactNode;
  color?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      x={r2(x)}
      y={r2(y)}
      fill={color}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={weight}
      stroke={C.paper}
      strokeWidth={4}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

function Arrow({ from, to, color, width = 2.5, dash }: { from: P2; to: P2; color: Color; width?: number; dash?: string }) {
  return (
    <line
      x1={r2(from.x)}
      y1={r2(from.y)}
      x2={r2(to.x)}
      y2={r2(to.y)}
      stroke={C[color]}
      strokeWidth={width}
      strokeDasharray={dash}
      markerEnd={`url(#arr-${color})`}
    />
  );
}

function Lamp({ x, y }: P2) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, k) => {
        const a = k * 45 * deg;
        return (
          <line
            key={k}
            x1={r2(x + 11 * Math.cos(a))}
            y1={r2(y + 11 * Math.sin(a))}
            x2={r2(x + 16 * Math.cos(a))}
            y2={r2(y + 16 * Math.sin(a))}
            stroke={C.yellow}
            strokeWidth={2}
          />
        );
      })}
      <circle cx={r2(x)} cy={r2(y)} r={7} fill={C.yellow} />
    </g>
  );
}

/** Icône de caméra ; `look` : direction de visée en degrés (repère SVG). */
function Cam({ x, y, look, glow = 0 }: { x: number; y: number; look: number; glow?: number }) {
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(look)})`}>
      <rect x={-21} y={-9} width={17} height={18} rx={2} fill={C.fill} />
      <rect x={-21} y={-9} width={17} height={18} rx={2} fill={C.yellow} fillOpacity={r2(glow)} stroke={C.ink} strokeWidth={1.5} />
      <path d="M -4 -4 L 7 -9 L 7 9 L -4 4 Z" fill={C.fill2} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}

/** Arc de cercle entre deux angles (degrés, sens trigonométrique, y vers le haut). */
function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const p = (a: number) => `${r2(cx + r * Math.cos(a * deg))} ${r2(cy - r * Math.sin(a * deg))}`;
  const lo = Math.min(a1, a2);
  const hi = Math.max(a1, a2);
  return `M ${p(lo)} A ${r} ${r} 0 ${hi - lo > 180 ? 1 : 0} 0 ${p(hi)}`;
}

/** Point SVG (coordonnées du viewBox) sous le pointeur. */
function svgPoint(e: RPointerEvent<SVGSVGElement>): P2 | null {
  const ctm = e.currentTarget.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Coordonnées barycentriques de p dans le triangle (a, b, c), ramenées dans le triangle. */
function bary(p: P2, a: P2, b: P2, c: P2): W3 {
  const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  const wa = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / d;
  const wb = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / d;
  const w: W3 = [Math.max(0, wa), Math.max(0, wb), Math.max(0, 1 - wa - wb)];
  const s = w[0] + w[1] + w[2] || 1;
  return [w[0] / s, w[1] / s, w[2] / s];
}

/** Interpolation linéaire par morceaux entre des poids barycentriques. */
function alongPath(path: W3[], t: number): W3 {
  const n = path.length - 1;
  const x = Math.min(n - 1e-9, t * n);
  const k = Math.floor(x);
  const u = x - k;
  const a = path[k];
  const b = path[k + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function Swatch({ rgb, label }: { rgb: V3; label: string }) {
  const css = `rgb(${rgb.map((c) => Math.round(255 * Math.min(1, c))).join(" ")})`;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-7 w-7 border border-line" style={{ background: css }} />
      <span>{label}</span>
    </span>
  );
}

/** Lettre colorée comme dans les schémas. */
function Tagged({ c, children }: { c: Color; children: ReactNode }) {
  return (
    <strong style={{ color: C[c] }} className="font-mono">
      {children}
    </strong>
  );
}

// ---------------------------------------------------------------------------
// Rendu par pixel d'une sphère (canvas : fond sombre explicite)

type Term = "ambient" | "diffuse" | "specular" | "total";

function PhongCanvas({
  ka,
  kd,
  ks,
  alpha,
  L,
  V,
  color,
  base,
  term = "total",
  size = 150,
  marker = false,
}: {
  ka: number;
  kd: number;
  ks: number;
  alpha: number;
  L: V3;
  V: V3;
  color: V3;
  base?: V3;
  term?: Term;
  size?: number;
  marker?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const px = size * 2;
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const img = ctx.createImageData(px, px);
    const d = img.data;
    const c = px / 2;
    const R = px * 0.4;
    const b0 = base ?? [0, 0, 0];
    for (let j = 0; j < px; j++) {
      for (let i = 0; i < px; i++) {
        const o = (j * px + i) * 4;
        const x = (i + 0.5 - c) / R;
        const y = (c - j - 0.5) / R;
        const q = x * x + y * y;
        if (q > 1) {
          d[o] = 21;
          d[o + 1] = 23;
          d[o + 2] = 30;
          d[o + 3] = 255;
          continue;
        }
        const N: V3 = [x, y, Math.sqrt(1 - q)];
        const ln = dot(L, N);
        const amb = ka * 1; // ia = 1
        const dif = kd * Math.max(ln, 0);
        const spe = ks > 0 ? ks * Math.max(dot(reflect(L, N), V), 0) ** alpha : 0;
        const ph = term === "ambient" ? amb : term === "diffuse" ? dif : term === "specular" ? spe : amb + dif + spe;
        for (let k = 0; k < 3; k++) d[o + k] = Math.round(255 * Math.min(1, b0[k] + color[k] * ph));
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = "#454b5a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, 2 * Math.PI);
    ctx.stroke();
    if (marker) {
      const l = Math.hypot(L[0], L[1]);
      if (l > 1e-3) {
        const mx = c + (L[0] / l) * R * 1.16;
        const my = c - (L[1] / l) * R * 1.16;
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(mx, my, px * 0.032, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [ka, kd, ks, alpha, L, V, color, base, term, px, marker]);
  return <canvas ref={ref} width={px} height={px} style={{ width: size, height: size }} className="block" aria-hidden />;
}

// ---------------------------------------------------------------------------
// 1. Spéculaire, diffus, ambiant : la caméra se déplace au-dessus d'une surface

type Surf = "lisse" | "rugueuse" | "ambiant";
const ZIG = [0, -6, 3, -8, 4, 0, -5, 6, -3, 5];

function SurfaceFig() {
  const [mode, setMode] = useState<Surf>("lisse");
  const [phi, setPhi] = useState(40);
  const tween = useTween();
  const H = { x: 320, y: 236 };
  const rad = 150;
  const cam = { x: H.x + rad * Math.sin(phi * deg), y: H.y - rad * Math.cos(phi * deg) };
  const look = Math.atan2(H.y - cam.y, H.x - cam.x) / deg;
  const b = mode === "lisse" ? Math.max(Math.cos((phi - 45) * deg), 0) ** 64 : mode === "rugueuse" ? 0.7 : 0.25;
  const S = { x: H.x - 150, y: H.y - 150 };
  const zig = Array.from({ length: 34 }, (_, k) => `${120 + k * 12},${H.y + ZIG[k % 10]}`).join(" ");
  const title = mode === "lisse" ? "spéculaire (métal poli)" : mode === "rugueuse" ? "diffus (laine)" : "ambiant = constante";
  const a60 = { x: r2(H.x - rad * Math.sin(60 * deg)), y: r2(H.y - rad * Math.cos(60 * deg)) };
  const b60 = { x: r2(H.x + rad * Math.sin(60 * deg)), y: a60.y };
  return (
    <Figure caption="Surface lisse : la caméra ne voit le reflet que sur le rayon réfléchi (max(cos(angle − 45°), 0)^64). Surface rugueuse : même lumière partout (0,7). Les rebonds multiples sont remplacés par une constante : l'ambiant.">
      <div className="space-y-3">
        <Choice
          label="Surface"
          options={[
            { value: "lisse", label: "lisse" },
            { value: "rugueuse", label: "rugueuse" },
            { value: "ambiant", label: "rebonds → ambiant" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <svg viewBox="0 0 640 262" className="w-full max-w-[640px]" role="img" aria-label="Réflexion spéculaire, diffuse et lumière ambiante sur une surface vue de côté">
          <ArrowMarkers />
          <T x={20} y={28} color={C.ink} size={15} weight={600}>
            {title}
          </T>
          <T x={620} y={28} anchor="end" color={C.text}>
            {mode === "ambiant" ? "lumière reçue : constante" : `lumière reçue : ${fr(b)}`}
          </T>
          {/* chemin de la caméra */}
          <path d={`M ${a60.x} ${a60.y} A ${rad} ${rad} 0 0 1 ${b60.x} ${b60.y}`} fill="none" stroke={C.line} strokeDasharray="4 5" />
          {mode === "ambiant" && (
            <motion.rect
              key="glow"
              x={120}
              y={96}
              width={400}
              height={H.y - 96}
              fill={C.yellow}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.13 }}
              transition={{ delay: 1.3, duration: 0.8 }}
            />
          )}
          {/* surface */}
          {mode === "rugueuse" ? (
            <polyline points={zig} fill="none" stroke={C.ink} strokeWidth={2} />
          ) : (
            <line x1={120} y1={H.y} x2={520} y2={H.y} stroke={C.ink} strokeWidth={2} />
          )}
          {mode === "ambiant" && <line x1={520} y1={90} x2={520} y2={H.y} stroke={C.ink} strokeWidth={2} />}
          <Lamp x={S.x} y={S.y} />
          {mode !== "ambiant" && <Arrow from={{ x: S.x + 12, y: S.y + 12 }} to={{ x: H.x - 4, y: H.y - 4 }} color="yellow" />}
          {mode === "lisse" && (
            <motion.g key="lisse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Arrow from={H} to={{ x: H.x + 140, y: H.y - 140 }} color="red" />
              <T x={H.x + 118} y={H.y - 150} color={C.red} size={12.5}>
                rayon réfléchi
              </T>
            </motion.g>
          )}
          {mode === "rugueuse" && (
            <motion.g key="rug" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              {Array.from({ length: 11 }, (_, k) => {
                const a = (15 + 15 * k) * deg;
                return <Arrow key={k} from={H} to={{ x: H.x + 82 * Math.cos(a), y: H.y - 82 * Math.sin(a) }} color="yellow" width={1.6} />;
              })}
            </motion.g>
          )}
          {mode === "ambiant" && (
            <motion.path
              key="zig"
              d={`M ${S.x + 10} ${S.y + 10} L 290 ${H.y} L 520 128 L 420 ${H.y} L 520 186`}
              fill="none"
              stroke={C.yellow}
              strokeWidth={2.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          )}
          <circle cx={H.x} cy={H.y} r={4} fill={C.ink} />
          <Cam x={cam.x} y={cam.y} look={look} glow={b} />
          <T x={cam.x} y={cam.y - 26} anchor="middle" size={12} color={C.weak}>
            caméra
          </T>
        </svg>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider label="Caméra (angle)" value={phi} min={-60} max={60} onChange={setPhi} format={(v) => `${v}°`} />
          </div>
          <Play onClick={() => tween(3200, (t) => setPhi(Math.round(-60 + 120 * ease(t))))}>balayer</Play>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. N, L, V, R avec un curseur sur la lumière, et les trois barres

function VectorsFig() {
  const [theta, setTheta] = useState(45);
  const [cam, setCam] = useState<"haut" | "gauche">("haut");
  const [showR, setShowR] = useState<0 | 1>(0);
  const tween = useTween();
  const P = { x: 230, y: 305 };
  const len = 122;
  const tip = (v: V3, k = 1) => ({ x: P.x + len * k * v[0], y: P.y - len * k * v[1] });
  const N: V3 = [0, 1, 0];
  const V: V3 = cam === "haut" ? [0, 1, 0] : normalize([-1, 1, 0]);
  const L: V3 = [Math.sin(theta * deg), Math.cos(theta * deg), 0];
  const ln = dot(L, N);
  const R = reflect(L, N);
  const rv = dot(R, V);
  const A = 1;
  const D = Math.max(ln, 0);
  const S = Math.max(rv, 0) ** 8;
  const phong = 0.1 * A + 0.7 * D + 0.2 * S;
  const vOff = cam === "haut" ? -7 : 0;
  const vTip = tip(V);
  const camPos = tip(V, 1.38);
  const Q = tip(N, 2 * ln);
  const bars: { name: string; v: number; color: Color }[] = [
    { name: "Ambient", v: A, color: "purple" },
    { name: "Diffuse", v: D, color: "yellow" },
    { name: "Specular", v: S, color: "red" },
  ];
  const hit = S > 0.9;
  return (
    <Figure caption="Caméra au-dessus et θ = 45° : c'est l'exemple du cours (phong ≈ 0,61). Caméra en haut à gauche : quand R s'aligne avec V (θ = 45°), la barre Specular bondit à 1, puis retombe dès que R s'écarte.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Choice
            label="Caméra"
            options={[
              { value: "haut", label: "au-dessus (V = N)" },
              { value: "gauche", label: "en haut à gauche" },
            ]}
            value={cam}
            onChange={setCam}
          />
          <Choice
            label="Construction de R"
            options={[
              { value: 0, label: "cacher" },
              { value: 1, label: "montrer" },
            ]}
            value={showR}
            onChange={setShowR}
          />
        </div>
        <svg viewBox="0 0 860 345" className="w-full max-w-[860px]" role="img" aria-label="Vecteurs N, L, V, R au point éclairé et barres Ambient, Diffuse, Specular">
          <ArrowMarkers />
          <line x1={50} y1={P.y} x2={410} y2={P.y} stroke={C.ink} strokeWidth={2} />
          <T x={60} y={P.y + 22} color={C.weak} size={12}>
            surface
          </T>
          {/* angle θ entre N et L */}
          <path d={arc(P.x, P.y, 38, 90, 90 - theta)} fill="none" stroke={C.yellow} strokeWidth={1.5} />
          <T x={P.x + 50 * Math.cos((90 - theta / 2) * deg) - 4} y={P.y - 50 * Math.sin((90 - theta / 2) * deg) + 4} color={C.yellow} size={12.5}>
            θ
          </T>
          {showR === 1 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Arrow from={P} to={Q} color="weak" width={1.6} dash="3 4" />
              <Arrow from={Q} to={tip(R)} color="weak" width={1.6} dash="3 4" />
              <T x={Q.x + 10} y={Q.y + 14} color={C.text} size={12}>
                2(L·N)N
              </T>
              <T x={(Q.x + tip(R).x) / 2 + (L[0] > 0 ? -34 : 10)} y={(Q.y + tip(R).y) / 2} color={C.text} size={12}>
                −L
              </T>
            </motion.g>
          )}
          <Arrow from={P} to={tip(N)} color="blue" width={3} />
          <Arrow from={{ x: P.x + vOff, y: P.y }} to={{ x: vTip.x + vOff, y: vTip.y }} color="green" dash="7 4" />
          <Arrow from={P} to={tip(L)} color="yellow" width={3} />
          <Arrow from={P} to={tip(R)} color="red" width={3} />
          <Lamp x={tip(L, 1.25).x} y={tip(L, 1.25).y} />
          <Cam x={camPos.x} y={camPos.y} look={Math.atan2(P.y - camPos.y, P.x - camPos.x) / deg} />
          <circle cx={P.x} cy={P.y} r={4} fill={C.ink} />
          <T x={P.x - 4} y={P.y + 20} color={C.ink} anchor="end">
            P
          </T>
          <T x={tip(N).x + 14} y={tip(N).y + 22} color={C.blue} weight={600}>
            N
          </T>
          <T x={vTip.x + vOff - 10} y={vTip.y + (cam === "haut" ? 22 : -6)} color={C.green} weight={600} anchor="end">
            {cam === "haut" ? "V = N" : "V"}
          </T>
          <T x={tip(L).x + (L[0] >= 0 ? 10 : -10)} y={tip(L).y + 16} color={C.yellow} weight={600} anchor={L[0] >= 0 ? "start" : "end"}>
            L
          </T>
          <T x={tip(R).x + (R[0] >= 0 ? 10 : -10)} y={tip(R).y + 16} color={C.red} weight={600} anchor={R[0] >= 0 ? "start" : "end"}>
            R
          </T>
          {/* lecture des valeurs */}
          <T x={470} y={34} color={C.ink} size={14} weight={600}>
            phong = 0,1·{fr(A, 0)} + 0,7·{fr(D)} + 0,2·{fr(S)} = {fr(phong)}
          </T>
          <T x={470} y={58} color={C.text} size={12.5}>
            L·N = {fr(ln)}   R·V = {fr(rv)}   α = 8
          </T>
          <line x1={480} y1={100} x2={840} y2={100} stroke={C.line} strokeDasharray="3 4" />
          <T x={474} y={104} color={C.weak} size={12} anchor="end">
            1
          </T>
          <line x1={480} y1={300} x2={840} y2={300} stroke={C.lineStrong} />
          <T x={474} y={304} color={C.weak} size={12} anchor="end">
            0
          </T>
          {bars.map((bar, k) => {
            const x = 505 + k * 112;
            const h = 200 * bar.v;
            return (
              <g key={bar.name}>
                <rect x={x} y={100} width={74} height={200} fill={C.fill} />
                <rect
                  x={x}
                  y={r2(300 - h)}
                  width={74}
                  height={r2(h)}
                  fill={C[bar.color]}
                  fillOpacity={0.8}
                  stroke={bar.name === "Specular" && hit ? C.red : "none"}
                  strokeWidth={3}
                />
                <T x={x + 37} y={r2(300 - h) - 8} anchor="middle" color={C.ink} size={13}>
                  {fr(bar.v)}
                </T>
                <T x={x + 37} y={322} anchor="middle" color={C[bar.color]} size={13}>
                  {bar.name}
                </T>
              </g>
            );
          })}
          {hit && cam === "gauche" && (
            <text x={729 + 37} y={130} textAnchor="middle" fill={C.ink} fontSize={13} fontWeight={600}>
              R = V !
            </text>
          )}
        </svg>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider label="θ lumière (depuis N)" value={theta} min={-80} max={80} onChange={setTheta} format={(v) => `${v}°`} />
          </div>
          <Play onClick={() => tween(4200, (t) => setTheta(Math.round(-80 + 160 * ease(t))))}>faire tourner</Play>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. L'exemple du cours, calculé pas à pas

const EX_STEPS = [
  "Données : N = V = (0, 1, 0), L = (1, 1, 0)/√2",
  "Ambient = ia = 1",
  "Diffuse = max(L·N, 0) ≈ 0,71",
  "R = 2(L·N)N − L ≈ (−0,71 ; 0,71 ; 0)",
  "Specular = max(R·V, 0)^8 ≈ 0,06",
  "phong = ka·Ambient + kd·Diffuse + ks·Specular ≈ 0,61",
  "couleur du fragment = objet × phong",
];

function ExampleStepper() {
  return (
    <Stepper steps={EX_STEPS} interval={2600}>
      {(i) => {
        const P = { x: 150, y: 262 };
        const len = 100;
        const s2 = Math.SQRT1_2;
        const L = { x: P.x + len * s2, y: P.y - len * s2 };
        const R = { x: P.x - len * s2, y: P.y - len * s2 };
        const N = { x: P.x, y: P.y - len };
        const line = (k: number, y: number, color: string, text: ReactNode, w?: number) =>
          i >= k && (
            <motion.g key={`l${k}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
              <T x={330} y={y} color={color} size={14} weight={w}>
                {text}
              </T>
            </motion.g>
          );
        const powers = [
          ["α = 1", "0,71"],
          ["α = 2", "0,50"],
          ["α = 4", "0,25"],
          ["α = 8", "0,0625"],
        ];
        const seg = [
          { v: 0.1, color: C.purple },
          { v: 0.7 * Math.SQRT1_2, color: C.yellow },
          { v: 0.2 * 0.0625, color: C.red },
        ];
        const starts = [0, seg[0].v, seg[0].v + seg[1].v];
        return (
          <div>
            <svg viewBox="0 0 860 300" className="w-full max-w-[860px]" role="img" aria-label="Calcul pas à pas de l'exemple du cours">
              <ArrowMarkers />
              <line x1={40} y1={P.y} x2={270} y2={P.y} stroke={C.ink} strokeWidth={2} />
              {i === 2 && <path d={arc(P.x, P.y, 34, 45, 90)} fill="none" stroke={C.yellow} strokeWidth={2.5} />}
              {(i === 3 || i === 4) && <path d={arc(P.x, P.y, 34, 90, 135)} fill="none" stroke={C.red} strokeWidth={2.5} />}
              <Arrow from={P} to={N} color="blue" width={3} />
              <Arrow from={{ x: P.x - 7, y: P.y }} to={{ x: N.x - 7, y: N.y }} color="green" dash="7 4" />
              <Arrow from={P} to={L} color="yellow" width={3} />
              {i >= 3 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <Arrow from={P} to={R} color="red" width={3} />
                  <T x={R.x - 8} y={R.y + 4} color={C.red} anchor="end" weight={600}>
                    R
                  </T>
                </motion.g>
              )}
              <Lamp x={P.x + 1.25 * len * s2} y={P.y - 1.25 * len * s2} />
              <Cam x={P.x} y={P.y - 1.4 * len} look={90} />
              <circle cx={P.x} cy={P.y} r={4} fill={C.ink} />
              <T x={N.x + 14} y={N.y + 22} color={C.blue} weight={600}>
                N
              </T>
              <T x={N.x - 20} y={N.y + 22} color={C.green} weight={600} anchor="end">
                V
              </T>
              <T x={L.x + 8} y={L.y + 18} color={C.yellow} weight={600}>
                L
              </T>
              <T x={P.x} y={P.y + 22} anchor="middle" color={C.ink}>
                P
              </T>
              <T x={330} y={30} color={C.weak} size={13}>
                ia = 1   ka = 0,1   kd = 0,7   ks = 0,2   α = 8
              </T>
              {line(1, 64, C.purple, "Ambient = ia = 1")}
              {line(2, 94, C.yellow, "Diffuse = max(L·N, 0) = cos 45° ≈ 0,71")}
              {line(3, 124, C.red, "R = 2(L·N)N − L ≈ (−0,71 ; 0,71 ; 0)   R·V ≈ 0,71")}
              {line(4, 154, C.red, "Specular = max(R·V, 0)^8")}
              {i === 4 &&
                powers.map(([a, v], k) => (
                  <motion.g key={a} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + k * 0.45 }}>
                    <T x={330 + k * 128} y={182} color={k === 3 ? C.red : C.text} size={13} weight={k === 3 ? 600 : undefined}>
                      {`${a} : ${v}${k < 3 ? "  →" : ""}`}
                    </T>
                  </motion.g>
                ))}
              {i >= 5 && (
                <T x={330} y={182} color={C.text} size={13}>
                  0,71^8 = 0,0625 ≈ 0,06
                </T>
              )}
              {line(5, 216, C.ink, "phong = 1·0,1 + 0,71·0,7 + 0,06·0,2 ≈ 0,61", 600)}
              {i >= 5 && (
                <g>
                  <rect x={330} y={232} width={500} height={22} fill={C.fill} />
                  {seg.map((s, k) => (
                    <motion.rect
                      key={k}
                      x={r2(330 + 500 * starts[k])}
                      y={232}
                      height={22}
                      fill={s.color}
                      fillOpacity={0.85}
                      initial={{ width: 0 }}
                      animate={{ width: r2(500 * s.v) }}
                      transition={{ delay: 0.2 + k * 0.5, duration: 0.5 }}
                    />
                  ))}
                  <T x={330 + 25} y={272} anchor="middle" color={C.purple} size={12.5}>
                    0,10
                  </T>
                  <T x={330 + 50 + 124} y={272} anchor="middle" color={C.yellow} size={12.5}>
                    0,49
                  </T>
                  <T x={330 + 500 * 0.595 + 16} y={272} color={C.red} size={12.5}>
                    0,01 → total ≈ 0,61
                  </T>
                  <T x={830} y={272} anchor="end" color={C.weak} size={12}>
                    1
                  </T>
                </g>
              )}
            </svg>
            <div className="mt-2 flex min-h-9 flex-wrap items-center gap-3 font-mono text-[13px] text-fg">
              {i >= 6 && (
                <>
                  <Swatch rgb={[1, 0.5, 0.2]} label="objet (1 ; 0,5 ; 0,2)" />
                  <span>× 0,61 =</span>
                  <span className="inline-flex items-center gap-2">
                    <motion.span
                      className="inline-block h-7 w-7 border border-line"
                      initial={{ backgroundColor: "rgb(255, 128, 51)" }}
                      animate={{ backgroundColor: "rgb(155, 78, 31)" }}
                      transition={{ duration: 1.4 }}
                    />
                    <span>fragment ≈ (0,61 ; 0,30 ; 0,12)</span>
                  </span>
                </>
              )}
            </div>
          </div>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 4. La brillance α

const LV = normalize([0.3, 0.3, 1]);
const WHITE: V3 = [1, 1, 1];
const GREY_BASE: V3 = [0.17, 0.17, 0.2];

function LobeFig() {
  const [v, setV] = useState(0);
  const alpha = 2 ** v;
  const X = (phi: number) => 60 + ((phi + 90) / 180) * 500;
  const Y = (s: number) => 232 - s * 190;
  const pts = Array.from({ length: 181 }, (_, k) => {
    const phi = k - 90;
    return `${r2(X(phi))},${r2(Y(Math.max(Math.cos(phi * deg), 0) ** alpha))}`;
  });
  const v45 = Math.cos(45 * deg) ** alpha;
  const quick = v === 0 ? 1 : v === 3 ? 8 : v === 6 ? 64 : 0;
  return (
    <Figure caption="Specular = max(cos φ, 0)^α, avec φ l'angle entre R et V. Le pic reste à 1, mais il se resserre quand α grandit : reflet plus petit et plus net. À 45° : 0,71 pour α = 1, 0,06 pour α = 8, presque 0 pour α = 64.">
      <div className="space-y-3">
        <Choice
          label="α"
          options={[
            { value: 1, label: "1" },
            { value: 8, label: "8" },
            { value: 64, label: "64" },
          ]}
          value={quick}
          onChange={(a) => setV(Math.log2(a))}
        />
        <div className="flex flex-wrap items-center gap-6">
          <svg viewBox="0 0 600 280" className="w-full max-w-[600px] flex-1" role="img" aria-label="Courbe du terme spéculaire en fonction de l'angle entre R et V">
            <path d={`M ${X(-90)} ${Y(0)} L ${pts.join(" L ")} L ${X(90)} ${Y(0)} Z`} fill={C.red} fillOpacity={0.12} />
            <polyline points={pts.join(" ")} fill="none" stroke={C.red} strokeWidth={2.5} />
            <line x1={60} y1={232} x2={565} y2={232} stroke={C.lineStrong} />
            <line x1={60} y1={32} x2={60} y2={232} stroke={C.lineStrong} />
            {[-90, -45, 0, 45, 90].map((p) => (
              <g key={p}>
                <line x1={X(p)} y1={232} x2={X(p)} y2={237} stroke={C.lineStrong} />
                <T x={X(p)} y={252} anchor="middle" color={C.weak} size={12}>
                  {`${p < 0 ? "−" : ""}${Math.abs(p)}°`}
                </T>
              </g>
            ))}
            {[0, 0.5, 1].map((s) => (
              <T key={s} x={52} y={Y(s) + 4} anchor="end" color={C.weak} size={12}>
                {fr(s, s === 0.5 ? 1 : 0)}
              </T>
            ))}
            <T x={310} y={274} anchor="middle" color={C.text} size={12.5}>
              φ = angle entre R et V
            </T>
            <T x={66} y={24} color={C.text} size={12.5}>
              Specular
            </T>
            <line x1={X(45)} y1={32} x2={X(45)} y2={232} stroke={C.weak} strokeDasharray="4 4" />
            <circle cx={X(45)} cy={r2(Y(v45))} r={5} fill={C.ink} />
            <T x={565} y={48} anchor="end" color={C.ink} size={13}>
              {`cos(45°)^α = ${small(v45)}`}
            </T>
            <T x={565} y={24} anchor="end" color={C.ink} size={14} weight={600}>
              {`α = ${fr(alpha, alpha < 10 ? 1 : 0)}`}
            </T>
          </svg>
          <div className="flex flex-col items-center gap-2 font-mono text-[12.5px] text-fg-weak">
            <PhongCanvas ka={0} kd={0} ks={1} alpha={alpha} L={LV} V={LV} color={WHITE} base={GREY_BASE} size={160} />
            <span>même α sur une sphère</span>
          </div>
        </div>
        <Slider label="α (échelle log)" value={v} min={0} max={6} step={0.05} onChange={setV} format={(x) => fr(2 ** x, 2 ** x < 10 ? 1 : 0)} />
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 5. La sphère complète : ka, kd, ks, α et la lumière

type Preset = { label: string; color: V3; ka: number; kd: number; ks: number; v: number };
type PresetKey = "cours" | "metal" | "laine";
const PRESETS: Record<PresetKey, Preset> = {
  cours: { label: "exemple du cours", color: [1, 0.5, 0.2], ka: 0.1, kd: 0.7, ks: 0.2, v: 3 },
  metal: { label: "métal poli", color: [0.6, 0.6, 0.65], ka: 0.1, kd: 0.3, ks: 0.9, v: 6 },
  laine: { label: "laine", color: [0.8, 0.2, 0.2], ka: 0.1, kd: 0.9, ks: 0, v: 3 },
};
const PRESET_KEYS: PresetKey[] = ["cours", "metal", "laine"];
const V_FRONT: V3 = [0, 0, 1];

function SphereFig() {
  const [preset, setPreset] = useState<string>("cours");
  const [color, setColor] = useState<V3>(PRESETS.cours.color);
  const [ka, setKa] = useState(0.1);
  const [kd, setKd] = useState(0.7);
  const [ks, setKs] = useState(0.2);
  const [v, setV] = useState(3);
  const [t, setT] = useState(135);
  const tween = useTween();
  const alpha = 2 ** v;
  const L = normalize([Math.cos(t * deg), Math.sin(t * deg), 1]);
  const apply = (k: string) => {
    const p = PRESETS[k as PresetKey];
    if (!p) return;
    setPreset(k);
    setColor(p.color);
    setKa(p.ka);
    setKd(p.kd);
    setKs(p.ks);
    setV(p.v);
  };
  const perso = (f: (x: number) => void) => (x: number) => {
    setPreset("perso");
    f(x);
  };
  const cell = (label: string, term: Term, marker = false) => (
    <div className="flex flex-col items-center gap-1.5">
      <PhongCanvas ka={ka} kd={kd} ks={ks} alpha={alpha} L={L} V={V_FRONT} color={color} term={term} size={140} marker={marker} />
      <span className="font-mono text-[12.5px] text-fg-weak">{label}</span>
    </div>
  );
  const op = (s: string) => <span className="pb-6 font-mono text-[20px] text-fg-weak">{s}</span>;
  return (
    <Figure caption="Rendu par pixel : N = (x, y, √(1 − x² − y²)), V = (0, 0, 1), L = normalize(cos t, sin t, 1), puis couleur = objet × phong (bornée à 1). Le point jaune indique d'où vient la lumière. Métal : petit reflet net qui suit la lumière ; laine (ks = 0) : aucun reflet.">
      <div className="space-y-4">
        <Choice
          label="Matériau"
          options={PRESET_KEYS.map((k) => ({ value: k as string, label: PRESETS[k].label }))}
          value={preset}
          onChange={apply}
        />
        <div className="flex flex-wrap items-end gap-3">
          {cell("ambiant ka·ia", "ambient")}
          {op("+")}
          {cell("diffus kd·(L·N)", "diffuse")}
          {op("+")}
          {cell("spéculaire ks·(R·V)^α", "specular")}
          {op("=")}
          {cell("couleur finale", "total", true)}
        </div>
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Slider label="ka (ambiant)" value={ka} min={0} max={1} step={0.05} onChange={perso(setKa)} format={(x) => fr(x)} />
          <Slider label="kd (diffus)" value={kd} min={0} max={1} step={0.05} onChange={perso(setKd)} format={(x) => fr(x)} />
          <Slider label="ks (spéculaire)" value={ks} min={0} max={1} step={0.05} onChange={perso(setKs)} format={(x) => fr(x)} />
          <Slider label="α (brillance)" value={v} min={0} max={7} step={0.1} onChange={perso(setV)} format={(x) => fr(2 ** x, 2 ** x < 10 ? 1 : 0)} />
          <Slider label="Lumière (angle t)" value={t} min={0} max={360} onChange={setT} format={(x) => `${x}°`} />
          <div>
            <Play onClick={() => tween(5000, (u) => setT(Math.round((135 + 360 * u) % 360)))}>faire tourner la lumière</Play>
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. La normale sous une échelle non uniforme

function NormalStretchFig() {
  const [s, setS] = useState(2);
  const tween = useTween();
  const O = { x: 150, y: 250 };
  const U = 130;
  const len = 95;
  const toS = (x: number, y: number) => ({ x: O.x + U * x, y: O.y - U * y });
  const end = toS(s, 1);
  const M = toS(s / 2, 0.5);
  const tl = Math.hypot(s, 1);
  const tHat = { x: s / tl, y: 1 / tl };
  const nr = { x: -s / Math.hypot(s, 1), y: 1 / Math.hypot(s, 1) };
  const ng = { x: -1 / s / Math.hypot(1 / s, 1), y: 1 / Math.hypot(1 / s, 1) };
  const ang = (n: P2) => Math.acos(n.x * tHat.x + n.y * tHat.y) / deg;
  const tipR = { x: M.x + len * nr.x, y: M.y - len * nr.y };
  const tipG = { x: M.x + len * ng.x, y: M.y - len * ng.y };
  const q = 11;
  const sq = [
    { x: M.x + q * tHat.x, y: M.y - q * tHat.y },
    { x: M.x + q * tHat.x + q * ng.x, y: M.y - q * tHat.y - q * ng.y },
    { x: M.x + q * ng.x, y: M.y - q * ng.y },
  ];
  return (
    <Figure caption="Segment de (0, 0) à (1, 1), normale n = normalize(−1, 1), puis model = diag(s, 1, 1). À s = 2 : model·n fait environ 126,9° avec la surface (faux), model^(−T)·n reste à 90° (juste).">
      <div className="space-y-3">
        <svg viewBox="0 0 860 290" className="w-full max-w-[860px]" role="img" aria-label="Normale transformée par model et par l'inverse transposée de model">
          <ArrowMarkers />
          <line x1={O.x - 20} y1={O.y} x2={O.x + 2.15 * U} y2={O.y} stroke={C.line} />
          <line x1={O.x} y1={O.y + 20} x2={O.x} y2={O.y - 1.6 * U} stroke={C.line} />
          {s > 1.01 && (
            <line x1={O.x} y1={O.y} x2={toS(1, 1).x} y2={toS(1, 1).y} stroke={C.weak} strokeWidth={1.5} strokeDasharray="4 4" />
          )}
          <line x1={O.x} y1={O.y} x2={r2(end.x)} y2={r2(end.y)} stroke={C.ink} strokeWidth={3} />
          <polyline
            points={`${r2(sq[0].x)},${r2(sq[0].y)} ${r2(sq[1].x)},${r2(sq[1].y)} ${r2(sq[2].x)},${r2(sq[2].y)}`}
            fill="none"
            stroke={C.green}
            strokeWidth={1.5}
          />
          <Arrow from={M} to={tipR} color="red" width={3} />
          <Arrow from={M} to={tipG} color="green" width={3} />
          <T x={tipR.x - 8} y={tipR.y + 16} anchor="end" color={C.red} size={13} weight={600}>
            model·n
          </T>
          <T x={tipG.x - 6} y={tipG.y - 8} anchor="end" color={C.green} size={13} weight={600}>
            model^(−T)·n
          </T>
          <T x={end.x + 8} y={end.y - 6} color={C.ink} size={12.5}>
            surface étirée
          </T>
          <T x={520} y={60} color={C.ink} size={14} weight={600}>
            {`model = diag(${fr(s)} ; 1 ; 1)`}
          </T>
          <T x={520} y={86} color={C.text} size={13}>
            {`model^(−T) = diag(${fr(1 / s)} ; 1 ; 1)`}
          </T>
          <T x={520} y={130} color={C.text} size={13}>
            angle avec la surface :
          </T>
          <T x={520} y={158} color={C.red} size={14}>
            {`model·n : ${fr(ang(nr), 1)}°`}
          </T>
          <T x={520} y={184} color={C.green} size={14}>
            {`model^(−T)·n : ${fr(ang(ng), 1)}°`}
          </T>
          <T x={520} y={226} color={C.weak} size={12.5}>
            puis on normalise :
          </T>
          <T x={520} y={248} color={C.weak} size={12.5}>
            N = normalize(model^(−T)·n)
          </T>
        </svg>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider label="Étirement s en x" value={s} min={1} max={2} step={0.01} onChange={setS} format={(x) => fr(x)} />
          </div>
          <Play onClick={() => tween(2600, (u) => setS(Math.round((1 + ease(u)) * 100) / 100))}>étirer</Play>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 7. Interpolation barycentrique des normales

const IU = 60;
const IC = { x: 300, y: 215 };
const ipt = (x: number, y: number) => ({ x: IC.x + IU * x, y: IC.y - IU * y });
const IA = ipt(-3, -1.5);
const IB = ipt(3, -1.5);
const ICv = ipt(0, 2);
const INORM: [number, number][] = [
  [-0.6, 0.8],
  [0.6, 0.8],
  [0, 1],
];
const IPATH: W3[] = [
  [1 / 3, 1 / 3, 1 / 3],
  [0.8, 0.1, 0.1],
  [0.1, 0.1, 0.8],
  [0.1, 0.8, 0.1],
  [1 / 3, 1 / 3, 1 / 3],
];
/** Pixels (carrés de 18 px) dont le centre est dans le triangle : décor « fragments ». */
const IPIX: P2[] = (() => {
  const out: P2[] = [];
  const d = (IB.y - ICv.y) * (IA.x - ICv.x) + (ICv.x - IB.x) * (IA.y - ICv.y);
  for (let y = 95; y < 305; y += 18)
    for (let x = 120; x < 480; x += 18) {
      const c = { x: x + 9, y: y + 9 };
      const wa = ((IB.y - ICv.y) * (c.x - ICv.x) + (ICv.x - IB.x) * (c.y - ICv.y)) / d;
      const wb = ((ICv.y - IA.y) * (c.x - ICv.x) + (IA.x - ICv.x) * (c.y - ICv.y)) / d;
      if (wa >= 0 && wb >= 0 && 1 - wa - wb >= 0) out.push({ x, y });
    }
  return out;
})();

function InterpFig() {
  const [w, setW] = useState<W3>([1 / 3, 1 / 3, 1 / 3]);
  const tween = useTween();
  const verts = [IA, IB, ICv];
  const P = { x: w[0] * IA.x + w[1] * IB.x + w[2] * ICv.x, y: w[0] * IA.y + w[1] * IB.y + w[2] * ICv.y };
  const n = [0, 1].map((k) => w[0] * INORM[0][k] + w[1] * INORM[1][k] + w[2] * INORM[2][k]);
  const nl = Math.hypot(n[0], n[1]);
  const R = 72;
  const big = Math.max(...w) > 0.4 ? w.indexOf(Math.max(...w)) : -1;
  const onPtr = (e: RPointerEvent<SVGSVGElement>) => {
    const p = svgPoint(e);
    if (p) setW(bary(p, IA, IB, ICv));
  };
  const names = ["A", "B", "C"];
  return (
    <Figure caption="Survoler (ou toucher) le triangle pour déplacer le fragment P. N_P = λA·N_A + λB·N_B + λC·N_C tourne vers la normale du sommet le plus proche. Ce mélange est plus court qu'un vecteur unitaire (‖N_P‖ ≈ 0,87 au centre) : le fragment shader le renormalise.">
      <div className="space-y-3">
        <svg
          viewBox="0 0 760 340"
          className="w-full max-w-[760px] cursor-crosshair"
          role="img"
          aria-label="Interpolation barycentrique des normales dans un triangle"
          onPointerMove={onPtr}
          onPointerDown={onPtr}
        >
          <ArrowMarkers />
          {IPIX.map((p) => (
            <rect key={`${p.x}-${p.y}`} x={p.x + 1} y={p.y + 1} width={16} height={16} fill={C.fill2} />
          ))}
          <polygon points={`${IA.x},${IA.y} ${IB.x},${IB.y} ${ICv.x},${ICv.y}`} fill="none" stroke={C.ink} strokeWidth={2} />
          {verts.map((v, k) => (
            <g key={k}>
              <Arrow from={v} to={{ x: v.x + R * INORM[k][0], y: v.y - R * INORM[k][1] }} color="blue" width={2.5} />
              <circle cx={v.x} cy={v.y} r={k === big ? 8 : 5} fill={k === big ? C.yellow : C.ink} />
              <T
                x={v.x + (k === 0 ? -12 : k === 1 ? 12 : 14)}
                y={v.y + (k === 2 ? 4 : 22)}
                anchor={k === 0 ? "end" : "start"}
                color={C.ink}
                weight={600}
              >
                {`${names[k]}  λ${names[k]} = ${fr(w[k])}`}
              </T>
            </g>
          ))}
          <circle cx={r2(P.x)} cy={r2(P.y)} r={R} fill="none" stroke={C.weak} strokeDasharray="3 4" />
          <Arrow from={P} to={{ x: P.x + (R * n[0]) / nl, y: P.y - (R * n[1]) / nl }} color="blue" width={3} />
          <Arrow from={P} to={{ x: P.x + R * n[0], y: P.y - R * n[1] }} color="orange" width={3} />
          <circle cx={r2(P.x)} cy={r2(P.y)} r={5} fill={C.red} />
          <T x={P.x + 9} y={P.y + 18} color={C.red} weight={600}>
            P
          </T>
          <T x={560} y={50} color={C.ink} size={13.5} weight={600}>
            N_P = Σ λ·N_sommet
          </T>
          <T x={560} y={80} color={C.orange} size={13}>
            {`‖N_P‖ = ${fr(nl)}`}
          </T>
          <T x={560} y={104} color={C.weak} size={12}>
            (interpolée, trop courte)
          </T>
          <T x={560} y={136} color={C.blue} size={13}>
            normalize(N_P)
          </T>
          <T x={560} y={158} color={C.weak} size={12}>
            (norme 1)
          </T>
          <T x={560} y={192} color={C.weak} size={12}>
            pointillés : norme 1
          </T>
        </svg>
        <Play onClick={() => tween(5200, (u) => setW(alongPath(IPATH, u)))}>parcourir A → C → B</Play>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 8. Les textures : UV interpolés, lecture de la texture

const TU = 70;
const tpt = (x: number, y: number) => ({ x: 380 + TU * x, y: 225 - TU * y });
const TA = tpt(-5, -1.5);
const TB = tpt(-1, -1.5);
const TC = tpt(-3, 2);
const UV: [number, number][] = [
  [0, 0],
  [1, 0],
  [0.5, 1],
];
const TEX = { x: 500, y: 70, s: 240 };
const uvToTex = (u: number, v: number) => ({ x: TEX.x + u * TEX.s, y: TEX.y + (1 - v) * TEX.s });
const TPATH: W3[] = [
  [0.6, 0.3, 0.1],
  [0.1, 0.3, 0.6],
  [0.2, 0.7, 0.1],
];
const ORANGE: V3 = [1, 0.5, 0.2];
const CREAM: V3 = [1, 0.9, 0.7];
const PHONG_EX = 0.1 * 1 + 0.7 * Math.SQRT1_2 + 0.2 * 0.0625;

function TextureFig() {
  const [w, setW] = useState<W3>([0.6, 0.3, 0.1]);
  const tween = useTween();
  const P = { x: w[0] * TA.x + w[1] * TB.x + w[2] * TC.x, y: w[0] * TA.y + w[1] * TB.y + w[2] * TC.y };
  const u = w[0] * UV[0][0] + w[1] * UV[1][0] + w[2] * UV[2][0];
  const v = w[0] * UV[0][1] + w[1] * UV[1][1] + w[2] * UV[2][1];
  const col = Math.min(Math.floor(u * 4), 3);
  const row = Math.min(Math.floor(v * 4), 3);
  const isOrange = (row + col) % 2 === 0;
  const texel = isOrange ? ORANGE : CREAM;
  const frag: V3 = [texel[0] * PHONG_EX, texel[1] * PHONG_EX, texel[2] * PHONG_EX];
  const tp = uvToTex(u, v);
  const onPtr = (e: RPointerEvent<SVGSVGElement>) => {
    const p = svgPoint(e);
    if (p && p.x < 440) setW(bary(p, TA, TB, TC));
  };
  const uvA = uvToTex(0, 0);
  const uvB = uvToTex(1, 0);
  const uvC = uvToTex(0.5, 1);
  return (
    <Figure caption="Chaque sommet porte des coordonnées UV dans [0, 1]. Le rasterizer interpole les UV avec les poids barycentriques ; le fragment shader lit la texture à ces UV (texel le plus proche : col = min(⌊4u⌋, 3), ligne = min(⌊4v⌋, 3)) et multiplie par phong ≈ 0,61.">
      <div className="space-y-3">
        <svg
          viewBox="0 0 800 368"
          className="w-full max-w-[800px] cursor-crosshair"
          role="img"
          aria-label="Triangle avec coordonnées UV et texture 4 par 4"
          onPointerMove={onPtr}
          onPointerDown={onPtr}
        >
          <polygon points={`${TA.x},${TA.y} ${TB.x},${TB.y} ${TC.x},${TC.y}`} fill={C.fill} stroke={C.ink} strokeWidth={2} />
          <T x={TA.x} y={TA.y + 20} color={C.ink} size={12.5}>
            A uv = (0, 0)
          </T>
          <T x={TB.x} y={TB.y + 20} anchor="end" color={C.ink} size={12.5}>
            B uv = (1, 0)
          </T>
          <T x={TC.x} y={TC.y - 12} anchor="middle" color={C.ink} size={12.5}>
            C uv = (0,5 ; 1)
          </T>
          <circle cx={r2(P.x)} cy={r2(P.y)} r={6} fill={C.red} />
          <T x={P.x + 10} y={P.y - 8} color={C.red} weight={600}>
            P
          </T>
          {/* texture 4 × 4, ligne 0 en bas (v = 0) */}
          {Array.from({ length: 16 }, (_, k) => {
            const r = Math.floor(k / 4);
            const c = k % 4;
            const orange = (r + c) % 2 === 0;
            const sel = r === row && c === col;
            return (
              <rect
                key={k}
                x={TEX.x + c * 60}
                y={TEX.y + (3 - r) * 60}
                width={60}
                height={60}
                fill={orange ? C.orange : C.yellow}
                fillOpacity={orange ? 0.8 : 0.4}
                stroke={sel ? C.ink : C.line}
                strokeWidth={sel ? 3 : 1}
              />
            );
          })}
          <polygon points={`${uvA.x},${uvA.y} ${uvB.x},${uvB.y} ${uvC.x},${uvC.y}`} fill="none" stroke={C.ink} strokeWidth={1.8} strokeDasharray="6 4" />
          <T x={uvA.x - 8} y={uvA.y + 4} anchor="end" color={C.ink} size={12.5}>
            A
          </T>
          <T x={uvB.x + 8} y={uvB.y + 4} color={C.ink} size={12.5}>
            B
          </T>
          <T x={uvC.x} y={uvC.y - 8} anchor="middle" color={C.ink} size={12.5}>
            C
          </T>
          <circle cx={r2(tp.x)} cy={r2(tp.y)} r={7} fill="none" stroke={C.red} strokeWidth={3} />
          <T x={TEX.x} y={TEX.y + TEX.s + 20} anchor="middle" color={C.weak} size={12}>
            0
          </T>
          <T x={TEX.x + TEX.s} y={TEX.y + TEX.s + 20} anchor="middle" color={C.weak} size={12}>
            1
          </T>
          <T x={TEX.x + TEX.s / 2} y={TEX.y + TEX.s + 22} anchor="middle" color={C.text} size={13}>
            u
          </T>
          <T x={TEX.x - 10} y={TEX.y + 10} anchor="end" color={C.weak} size={12}>
            1
          </T>
          <T x={TEX.x - 12} y={TEX.y + TEX.s / 2} anchor="end" color={C.text} size={13}>
            v
          </T>
          <T x={TEX.x + TEX.s / 2} y={TEX.y - 30} anchor="middle" color={C.text} size={13}>
            texture 4 × 4 (image 2D)
          </T>
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] text-fg">
          <span>
            λ = ({fr(w[0])} ; {fr(w[1])} ; {fr(w[2])})
          </span>
          <span className="text-fg-weak">→</span>
          <span>
            uv = ({fr(u)} ; {fr(v)})
          </span>
          <span className="text-fg-weak">→</span>
          <span>
            texel ligne {row}, colonne {col}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[13px] text-fg">
          <Swatch rgb={texel} label={isOrange ? "orange (1 ; 0,5 ; 0,2)" : "crème (1 ; 0,9 ; 0,7)"} />
          <span>× phong {fr(PHONG_EX)} =</span>
          <Swatch rgb={frag} label={`fragment (${fr(frag[0])} ; ${fr(frag[1])} ; ${fr(frag[2])})`} />
        </div>
        <Play onClick={() => tween(4200, (t) => setW(alongPath(TPATH, t)))}>faire glisser P</Play>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------

const VERTEX = `
// Vertex shader : prépare N, L, V pour chaque sommet
in vec3 v;            // position du sommet (repère objet)
in vec3 n;            // normale du sommet
in vec2 texCoord;     // coordonnées UV
uniform mat4 model, view, projection;
uniform vec3 cameraPos, lightPos;
out vec3 N, L, V;
out vec2 uv;

void main() {
    vec3 p = (model * vec4(v, 1.0)).xyz;   // model·v
    V = cameraPos - p;
    L = lightPos - p;
    N = normalize(mat3(transpose(inverse(model))) * n);   // model^(-T)·n
    uv = texCoord;
    gl_Position = projection * view * model * vec4(v, 1.0);
}`;

const FRAGMENT = `
// Fragment shader : N, L, V, uv arrivent interpolés par le rasterizer
in vec3 N, L, V;
in vec2 uv;
uniform sampler2D tex;
uniform float ia, ka, kd, ks, alpha;
out vec4 fragColor;

void main() {
    vec3 n = normalize(N);          // renormaliser : l'interpolation raccourcit
    vec3 l = normalize(L);
    vec3 v = normalize(V);
    vec3 r = 2.0 * dot(l, n) * n - l;

    float ambient  = ia;
    float diffuse  = max(dot(l, n), 0.0);
    float specular = pow(max(dot(r, v), 0.0), alpha);
    float phong = ambient * ka + diffuse * kd + specular * ks;

    vec3 objet = texture(tex, uv).rgb;   // couleur de l'objet
    fragColor = vec4(objet * phong, 1.0);
}`;

export default function Phong() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Couleur d'un pixel = couleur de l'objet × phong, avec phong = ambiant + diffus + spéculaire, pondérés par ka, kd, ks.
        </Idea>
        <p>
          Le <strong>spéculaire</strong> est le reflet d'une surface lisse : il suit la caméra (métal poli).
        </p>
        <p>
          Le <strong>diffus</strong> est la lumière d'une surface rugueuse : la même partout (laine).
        </p>
        <p>
          L'<strong>ambiant</strong> est une constante : il remplace les rebonds multiples, trop coûteux.
        </p>
      </Section>

      <Section title="Spéculaire, diffus, ambiant">
        <p>Une caméra se déplace sur un arc au-dessus d'un point éclairé. Sa couleur montre la lumière qu'elle reçoit.</p>
        <SurfaceFig />
      </Section>

      <Section title="Les quatre vecteurs N, L, V, R">
        <p>
          Au point éclairé, quatre vecteurs <strong>normalisés</strong> : <Tagged c="blue">N</Tagged> la normale,{" "}
          <Tagged c="yellow">L</Tagged> vers la lumière, <Tagged c="green">V</Tagged> vers la caméra,{" "}
          <Tagged c="red">R</Tagged> la direction réfléchie.
        </p>
        <p>R = 2·(L·N)·N − L : c'est le miroir de L autour de N.</p>
        <VectorsFig />
        <p>L'exemple du cours, calculé terme par terme :</p>
        <ExampleStepper />
      </Section>

      <Section title="La brillance α et la sphère complète">
        <p>α règle la largeur du reflet. Grand α : reflet petit et net, la surface paraît plus lisse.</p>
        <LobeFig />
        <p>Les trois termes s'additionnent. Choisir un matériau du cours, puis bouger les curseurs.</p>
        <SphereFig />
      </Section>

      <Section title="Du sommet au fragment : normales et textures">
        <p>
          Le <strong>vertex shader</strong> calcule par sommet : V = cameraPos − model·v, L = lightPos − model·v, N =
          normalize(model^(−T)·n).
        </p>
        <p>Pourquoi l'inverse transposée ? Après une échelle non uniforme, model·n n'est plus perpendiculaire à la surface.</p>
        <NormalStretchFig />
        <p>
          Le <strong>rasterizer</strong> interpole ces attributs avec les coordonnées barycentriques. Le{" "}
          <strong>fragment shader</strong> renormalise, puis applique Phong.
        </p>
        <InterpFig />
        <p>
          La couleur de l'objet vient souvent d'une <strong>texture</strong> : une image 2D lue aux coordonnées UV interpolées.
        </p>
        <TextureFig />
      </Section>

      <Section title="Les formules et le code à connaître">
        <Formula>
          <div className="space-y-1.5">
            <div>Ambient = ia</div>
            <div>Diffuse = max(dot(L, N), 0)</div>
            <div>Specular = max(dot(R, V), 0)^α   avec   R = 2·dot(L, N)·N − L</div>
            <div>phong = Ambient·ka + Diffuse·kd + Specular·ks</div>
            <div className="pt-1 text-fg-strong">couleur du fragment = couleur de l'objet × phong</div>
          </div>
        </Formula>
        <Code lang="glsl" mark={[11, 12, 13, 14]} code={VERTEX} />
        <Code lang="glsl" mark={[9, 12, 14, 15, 16, 17, 19]} code={FRAGMENT} />
        <Note title="Lecture">
          <p>Formules et noms (ia, ka, kd, ks, α) du cours ; le squelette GLSL autour est un exemple type.</p>
          <p>
            GLSL fournit aussi <code>reflect(-l, n)</code>, qui donne le même R.
          </p>
        </Note>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Tous les vecteurs sont normalisés : N normale, L vers la lumière, V vers la caméra, R = 2(L·N)N − L.</li>
          <li>Ambiant = ia, constant : il remplace l'éclairage indirect (plusieurs rebonds).</li>
          <li>Diffus = max(L·N, 0) : ne dépend pas de la caméra (laine).</li>
          <li>Spéculaire = max(R·V, 0)^α : maximal quand R = V, il suit la caméra (métal poli).</li>
          <li>α = brillance : à 45°, 0,71 pour α = 1, 0,06 pour α = 8, presque 0 pour α = 64.</li>
          <li>
            Vertex shader : V, L et N = normalize(model^(−T)·n). Rasterizer : interpolation barycentrique. Fragment shader :
            renormaliser, Phong, texture.
          </li>
          <li>Texture : image 2D, UV dans [0, 1] par sommet, interpolés, puis couleur de l'objet = texture(uv).</li>
        </Points>
        <Trap>
          <p>
            Transformer la normale par <code>model</code> : faux dès que l'échelle n'est pas uniforme. Étirée ×2 en x, model·n
            fait environ 127° avec la surface au lieu de 90°. Il faut model^(−T)·n, puis normaliser.
          </p>
        </Trap>
        <Trap title="Piège : la normale interpolée">
          <p>
            Un mélange de vecteurs unitaires est plus court qu'un vecteur unitaire (‖N_P‖ ≈ 0,87 au centre de l'exemple). Sans
            normalize dans le fragment shader, l'éclairage est faussé.
          </p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal
          question={
            <p>
              N = V = (0, 1, 0), lumière dans la direction (1, 1, 0) normalisée, ia = 1, ka = 0,1, kd = 0,7, ks = 0,2, α = 8.
              Calculer R, les trois termes et phong.
            </p>
          }
        >
          <p>L = (0,71 ; 0,71 ; 0), donc L·N ≈ 0,71.</p>
          <p>R = 2·0,71·(0, 1, 0) − L ≈ (−0,71 ; 0,71 ; 0), donc R·V ≈ 0,71.</p>
          <p>Ambient = 1 ; Diffuse ≈ 0,71 ; Specular = 0,71^8 = 0,0625.</p>
          <p>phong = 1·0,1 + 0,71·0,7 + 0,0625·0,2 ≈ 0,10 + 0,49 + 0,01 ≈ 0,61.</p>
          <p>Couleur du fragment = couleur de l'objet × 0,61.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              La caméra passe en haut à gauche : V = normalize(−1, 1, 0). La lumière fait un angle θ avec N. Pour quel θ le
              spéculaire est-il maximal ? Que se passe-t-il pour le diffus ?
            </p>
          }
        >
          <p>L = (sin θ, cos θ, 0) et R = (−sin θ, cos θ, 0), le miroir de L.</p>
          <p>R = V quand θ = 45° : Specular = 1. À θ = 0 il vaut 0,0625 ; à θ = −80°, R·V &lt; 0 donc 0.</p>
          <p>Le diffus ne dépend pas de V : il vaut cos θ, maximal à θ = 0, quelle que soit la caméra.</p>
          <p>C'est pourquoi le reflet du métal suit les yeux, et pas la couleur de la laine.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              L'objet est étiré ×2 en x et l'éclairage devient faux. Le vertex shader contient{" "}
              <code>N = normalize(mat3(model) * n)</code>. Pourquoi, et comment corriger ?
            </p>
          }
        >
          <p>Une échelle non uniforme ne préserve pas les angles : model·n n'est plus perpendiculaire à la surface (≈ 127° au lieu de 90°).</p>
          <p>
            Il faut l'inverse transposée : <code>N = normalize(mat3(transpose(inverse(model))) * n)</code>.
          </p>
          <p>Et dans le fragment shader, renormaliser N après interpolation.</p>
        </Reveal>
      </Section>
    </>
  );
}
