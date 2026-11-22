"use client";
// Fiche : marching squares puis marching cubes (CM7 et TP marching squares).
// Exemple du cours : grille 3 × 3 [[1, 3, 2], [4, 8, 6], [2, 7, 3]] (lignes de
// haut en bas), niveau c = 5. Nœud (x, y) : x vers la droite, y vers le haut.
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "../kit";

// ---------------------------------------------------------------------------
// Calcul : marching squares sur une cellule et sur une grille
// ---------------------------------------------------------------------------

type Pt = readonly [number, number];
type Seg = readonly [Pt, Pt];
/** Règle des cas ambigus : "mean" = moyenne des 4 valeurs (cours), "isolate" = toujours isoler les ⊕ (code du TP). */
type Rule = "mean" | "isolate";

const fr = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
const f1 = (n: number) => n.toFixed(1);

const GRID: readonly (readonly number[])[] = [
  [1, 3, 2],
  [4, 8, 6],
  [2, 7, 3],
];
/** f(x, y) = GRID[2 − y][x] */
const gv = (x: number, y: number) => GRID[2 - y][x];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];

/** Arête k : de P_k à P_(k+1) (l'arête 3 va de P3 à P0). Point où f = c, ou null si l'arête n'est pas traversée. */
function cellCuts(p: readonly Pt[], v: readonly number[], c: number): (Pt | null)[] {
  return [0, 1, 2, 3].map((k) => {
    const k1 = (k + 1) % 4;
    if (v[k] > c === v[k1] > c) return null;
    return lerp(p[k], p[k1], (c - v[k]) / (v[k1] - v[k]));
  });
}

function cellSegs(p: readonly Pt[], v: readonly number[], c: number, rule: Rule = "mean"): Seg[] {
  const q = cellCuts(p, v, c);
  const pts = q.filter((x): x is Pt => x !== null);
  if (pts.length === 2) return [[pts[0], pts[1]]];
  const [e0, e1, e2, e3] = q;
  if (e0 && e1 && e2 && e3) {
    const centerPlus = rule === "mean" && (v[0] + v[1] + v[2] + v[3]) / 4 > c;
    // centre ⊖ : on isole les coins ⊕ ; centre ⊕ : on isole les coins ⊖.
    const isolateP0P2 = centerPlus ? !(v[0] > c) : v[0] > c;
    return isolateP0P2
      ? [
          [e0, e3],
          [e1, e2],
        ]
      : [
          [e0, e1],
          [e2, e3],
        ];
  }
  return [];
}

const cellIndex = (v: readonly number[], c: number) => v.reduce((s, x, k) => s + (x > c ? 1 << k : 0), 0);
const bin = (n: number, w = 4) => n.toString(2).padStart(w, "0");

/** Marching squares sur une grille n × n de [lo, hi]². */
function march(n: number, lo: number, hi: number, f: (x: number, y: number) => number, c: number, rule: Rule = "mean"): Seg[] {
  const xs = Array.from({ length: n }, (_, k) => lo + ((hi - lo) * k) / (n - 1));
  const vals = xs.map((y) => xs.map((x) => f(x, y)));
  const out: Seg[] = [];
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const p: Pt[] = [
        [xs[i], xs[j]],
        [xs[i + 1], xs[j]],
        [xs[i + 1], xs[j + 1]],
        [xs[i], xs[j + 1]],
      ];
      const v = [vals[j][i], vals[j][i + 1], vals[j + 1][i + 1], vals[j + 1][i]];
      out.push(...cellSegs(p, v, c, rule));
    }
  return out;
}

const segPath = (segs: readonly Seg[], m: (p: Pt) => Pt) =>
  segs
    .map(([a, b]) => {
      const A = m(a);
      const B = m(b);
      return `M${f1(A[0])} ${f1(A[1])}L${f1(B[0])} ${f1(B[1])}`;
    })
    .join("");

/** Interpolation bilinéaire des 9 valeurs, x et y dans [0, 2] : le « relief ». */
function fBil(x: number, y: number) {
  const i = Math.min(1, Math.floor(x));
  const j = Math.min(1, Math.floor(y));
  const u = x - i;
  const w = y - j;
  return gv(i, j) * (1 - u) * (1 - w) + gv(i + 1, j) * u * (1 - w) + gv(i + 1, j + 1) * u * w + gv(i, j + 1) * (1 - u) * w;
}

const NODES: Pt[] = [0, 1, 2].flatMap((y) => [0, 1, 2].map((x): Pt => [x, y]));

const CELLS = [
  { i: 0, j: 0, name: "bas gauche", lab: [0.74, 0.5] as Pt },
  { i: 1, j: 0, name: "bas droite", lab: [1.42, 0.52] as Pt },
  { i: 0, j: 1, name: "haut gauche", lab: [0.45, 1.55] as Pt },
  { i: 1, j: 1, name: "haut droite", lab: [1.5, 1.78] as Pt },
];
const nodesOf = (i: number, j: number): Pt[] => [
  [i, j],
  [i + 1, j],
  [i + 1, j + 1],
  [i, j + 1],
];
const valsOf = (i: number, j: number) => nodesOf(i, j).map(([x, y]) => gv(x, y));

/** Les 12 arêtes de la grille 3 × 3. */
const GEDGES: Seg[] = [
  ...[0, 1, 2].flatMap((y) => [0, 1].map((x): Seg => [[x, y], [x + 1, y]])),
  ...[0, 1, 2].flatMap((x) => [0, 1].map((y): Seg => [[x, y], [x, y + 1]])),
];

const halo = { paintOrder: "stroke" as const, stroke: C.paper, strokeWidth: 4, strokeLinejoin: "round" as const };

/** ⊕ et ⊖ : la police mono des schémas les dessine trop petits, on les passe en sans-serif. */
const SIGN_FONT = { fontFamily: "ui-sans-serif, system-ui, sans-serif" };
const T = (s: string) =>
  s.split(/([⊕⊖])/).map((part, k) =>
    part === "⊕" || part === "⊖" ? (
      <tspan key={k} style={SIGN_FONT} fontSize="1.2em">
        {part}
      </tspan>
    ) : (
      part
    ),
  );

// ---------------------------------------------------------------------------
// 1. Le relief coupé par le plan z = c
// ---------------------------------------------------------------------------

const RA = (52 * Math.PI) / 180;
const RCOS = Math.cos(RA);
const RSIN = Math.sin(RA);
const RK = 118;
const RZ = 24;
const RCX = 205;
const RCY = 300;
/** Projection du relief (x, y dans [0, 2], z = hauteur). */
const rp = (x: number, y: number, z: number): Pt => {
  const u = x - 1;
  const v = y - 1;
  const xr = u * RCOS - v * RSIN;
  const yr = u * RSIN + v * RCOS;
  return [RCX + RK * xr, RCY - RZ * z - RK * 0.5 * yr];
};

/** Fil de fer du relief, en petits segments (pour dessiner devant / derrière le plan). */
const WF: { a: Pt; b: Pt; z: number }[] = (() => {
  const out: { a: Pt; b: Pt; z: number }[] = [];
  const N = 12;
  const M = 24;
  for (let k = 0; k <= N; k++) {
    const s = (2 * k) / N;
    for (let m = 0; m < M; m++) {
      const t0 = (2 * m) / M;
      const t1 = (2 * (m + 1)) / M;
      const za = fBil(s, t0);
      const zb = fBil(s, t1);
      out.push({ a: rp(s, t0, za), b: rp(s, t1, zb), z: (za + zb) / 2 });
      const zc = fBil(t0, s);
      const zd = fBil(t1, s);
      out.push({ a: rp(t0, s, zc), b: rp(t1, s, zd), z: (zc + zd) / 2 });
    }
  }
  return out;
})();

const TS = 125;
const TX = 520;
const TY = 335;
const tp = (p: Pt): Pt => [TX + TS * p[0], TY - TS * p[1]];

function Relief() {
  const [c, setC] = useState(5);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const r = raf;
    return () => {
      if (r.current !== null) cancelAnimationFrame(r.current);
    };
  }, []);
  const play = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / 2600);
      setC(1 + 4 * u);
      raf.current = u < 1 ? requestAnimationFrame(tick) : null;
    };
    raf.current = requestAnimationFrame(tick);
  };

  const g = useMemo(() => {
    let below = "";
    let above = "";
    for (const s of WF) {
      const d = `M${f1(s.a[0])} ${f1(s.a[1])}L${f1(s.b[0])} ${f1(s.b[1])}`;
      if (s.z > c) above += d;
      else below += d;
    }
    const curve = march(41, 0, 2, fBil, c);
    const plane = [rp(0, 0, c), rp(2, 0, c), rp(2, 2, c), rp(0, 2, c)].map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ");
    return {
      below,
      above,
      plane,
      curve3: segPath(curve, (p) => rp(p[0], p[1], c)),
      curveTop: segPath(curve, tp),
      planeLab: rp(2, 0, c),
    };
  }, [c]);

  const base = [rp(0, 0, 0), rp(2, 0, 0), rp(2, 2, 0), rp(0, 2, 0)].map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ");

  return (
    <Figure caption="Chaque valeur devient une hauteur ; entre les nœuds, le relief est interpolé (bilinéaire). Le plan z = c coupe le relief le long de la courbe jaune : c'est la courbe de niveau f = c. Orange : nœuds au-dessus du plan (⊕).">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[260px] flex-1">
            <Slider label="Hauteur du plan c" value={c} min={0.5} max={8.5} step={0.1} onChange={setC} format={(v) => fr(v, 1)} />
          </div>
          <button
            type="button"
            onClick={play}
            className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
          >
            ⏵ monter le plan de 1 à 5
          </button>
        </div>
        <svg viewBox="0 0 820 390" className="w-full max-w-[820px]" role="img" aria-label="Relief des neuf valeurs coupé par un plan horizontal, et vue de dessus de la courbe de niveau">
          {/* relief : socle, tiges, fil de fer sous le plan */}
          <polygon points={base} fill="none" stroke={C.line} strokeDasharray="4 4" />
          {NODES.map(([x, y]) => {
            const a = rp(x, y, 0);
            const b = rp(x, y, gv(x, y));
            return <line key={`s${x}${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.faint} strokeDasharray="3 4" />;
          })}
          <path d={g.below} stroke={C.blue} strokeOpacity={0.45} strokeWidth={1} fill="none" />
          <polygon points={g.plane} fill={C.cyan} fillOpacity={0.16} stroke={C.cyan} strokeOpacity={0.8} strokeWidth={1.2} />
          <path d={g.above} stroke={C.blue} strokeOpacity={0.85} strokeWidth={1.1} fill="none" />
          <path d={g.curve3} stroke={C.yellow} strokeWidth={3} fill="none" strokeLinecap="round" />
          {NODES.map(([x, y]) => {
            const v = gv(x, y);
            const p = rp(x, y, v);
            const plus = v > c;
            return (
              <g key={`n${x}${y}`}>
                <circle cx={p[0]} cy={p[1]} r={4.5} fill={plus ? C.orange : C.weak} />
                <text x={p[0] + 7} y={p[1] - 7} fontSize={13} fill={plus ? C.orange : C.text} {...halo}>
                  {v}
                </text>
              </g>
            );
          })}
          <text x={g.planeLab[0] + 8} y={g.planeLab[1] + 4} fontSize={13} fill={C.cyan} {...halo}>
            z = {fr(c, 1)}
          </text>
          <text x={20} y={378} fontSize={13} fill={C.weak}>
            relief z = f(x, y)
          </text>

          {/* vue de dessus */}
          <text x={TX + TS} y={40} textAnchor="middle" fontSize={13} fill={C.weak}>
            vue de dessus : courbe f = {fr(c, 1)}
          </text>
          <rect x={TX} y={TY - 2 * TS} width={2 * TS} height={2 * TS} fill="none" stroke={C.lineStrong} />
          <line x1={TX + TS} y1={TY} x2={TX + TS} y2={TY - 2 * TS} stroke={C.line} />
          <line x1={TX} y1={TY - TS} x2={TX + 2 * TS} y2={TY - TS} stroke={C.line} />
          <path d={g.curveTop} stroke={C.yellow} strokeWidth={3} fill="none" strokeLinecap="round" />
          {NODES.map(([x, y]) => {
            const v = gv(x, y);
            const p = tp([x, y]);
            const plus = v > c;
            return (
              <g key={`t${x}${y}`}>
                <circle cx={p[0]} cy={p[1]} r={13} fill={plus ? C.orange : C.fill} fillOpacity={plus ? 0.25 : 1} stroke={plus ? C.orange : C.lineStrong} strokeWidth={plus ? 2 : 1} />
                <text x={p[0]} y={p[1] + 4.5} textAnchor="middle" fontSize={13} fill={C.ink}>
                  {v}
                </text>
              </g>
            );
          })}
          <text x={TX - 18} y={TY + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            y = 0
          </text>
          <text x={TX - 18} y={TY - 2 * TS + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            y = 2
          </text>
          <text x={TX} y={TY + 32} textAnchor="middle" fontSize={12} fill={C.weak}>
            x = 0
          </text>
          <text x={TX + 2 * TS} y={TY + 32} textAnchor="middle" fontSize={12} fill={C.weak}>
            x = 2
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. Une cellule : signes, index, arêtes traversées
// ---------------------------------------------------------------------------

const BIG: Pt[] = [
  [70, 280],
  [290, 280],
  [290, 60],
  [70, 60],
];
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const crossedOf = (idx: number) => [0, 1, 2, 3].filter((k) => ((idx >> k) & 1) !== ((idx >> ((k + 1) % 4)) & 1));

function CellSigns() {
  const [idx, setIdx] = useState(2); // exemple du cours : P1 ⊕ seul
  const plus = [0, 1, 2, 3].map((k) => ((idx >> k) & 1) === 1);
  const cr = crossedOf(idx);
  const amb = cr.length === 4;
  const edgeLab: { p: Pt; a: "middle" | "start" | "end"; t: string }[] = [
    { p: [180, 306], a: "middle", t: "arête 0" },
    { p: [302, 174], a: "start", t: "arête 1" },
    { p: [180, 46], a: "middle", t: "arête 2" },
    { p: [58, 174], a: "end", t: "arête 3" },
  ];
  const cornerLab: { p: Pt; a: "start" | "end" }[] = [
    { p: [46, 304], a: "end" },
    { p: [314, 304], a: "start" },
    { p: [314, 46], a: "start" },
    { p: [46, 46], a: "end" },
  ];
  return (
    <Figure caption="Cliquer sur un coin, ou sur une des 16 petites cellules. Les bits s'écrivent P3 P2 P1 P0. Ici le segment joint les milieux : sa vraie position vient de t (figure suivante).">
      <svg viewBox="0 0 850 330" className="w-full max-w-[850px]" role="img" aria-label="Une cellule : signes des quatre sommets, index et arêtes traversées, et les 16 configurations">
        <rect x={70} y={60} width={220} height={220} fill="none" stroke={C.lineStrong} strokeWidth={1.5} />
        {cr.map((k) => {
          const a = BIG[k];
          const b = BIG[(k + 1) % 4];
          return <line key={`c${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.yellow} strokeWidth={9} strokeOpacity={0.3} />;
        })}
        {cr.length === 2 && (
          <motion.path
            key={`seg${idx}`}
            d={`M${mid(BIG[cr[0]], BIG[(cr[0] + 1) % 4]).join(" ")}L${mid(BIG[cr[1]], BIG[(cr[1] + 1) % 4]).join(" ")}`}
            stroke={C.yellow}
            strokeWidth={3}
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4 }}
          />
        )}
        {cr.map((k) => {
          const m = mid(BIG[k], BIG[(k + 1) % 4]);
          return <circle key={`m${k}`} cx={m[0]} cy={m[1]} r={5} fill={C.red} />;
        })}
        {amb && (
          <text x={180} y={176} textAnchor="middle" fontSize={15} fill={C.red}>
            ? cas ambigu
          </text>
        )}
        {edgeLab.map((e, k) => (
          <text key={`e${k}`} x={e.p[0]} y={e.p[1]} textAnchor={e.a} fontSize={12} fill={cr.includes(k) ? C.yellow : C.weak}>
            {e.t}
          </text>
        ))}
        {BIG.map((p, k) => (
          <g key={`p${k}`} onClick={() => setIdx((i) => i ^ (1 << k))} style={{ cursor: "pointer" }} role="button" aria-label={`Changer le signe de P${k}`}>
            <circle cx={p[0]} cy={p[1]} r={18} fill={plus[k] ? C.orange : C.fill} fillOpacity={plus[k] ? 0.25 : 1} stroke={plus[k] ? C.orange : C.lineStrong} strokeWidth={plus[k] ? 2 : 1.2} />
            <text x={p[0]} y={p[1] + 6.5} textAnchor="middle" fontSize={19} fill={plus[k] ? C.orange : C.weak} style={SIGN_FONT}>
              {plus[k] ? "⊕" : "⊖"}
            </text>
            <text x={cornerLab[k].p[0]} y={cornerLab[k].p[1]} textAnchor={cornerLab[k].a} fontSize={14} fill={C.ink}>
              P{k}
            </text>
          </g>
        ))}

        {/* index en binaire */}
        <text x={400} y={22} fontSize={13} fill={C.weak}>
          {T("2⁴ = 16 configurations · index = Σ 2^k pour Pk ⊕")}
        </text>
        {[3, 2, 1, 0].map((b, k) => (
          <g key={`b${b}`}>
            <text x={419 + k * 46} y={46} textAnchor="middle" fontSize={12} fill={C.weak}>
              P{b}
            </text>
            <rect x={400 + k * 46} y={52} width={38} height={38} fill={plus[b] ? C.orange : C.fill} fillOpacity={plus[b] ? 0.2 : 1} stroke={plus[b] ? C.orange : C.line} />
            <text x={419 + k * 46} y={77} textAnchor="middle" fontSize={17} fill={plus[b] ? C.orange : C.text}>
              {plus[b] ? 1 : 0}
            </text>
          </g>
        ))}
        <text x={592} y={79} fontSize={22} fill={C.ink}>
          = {idx}
        </text>
        <text x={400} y={120} fontSize={13} fill={C.text}>
          {cr.length === 0 ? "aucune arête traversée : rien à tracer" : amb ? "4 arêtes traversées : 2 tracés possibles" : `arêtes traversées : ${cr.join(" et ")} → 1 segment`}
        </text>

        {/* les 16 configurations */}
        {Array.from({ length: 16 }, (_, m) => {
          const x = 400 + (m % 8) * 56;
          const y = 150 + Math.floor(m / 8) * 88;
          const q: Pt[] = [
            [x, y + 34],
            [x + 34, y + 34],
            [x + 34, y],
            [x, y],
          ];
          const mc = crossedOf(m);
          const sel = m === idx;
          return (
            <g key={`mini${m}`} onClick={() => setIdx(m)} style={{ cursor: "pointer" }} role="button" aria-label={`Configuration ${m}`}>
              <rect x={x - 6} y={y - 6} width={46} height={46} fill={sel ? C.blue : "transparent"} fillOpacity={sel ? 0.1 : 0} stroke={sel ? C.blue : "none"} strokeWidth={1.5} />
              <rect x={x} y={y} width={34} height={34} fill="none" stroke={C.line} />
              {mc.length === 2 && (
                <line
                  x1={mid(q[mc[0]], q[(mc[0] + 1) % 4])[0]}
                  y1={mid(q[mc[0]], q[(mc[0] + 1) % 4])[1]}
                  x2={mid(q[mc[1]], q[(mc[1] + 1) % 4])[0]}
                  y2={mid(q[mc[1]], q[(mc[1] + 1) % 4])[1]}
                  stroke={C.yellow}
                  strokeWidth={2}
                />
              )}
              {mc.length === 4 && (
                <text x={x + 17} y={y + 22} textAnchor="middle" fontSize={14} fill={C.red}>
                  ?
                </text>
              )}
              {q.map((p, k) => (
                <circle key={k} cx={p[0]} cy={p[1]} r={3.5} fill={(m >> k) & 1 ? C.orange : C.paper} stroke={(m >> k) & 1 ? C.orange : C.weak} />
              ))}
              <text x={x + 17} y={y + 54} textAnchor="middle" fontSize={12} fill={sel ? C.blue : C.weak}>
                {m}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}

function EdgeT() {
  const [c, setC] = useState(5);
  const t = (c - 4) / 4;
  const A = 90;
  const B = 610;
  const Y = 100;
  const px = A + (B - A) * t;
  const lx = Math.min(470, Math.max(230, (A + px) / 2));
  return (
    <Figure caption="Arête de 4 à 8 (exemple du cours). f est supposée linéaire sur l'arête. À c = 5 : t = (5 − 4)/(8 − 4) = 0,25, mesuré depuis l'extrémité qui vaut 4.">
      <div className="space-y-3">
        <Slider label="Niveau c" value={c} min={4} max={8} step={0.05} onChange={setC} format={(v) => fr(v, 2)} />
        <svg viewBox="0 0 700 165" className="w-full max-w-[700px]" role="img" aria-label="Point d'intersection sur une arête de 4 à 8">
          <line x1={A} y1={Y} x2={B} y2={Y} stroke={C.lineStrong} strokeWidth={3} />
          {[5, 6, 7].map((v) => {
            const x = A + ((B - A) * (v - 4)) / 4;
            return (
              <g key={v}>
                <line x1={x} y1={Y - 6} x2={x} y2={Y + 6} stroke={C.weak} />
                <text x={x} y={Y + 24} textAnchor="middle" fontSize={12} fill={C.weak}>
                  {v}
                </text>
              </g>
            );
          })}
          <path d={`M${A} 70V60H${f1(px)}V70`} fill="none" stroke={C.purple} strokeWidth={1.5} />
          <text x={lx} y={48} textAnchor="middle" fontSize={14} fill={C.purple}>
            t = ({fr(c)} − 4)/(8 − 4) = {fr(t)}
          </text>
          {[
            { x: A, v: 4, l: "v0 = 4" },
            { x: B, v: 8, l: "v1 = 8" },
          ].map((n) => (
            <g key={n.l}>
              <circle cx={n.x} cy={Y} r={20} fill={n.v > c ? C.orange : C.fill} fillOpacity={n.v > c ? 0.25 : 1} stroke={n.v > c ? C.orange : C.lineStrong} strokeWidth={1.5} />
              <text x={n.x} y={Y + 5} textAnchor="middle" fontSize={15} fill={C.ink}>
                {n.v}
              </text>
              <text x={n.x} y={Y + 50} textAnchor="middle" fontSize={13} fill={C.text}>
                {n.l}
              </text>
            </g>
          ))}
          <circle cx={px} cy={Y} r={8} fill={C.red} />
          <text x={Math.min(560, Math.max(140, px))} y={Y + 50} textAnchor="middle" fontSize={13} fill={C.red}>
            f = c
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. L'exercice du cours (grille 3 × 3, c = 5)
// ---------------------------------------------------------------------------

const GS = 140;
const GX = 70;
const GY = 340;
const gp = (p: Pt): Pt => [GX + GS * p[0], GY - GS * p[1]];

function GridBase() {
  const a = gp([0, 2]);
  return (
    <g>
      <rect x={a[0]} y={a[1]} width={2 * GS} height={2 * GS} fill="none" stroke={C.lineStrong} strokeWidth={1.2} />
      <line x1={gp([1, 0])[0]} y1={gp([1, 0])[1]} x2={gp([1, 2])[0]} y2={gp([1, 2])[1]} stroke={C.lineStrong} />
      <line x1={gp([0, 1])[0]} y1={gp([0, 1])[1]} x2={gp([2, 1])[0]} y2={gp([2, 1])[1]} stroke={C.lineStrong} />
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <text x={gp([k, 0])[0]} y={GY + 36} textAnchor="middle" fontSize={12} fill={C.weak}>
            {k}
          </text>
          <text x={GX - 46} y={gp([0, k])[1] + 4} textAnchor="middle" fontSize={12} fill={C.weak}>
            {k}
          </text>
        </g>
      ))}
      <text x={GX + 2 * GS + 30} y={GY + 36} fontSize={12} fill={C.weak}>
        x
      </text>
      <text x={GX - 46} y={GY - 2 * GS - 22} textAnchor="middle" fontSize={12} fill={C.weak}>
        y
      </text>
    </g>
  );
}

function GridNodes({ c, signs }: { c: number; signs: boolean }) {
  return (
    <g>
      {NODES.map(([x, y]) => {
        const v = gv(x, y);
        const plus = signs && v > c;
        const [X, Y] = gp([x, y]);
        return (
          <g key={`${x}${y}`}>
            <circle cx={X} cy={Y} r={16} fill={plus ? C.orange : C.fill} fillOpacity={plus ? 0.25 : 1} stroke={plus ? C.orange : C.lineStrong} strokeWidth={plus ? 2 : 1.2} />
            <text x={X} y={Y + 5} textAnchor="middle" fontSize={15} fill={C.ink}>
              {v}
            </text>
            {signs && (
              <text x={X - 15} y={Y - 14} textAnchor="end" fontSize={16} fill={plus ? C.orange : C.weak} style={SIGN_FONT}>
                {plus ? "⊕" : "⊖"}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

const EXC = {
  a: { at: [0.6, 0], from: [0, 0], step: 3 },
  b: { at: [0.25, 1], from: [0, 1], step: 3 },
  c: { at: [1.5, 0], from: [1, 0], step: 4 },
  d: { at: [2, 2 / 3], from: [2, 0], step: 4 },
  e: { at: [1, 1.6], from: [1, 1], step: 5 },
  f: { at: [2, 1.25], from: [2, 1], step: 6 },
} as const satisfies Record<string, { at: Pt; from: Pt; step: number }>;

const EX_SEGS: { id: string; a: Pt; b: Pt; step: number }[] = [
  { id: "bl", a: EXC.a.at, b: EXC.b.at, step: 3 },
  { id: "br", a: EXC.c.at, b: EXC.d.at, step: 4 },
  { id: "tl", a: EXC.b.at, b: EXC.e.at, step: 5 },
];

const EX_STEPS = [
  "Les 9 valeurs",
  "Signes pour c = 5",
  "Index des 4 cellules",
  "Cellule bas gauche",
  "Cellule bas droite",
  "Cellule haut gauche",
  "Cellule haut droite",
  "✗ L'erreur classique",
  "✓ t mesuré depuis v0",
  "La réponse",
];

const EX_TEXT: string[][] = [
  ["f n'est connue qu'aux 9 nœuds", "x : colonne 0 → 2 (vers la droite)", "y : ligne 0 → 2 (vers le haut)", "but : tracer la courbe f(x, y) = 5"],
  ["⊕ si valeur > c = 5, ⊖ sinon", "⊕ : 7, 8 et 6", "⊖ : 1, 3, 2, 4, 2 et 3"],
  ["index = Σ 2^k pour chaque Pk ⊕", "bits écrits P3 P2 P1 P0", "bas gauche : 0110 = 6", "bas droite : 1101 = 13", "haut gauche : 0010 = 2", "haut droite : 0011 = 3", "→ 2 arêtes traversées par cellule"],
  ["Cellule bas gauche (index 6)", "arête 0 : de 2 à 7", "t = (5 − 2)/(7 − 2) = 0,6 → (0,6 ; 0)", "arête 2 : de 4 à 8", "t = (5 − 4)/(8 − 4) = 0,25 → (0,25 ; 1)", "un segment relie les 2 points"],
  ["Cellule bas droite (index 13)", "de 7 à 3 : t = (5 − 7)/(3 − 7) = 0,5", "→ (1,5 ; 0)", "de 3 à 6 : t = (5 − 3)/(6 − 3) ≈ 0,67", "→ (2 ; 0,67)", "le segment isole le coin du 3"],
  ["Cellule haut gauche (index 2)", "arête 4 → 8 : point déjà trouvé (0,25 ; 1)", "de 8 à 3 : t = (5 − 8)/(3 − 8) = 0,6", "→ (1 ; 1,6)"],
  ["Cellule haut droite (index 3)", "de 6 à 2 : t = (5 − 6)/(2 − 6) = 0,25", "→ (2 ; 1,25)", "arête 3 : de P3 (3, en haut) à P0 (8, en bas)", "t = (5 − 3)/(8 − 3) = 0,4"],
  ["✗ 0,4 reporté depuis P0 (le 8, en bas)", "point (1 ; 1,4) : la courbe se casse", "trou avec le point (1 ; 1,6) du voisin"],
  ["✓ t se mesure depuis v0 = 3 (en haut)", "2 − 0,4 = 1,6 → (1 ; 1,6)", "même point que la cellule voisine", "→ pas de trou"],
  ["Réponse pour c = 5 :", "(0,6 ; 0) → (0,25 ; 1) → (1 ; 1,6) → (2 ; 1,25)", "+ segment (1,5 ; 0) → (2 ; ≈ 0,67)", "qui isole le coin du 3"],
];

function crossedGridEdges(c: number) {
  return GEDGES.filter(([a, b]) => gv(a[0], a[1]) > c !== gv(b[0], b[1]) > c);
}

function ExerciseFig({ step }: { step: number }) {
  const c = 5;
  const active = step === 3 ? 0 : step === 4 ? 1 : step === 5 ? 2 : step >= 6 && step <= 8 ? 3 : -1;
  const frame = active >= 0 ? gp([CELLS[active].i, CELLS[active].j + 1]) : null;
  const P = (p: Pt) => gp(p);
  const f = P(EXC.f.at);
  const n11 = P([1, 1]);
  const trTarget = P([1, step === 7 ? 1.4 : 1.6]);
  const tour: Pt[] = [EXC.a.at, EXC.b.at, EXC.e.at, EXC.f.at].map(P);
  return (
    <svg viewBox="0 0 860 385" className="w-full max-w-[860px]" role="img" aria-label="Exercice : courbe f = 5 sur la grille 3 × 3, cellule par cellule">
      <ArrowMarkers />
      <GridBase />
      {step >= 2 &&
        crossedGridEdges(c).map(([a, b], k) => {
          const A = P(a);
          const B = P(b);
          return <line key={`x${k}`} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={C.yellow} strokeWidth={9} strokeOpacity={0.22} />;
        })}
      {frame && (
        <motion.rect
          key="frame"
          width={GS}
          height={GS}
          fill={C.blue}
          fillOpacity={0.06}
          stroke={C.blue}
          strokeWidth={2.5}
          initial={{ x: frame[0], y: frame[1], opacity: 0 }}
          animate={{ x: frame[0], y: frame[1], opacity: 1 }}
          transition={{ duration: 0.45 }}
        />
      )}
      {step >= 2 &&
        CELLS.map((cell, k) => {
          const idx = cellIndex(valsOf(cell.i, cell.j), c);
          const L = P(cell.lab);
          return (
            <motion.g key={`i${k}`} initial={{ opacity: 0 }} animate={{ opacity: step === 2 ? 1 : 0.75 }} transition={{ delay: step === 2 ? 0.25 * k : 0, duration: 0.35 }}>
              <text x={L[0]} y={L[1]} textAnchor="middle" fontSize={20} fill={C.blue}>
                {idx}
              </text>
              <text x={L[0]} y={L[1] + 17} textAnchor="middle" fontSize={12} fill={C.weak}>
                {bin(idx)}
              </text>
            </motion.g>
          );
        })}
      {EX_SEGS.filter((s) => step >= s.step).map((s) => {
        const A = P(s.a);
        const B = P(s.b);
        return (
          <motion.path
            key={s.id}
            d={`M${f1(A[0])} ${f1(A[1])}L${f1(B[0])} ${f1(B[1])}`}
            stroke={C.yellow}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: step === s.step ? 1 : 0, duration: 0.6 }}
          />
        );
      })}
      {step >= 7 && (
        <motion.path
          key="tr"
          stroke={step === 7 ? C.red : C.yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
          initial={{ d: `M${f1(f[0])} ${f1(f[1])}L${f1(n11[0])} ${f1(n11[1])}` }}
          animate={{ d: `M${f1(f[0])} ${f1(f[1])}L${f1(trTarget[0])} ${f1(trTarget[1])}` }}
          transition={{ duration: 0.9 }}
        />
      )}
      {step >= 6 && step <= 8 && (
        <g>
          <line x1={P([1, 2])[0] + 12} y1={P([1, 2])[1] + 20} x2={n11[0] + 12} y2={n11[1] - 20} stroke={C.purple} strokeWidth={2} markerEnd="url(#arr-purple)" />
          <text x={P([1, 2])[0] + 20} y={P([1, 2])[1] + 34} fontSize={12} fill={C.purple}>
            v0
          </text>
          <text x={n11[0] + 20} y={n11[1] - 22} fontSize={12} fill={C.purple}>
            v1
          </text>
        </g>
      )}
      {step === 7 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          <path d={`M${P([1, 1.4])[0] + 30} ${P([1, 1.4])[1]}h6V${P([1, 1.6])[1]}h-6`} fill="none" stroke={C.red} strokeWidth={1.5} />
          <text x={P([1, 1.5])[0] + 42} y={P([1, 1.5])[1] + 4} fontSize={13} fill={C.red}>
            ✗ trou !
          </text>
        </motion.g>
      )}
      {(Object.keys(EXC) as (keyof typeof EXC)[])
        .filter((id) => step >= EXC[id].step)
        .map((id) => {
          const k = EXC[id];
          const A = P(k.from);
          const B = P(k.at);
          return (
            <motion.circle
              key={id}
              r={6}
              fill={C.red}
              initial={{ cx: A[0], cy: A[1] }}
              animate={{ cx: B[0], cy: B[1] }}
              transition={{ duration: step === k.step ? 0.9 : 0, delay: step === k.step ? 0.1 : 0 }}
            />
          );
        })}
      {step >= 7 && (
        <motion.circle
          key="tr3"
          r={6}
          fill={C.red}
          initial={{ cx: n11[0], cy: n11[1] }}
          animate={{ cx: trTarget[0], cy: trTarget[1] }}
          transition={{ duration: 0.9 }}
        />
      )}
      <GridNodes c={c} signs={step >= 1} />
      {step === 9 && (
        <motion.circle
          key="tour"
          r={8}
          fill={C.yellow}
          fillOpacity={0.9}
          initial={{ cx: tour[0][0], cy: tour[0][1] }}
          animate={{ cx: tour.map((p) => p[0]), cy: tour.map((p) => p[1]) }}
          transition={{ duration: 2.4, delay: 0.3, ease: "easeInOut" }}
        />
      )}

      {/* panneau de droite */}
      <motion.g key={`txt${step}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        {step === 9 && <rect x={418} y={42} width={428} height={140} fill={C.green} fillOpacity={0.07} stroke={C.green} />}
        {EX_TEXT[step].map((l, k) => (
          <text key={k} x={430} y={70 + k * 29} fontSize={k === 0 ? 15 : 13.5} fill={k === 0 ? C.ink : l.startsWith("✗") ? C.red : C.text}>
            {T(l)}
          </text>
        ))}
      </motion.g>
    </svg>
  );
}

const PRESETS: number[] = [2.5, 5, 7.5];

function GridLive() {
  const [c, setC] = useState(5);
  const data = useMemo(
    () =>
      CELLS.map((cell) => {
        const p = nodesOf(cell.i, cell.j);
        const v = valsOf(cell.i, cell.j);
        return { ...cell, idx: cellIndex(v, c), segs: cellSegs(p, v, c), cuts: cellCuts(p, v, c).filter((q): q is Pt => q !== null) };
      }),
    [c],
  );
  const plusVals = NODES.map(([x, y]) => gv(x, y)).filter((v) => v > c);
  return (
    <Figure caption="À 7,5 : seul le 8 est ⊕, petite boucle fermée autour de lui. À 2,5 : seuls 1, 2 et 2 sont ⊖, trois petits arcs dans les coins. Sur cette grille, aucune cellule n'est ambiguë, quel que soit c.">
      <div className="space-y-3">
        <Slider label="Niveau c" value={c} min={0.5} max={8.5} step={0.1} onChange={setC} format={(v) => fr(v, 1)} />
        <Choice
          label="Valeurs du cours"
          options={PRESETS.map((p) => ({ value: p, label: `c = ${fr(p, 1)}` }))}
          value={PRESETS.find((p) => Math.abs(p - c) < 1e-9) ?? -1}
          onChange={(v) => setC(v)}
        />
        <svg viewBox="0 0 860 385" className="w-full max-w-[860px]" role="img" aria-label="Courbe f = c recalculée pour chaque valeur de c">
          <GridBase />
          {data.map((cell) =>
            cell.segs.map(([a, b], k) => {
              const A = gp(a);
              const B = gp(b);
              return <line key={`${cell.name}${k}`} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={C.yellow} strokeWidth={3.5} strokeLinecap="round" />;
            }),
          )}
          {data.map((cell) =>
            cell.cuts.map((q, k) => {
              const Q = gp(q);
              return <circle key={`${cell.name}p${k}`} cx={Q[0]} cy={Q[1]} r={5} fill={C.red} />;
            }),
          )}
          {data.map((cell) => {
            const L = gp(cell.lab);
            return (
              <text key={`l${cell.name}`} x={L[0]} y={L[1]} textAnchor="middle" fontSize={18} fill={C.blue} {...halo}>
                {cell.idx}
              </text>
            );
          })}
          <GridNodes c={c} signs />

          <text x={430} y={70} fontSize={15} fill={C.ink}>
            c = {fr(c, 1)}
          </text>
          <text x={430} y={98} fontSize={13.5} fill={C.text}>
            {T("⊕ (valeur > c) : ")}
            {plusVals.length ? plusVals.join(", ") : "aucun"}
          </text>
          <text x={430} y={136} fontSize={12} fill={C.weak}>
            cellule
          </text>
          <text x={570} y={136} fontSize={12} fill={C.weak}>
            P3P2P1P0
          </text>
          <text x={672} y={136} fontSize={12} fill={C.weak}>
            index
          </text>
          <text x={740} y={136} fontSize={12} fill={C.weak}>
            segments
          </text>
          {data.map((cell, k) => (
            <g key={`r${cell.name}`}>
              <text x={430} y={164 + k * 28} fontSize={13.5} fill={C.text}>
                {cell.name}
              </text>
              <text x={570} y={164 + k * 28} fontSize={13.5} fill={C.text}>
                {bin(cell.idx)}
              </text>
              <text x={672} y={164 + k * 28} fontSize={13.5} fill={C.blue}>
                {cell.idx}
              </text>
              <text x={740} y={164 + k * 28} fontSize={13.5} fill={C.text}>
                {cell.segs.length}
              </text>
            </g>
          ))}
          <text x={430} y={300} fontSize={13} fill={C.weak}>
            Même règle dans chaque cellule :
          </text>
          <text x={430} y={322} fontSize={13} fill={C.weak}>
            signes → index → t sur les arêtes → segments.
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 4. Le cas ambigu (cellule 6, 2, 7, 3)
// ---------------------------------------------------------------------------

const AMB_V = [6, 2, 7, 3];
const AMB_M = (6 + 2 + 7 + 3) / 4; // 4,5

function Ambiguous() {
  const [c, setC] = useState(5);
  const [rule, setRule] = useState<Rule>("mean");
  const centerPlus = AMB_M > c;
  const chosen = rule === "mean" && centerPlus ? 1 : 0; // 0 : ⊕ isolés (gauche), 1 : ⊕ reliés (droite)
  const drawings = [
    { ox: 80, title: "⊕ isolés (centre ⊖)" },
    { ox: 500, title: "⊕ reliés par le centre (centre ⊕)" },
  ];
  return (
    <Figure caption="Cellule du cours : 6 en bas à gauche, 2 en bas à droite, 7 en haut à droite, 3 en haut à gauche. Zone orange : là où f > c. Le cadre vert montre le tracé choisi par la règle.">
      <div className="space-y-3">
        <Slider label="Niveau c" value={c} min={3} max={5.9} step={0.05} onChange={setC} format={(v) => fr(v, 2)} />
        <Choice
          label="Règle"
          options={[
            { value: "mean" as Rule, label: "moyenne m (cours)" },
            { value: "isolate" as Rule, label: "coins > c toujours isolés (code du TP)" },
          ]}
          value={rule}
          onChange={setRule}
        />
        <svg viewBox="0 0 800 380" className="w-full max-w-[800px]" role="img" aria-label="Cas ambigu : deux façons de relier les quatre points">
          <motion.rect
            y={14}
            width={290}
            height={300}
            fill="none"
            stroke={C.green}
            strokeWidth={2.5}
            initial={false}
            animate={{ x: drawings[chosen].ox - 35 }}
            transition={{ duration: 0.4 }}
          />
          {drawings.map((dw, kind) => {
            const p: Pt[] = [
              [dw.ox, 280],
              [dw.ox + 220, 280],
              [dw.ox + 220, 60],
              [dw.ox, 60],
            ];
            const [e0, e1, e2, e3] = cellCuts(p, AMB_V, c);
            if (!e0 || !e1 || !e2 || !e3) return null;
            const poly = (pts: Pt[]) => pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");
            const segs: Seg[] =
              kind === 0
                ? [
                    [e0, e3],
                    [e1, e2],
                  ]
                : [
                    [e0, e1],
                    [e2, e3],
                  ];
            const ctr: Pt = [dw.ox + 110, 170];
            return (
              <g key={kind}>
                <text x={dw.ox + 110} y={40} textAnchor="middle" fontSize={13.5} fill={C.ink}>
                  {T(dw.title)}
                </text>
                {kind === 0 ? (
                  <>
                    <polygon points={poly([p[0], e0, e3])} fill={C.orange} fillOpacity={0.18} />
                    <polygon points={poly([p[2], e2, e1])} fill={C.orange} fillOpacity={0.18} />
                  </>
                ) : (
                  <polygon points={poly([p[0], e0, e1, p[2], e2, e3])} fill={C.orange} fillOpacity={0.18} />
                )}
                <rect x={dw.ox} y={60} width={220} height={220} fill="none" stroke={C.lineStrong} strokeWidth={1.5} />
                {segs.map(([a, b], k) => (
                  <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.yellow} strokeWidth={3.5} strokeLinecap="round" />
                ))}
                {[e0, e1, e2, e3].map((q, k) => (
                  <circle key={`q${k}`} cx={q[0]} cy={q[1]} r={5} fill={C.red} />
                ))}
                <circle cx={ctr[0]} cy={ctr[1]} r={6} fill={centerPlus ? C.orange : C.weak} />
                <text x={ctr[0]} y={ctr[1] + 22} textAnchor="middle" fontSize={12} fill={centerPlus ? C.orange : C.weak}>
                  m = 4,5
                </text>
                {p.map((q, k) => {
                  const plus = AMB_V[k] > c;
                  return (
                    <g key={`v${k}`}>
                      <circle cx={q[0]} cy={q[1]} r={17} fill={plus ? C.orange : C.fill} fillOpacity={plus ? 0.25 : 1} stroke={plus ? C.orange : C.lineStrong} strokeWidth={plus ? 2 : 1.2} />
                      <text x={q[0]} y={q[1] + 5} textAnchor="middle" fontSize={15} fill={C.ink}>
                        {AMB_V[k]}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          <text x={400} y={340} textAnchor="middle" fontSize={13.5} fill={C.text}>
            m = (6 + 2 + 7 + 3)/4 = 4,5 · c = {fr(c, 2)}
          </text>
          <text x={400} y={366} textAnchor="middle" fontSize={13.5} fill={C.green}>
            {T(
              rule === "isolate"
                ? "code du TP : on isole toujours les ⊕ → dessin de gauche"
                : centerPlus
                  ? "m > c → centre ⊕ → les ⊕ communiquent : dessin de droite"
                  : "m ≤ c → centre ⊖ → les ⊕ restent isolés : dessin de gauche",
            )}
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 5. Marching cubes
// ---------------------------------------------------------------------------

const CU = 170;
const CX0 = 110;
const CY0 = 335;
const cp = (x: number, y: number, z: number): Pt => [CX0 + CU * (x + 0.42 * y), CY0 - CU * (z + 0.3 * y)];
const CV: [number, number, number][] = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const CVP = CV.map(([x, y, z]) => cp(x, y, z));
const CVAL = [8, 4, 3, 2, 3, 2, 1, 2];
const CEDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
const HIDDEN = [2, 3, 11]; // arêtes qui touchent v3 (derrière)
const CENTER = cp(0.5, 0.5, 0.5);
const VLAB: { p: Pt; a: "start" | "end" }[] = [
  { p: [100, 358], a: "end" },
  { p: [290, 358], a: "start" },
  { p: [364, 292], a: "start" },
  { p: [192, 277], a: "start" },
  { p: [98, 160], a: "end" },
  { p: [288, 184], a: "start" },
  { p: [362, 108], a: "start" },
  { p: [170, 102], a: "end" },
];
// Triangle de l'index 1 : t = 0,75 (arête 0), 0,5 (arête 3), 0,6 (arête 8), mesurés depuis v0.
const TRI: Pt[] = [cp(0.75, 0, 0), cp(0, 0.5, 0), cp(0, 0, 0.6)];
const TRI_G = cp(0.25, 0.5 / 3, 0.2);
const TRI_N = (() => {
  const n = [0.3, 0.45, 0.375];
  const l = Math.hypot(n[0], n[1], n[2]);
  return cp(0.25 + (0.45 * n[0]) / l, 0.5 / 3 + (0.45 * n[1]) / l, 0.2 + (0.45 * n[2]) / l);
})();

const CUBE_STEPS = [
  "Une pile de coupes",
  "Le cube : 8 sommets, 12 arêtes",
  "Index sur 8 bits",
  "La table : index 1 → arêtes 0, 3, 8",
  "256 cas → 15 motifs",
  "Interpolation : un triangle",
  "Normale = gradient",
];

function Slices() {
  const ys = [360, 250, 140];
  const node = (i: number, j: number, yb: number): Pt => [60 + 100 * i + (100 / 3) * j, yb - 20 * j];
  const cellIdx: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  return (
    <svg viewBox="0 0 860 400" className="w-full max-w-[860px]" role="img" aria-label="Pile de coupes et cube entre deux coupes voisines">
      {ys.map((yb, k) => (
        <g key={yb}>
          <polygon points={`60,${yb} 360,${yb} 460,${yb - 60} 160,${yb - 60}`} fill={C.fill} fillOpacity={0.5} stroke={C.lineStrong} />
          {[0, 1, 2, 3].flatMap((i) =>
            [0, 1, 2, 3].map((j) => {
              const q = node(i, j, yb);
              return <circle key={`${i}${j}`} cx={q[0]} cy={q[1]} r={2.5} fill={C.weak} />;
            }),
          )}
          <text x={472} y={yb - 26} fontSize={13} fill={k < 2 ? C.blue : C.weak}>
            coupe {k === 0 ? "k" : `k+${k}`}
          </text>
        </g>
      ))}
      {cellIdx.map(([i, j], k) => {
        const [i2, j2] = cellIdx[(k + 1) % 4];
        const a = node(i, j, 360);
        const b = node(i, j, 250);
        const a2 = node(i2, j2, 360);
        const b2 = node(i2, j2, 250);
        return (
          <g key={k}>
            <motion.path
              d={`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`}
              stroke={C.blue}
              strokeWidth={2.5}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4 + 0.15 * k, duration: 0.6 }}
            />
            <path d={`M${f1(a[0])} ${f1(a[1])}L${f1(a2[0])} ${f1(a2[1])}`} stroke={C.blue} strokeWidth={2} fill="none" />
            <path d={`M${f1(b[0])} ${f1(b[1])}L${f1(b2[0])} ${f1(b2[1])}`} stroke={C.blue} strokeWidth={2} fill="none" />
          </g>
        );
      })}
      {["f connue sur une pile de coupes", "(ex. densité mesurée au scanner)", "un cube = 4 nœuds de la coupe k", "      + 4 nœuds de la coupe k+1", "même idée qu'en 2D, en 3D"].map((l, k) => (
        <text key={k} x={570} y={110 + k * 28} fontSize={13} fill={k === 0 ? C.ink : C.text} style={{ whiteSpace: "pre" }}>
          {l}
        </text>
      ))}
    </svg>
  );
}

function BitsRow({ animate }: { animate: boolean }) {
  return (
    <g>
      {[7, 6, 5, 4, 3, 2, 1, 0].map((v, k) => {
        const on = CVAL[v] > 5;
        return (
          <g key={v}>
            <text x={467 + k * 40} y={62} textAnchor="middle" fontSize={12} fill={C.weak}>
              v{v}
            </text>
            <rect x={450 + k * 40} y={70} width={34} height={34} fill={on ? C.orange : C.fill} fillOpacity={on ? 0.22 : 1} stroke={on ? C.orange : C.line} />
            <motion.text
              x={467 + k * 40}
              y={93}
              textAnchor="middle"
              fontSize={16}
              fill={on ? C.orange : C.text}
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ delay: animate ? 0.2 + v * 0.18 : 0 }}
            >
              {on ? 1 : 0}
            </motion.text>
          </g>
        );
      })}
      <motion.text x={778} y={95} fontSize={20} fill={C.ink} initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: animate ? 1.8 : 0 }}>
        = 1
      </motion.text>
    </g>
  );
}

function CubeFig({ step }: { step: number }) {
  if (step === 0) return <Slices />;
  const showNums = step === 1 || step === 3;
  return (
    <svg viewBox="0 0 860 400" className="w-full max-w-[860px]" role="img" aria-label="Marching cubes : un cube, son index sur 8 bits, la table et le triangle obtenu">
      <ArrowMarkers />
      {CEDGES.map(([a, b], k) => (
        <line key={`e${k}`} x1={CVP[a][0]} y1={CVP[a][1]} x2={CVP[b][0]} y2={CVP[b][1]} stroke={C.lineStrong} strokeWidth={1.5} strokeDasharray={HIDDEN.includes(k) ? "5 4" : undefined} />
      ))}
      {step >= 3 &&
        [0, 3, 8].map((k) => {
          const [a, b] = CEDGES[k];
          return <line key={`h${k}`} x1={CVP[a][0]} y1={CVP[a][1]} x2={CVP[b][0]} y2={CVP[b][1]} stroke={C.yellow} strokeWidth={8} strokeOpacity={0.3} />;
        })}
      {showNums &&
        CEDGES.map(([a, b], k) => {
          if (step === 3 && ![0, 3, 8].includes(k)) return null;
          const m = mid(CVP[a], CVP[b]);
          const dx = m[0] - CENTER[0];
          const dy = m[1] - CENTER[1];
          const l = Math.hypot(dx, dy) || 1;
          return (
            <text key={`n${k}`} x={m[0] + (dx / l) * 14} y={m[1] + (dy / l) * 14 + 4} textAnchor="middle" fontSize={12} fill={step === 3 ? C.yellow : C.weak} {...halo}>
              {k}
            </text>
          );
        })}
      {step >= 5 && (
        <>
          <motion.polygon
            key="tri"
            points={TRI.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ")}
            fill={C.yellow}
            fillOpacity={0.35}
            stroke={C.yellow}
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: step === 5 ? 1.2 : 0, duration: 0.5 }}
          />
          {TRI.map((p, k) => (
            <motion.circle
              key={`t${k}`}
              r={5.5}
              fill={C.red}
              initial={{ cx: CVP[0][0], cy: CVP[0][1] }}
              animate={{ cx: p[0], cy: p[1] }}
              transition={{ duration: step === 5 ? 1 : 0, delay: step === 5 ? 0.2 : 0 }}
            />
          ))}
        </>
      )}
      {step >= 6 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <motion.path
            d={`M${f1(TRI_G[0])} ${f1(TRI_G[1])}L${f1(TRI_N[0])} ${f1(TRI_N[1])}`}
            stroke={C.green}
            strokeWidth={2.5}
            fill="none"
            markerEnd="url(#arr-green)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          <text x={TRI_N[0] + 8} y={TRI_N[1] - 2} fontSize={14} fill={C.green} {...halo}>
            n
          </text>
        </motion.g>
      )}
      {CVP.map((p, k) => {
        const plus = step >= 2 && CVAL[k] > 5;
        return (
          <g key={`v${k}`}>
            <circle cx={p[0]} cy={p[1]} r={7} fill={plus ? C.orange : C.weak} />
            <text x={VLAB[k].p[0]} y={VLAB[k].p[1]} textAnchor={VLAB[k].a} fontSize={13} fill={plus ? C.orange : C.ink} {...halo}>
              v{k} = {CVAL[k]}
            </text>
          </g>
        );
      })}

      {/* panneau de droite */}
      <motion.g key={`p${step}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        {step === 1 &&
          [
            "Cube entre la coupe k et la coupe k+1",
            "coupe k : v0 v1 v2 v3",
            "coupe k+1 : v4 v5 v6 v7 (au-dessus)",
            "12 arêtes : 0 à 3 en bas, 4 à 7 en haut,",
            "8 à 11 verticales",
            "c = 5 : ⊕ si valeur > 5",
          ].map((l, k) => (
            <text key={k} x={450} y={80 + k * 30} fontSize={k === 0 ? 15 : 13.5} fill={k === 0 ? C.ink : C.text}>
              {T(l)}
            </text>
          ))}
        {(step === 2 || step === 3) && <BitsRow animate={step === 2} />}
        {step === 2 &&
          ["index = Σ 2^k pour chaque vk ⊕", "seul v0 = 8 > 5 → 00000001 = 1", "8 bits → 2⁸ = 256 cas"].map((l, k) => (
            <text key={k} x={450} y={150 + k * 30} fontSize={13.5} fill={C.text}>
              {T(l)}
            </text>
          ))}
        {step === 3 && (
          <g>
            <path d="M800 112V216H772" fill="none" stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
            <text x={450} y={150} fontSize={13} fill={C.weak}>
              table précalculée (256 lignes) :
            </text>
            {[
              { t: "0 → aucun triangle", hi: false },
              { t: "1 → arêtes 0, 3, 8 : 1 triangle", hi: true },
              { t: "2 → arêtes 0, 1, 9 : 1 triangle", hi: false },
              { t: "…", hi: false },
              { t: "255 → aucun triangle", hi: false },
            ].map((r, k) => (
              <g key={k}>
                <rect x={445} y={168 + k * 34} width={320} height={28} fill={r.hi ? C.yellow : C.fill} fillOpacity={r.hi ? 0.15 : 0.6} stroke={r.hi ? C.yellow : C.line} />
                <text x={458} y={187 + k * 34} fontSize={13.5} fill={r.hi ? C.ink : C.text}>
                  {r.t}
                </text>
              </g>
            ))}
          </g>
        )}
        {step === 4 && (
          <g>
            <text x={546} y={58} textAnchor="middle" fontSize={13.5} fill={C.ink}>
              2⁸ = 256 cas
            </text>
            {Array.from({ length: 256 }, (_, k) => {
              const tk = k % 15;
              return (
                <motion.rect
                  key={k}
                  width={10}
                  height={10}
                  fill={tk === 0 ? C.faint : C.blue}
                  fillOpacity={0.75}
                  initial={{ x: 450 + (k % 16) * 12, y: 70 + Math.floor(k / 16) * 12 }}
                  animate={{ x: 450 + tk * 26, y: 300, width: 20, height: 20 }}
                  transition={{ delay: 1 + k * 0.003, duration: 0.8 }}
                />
              );
            })}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <text x={670} y={150} fontSize={13.5} fill={C.text}>
                par rotations
              </text>
              <text x={670} y={172} fontSize={13.5} fill={C.text}>
                et symétries ↓
              </text>
            </motion.g>
            <motion.text x={640} y={348} textAnchor="middle" fontSize={14} fill={C.ink} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
              14 motifs non vides + le vide = 15
            </motion.text>
          </g>
        )}
        {step === 5 &&
          [
            "Seul v0 est ⊕ : on coupe le coin v0",
            "t mesuré depuis v0 = 8 :",
            "arête 0 (vers v1 = 4) : t = (5 − 8)/(4 − 8) = 0,75",
            "arête 3 (vers v3 = 2) : t = (5 − 8)/(2 − 8) = 0,5",
            "arête 8 (vers v4 = 3) : t = (5 − 8)/(3 − 8) = 0,6",
            "→ 1 triangle entre les 3 points",
          ].map((l, k) => (
            <text key={k} x={440} y={80 + k * 30} fontSize={k === 0 ? 14.5 : 13} fill={k === 0 ? C.ink : C.text}>
              {T(l)}
            </text>
          ))}
        {step === 6 &&
          [
            "Normale : gradient de f",
            "différences centrales au nœud (i, j, k) :",
            "gx = (f(i+1, j, k) − f(i−1, j, k)) / 2",
            "gy = (f(i, j+1, k) − f(i, j−1, k)) / 2",
            "gz = (f(i, j, k+1) − f(i, j, k−1)) / 2",
            "n = ∇f / ‖∇f‖ (au signe près)",
          ].map((l, k) => (
            <text key={k} x={440} y={80 + k * 30} fontSize={k === 0 ? 15 : 13.5} fill={k === 0 ? C.ink : k === 5 ? C.green : C.text}>
              {l}
            </text>
          ))}
      </motion.g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 6. TP : résolution de la grille
// ---------------------------------------------------------------------------

type Field = { id: number; label: string; f: (x: number, y: number) => number; min: number; max: number; step: number; def: number };
const FIELDS: Field[] = [
  { id: 1, label: "x² + y²", f: (x, y) => x * x + y * y, min: 0.5, max: 8, step: 0.1, def: 4 },
  { id: 2, label: "x² − y²", f: (x, y) => x * x - y * y, min: -4, max: 4, step: 0.1, def: 1 },
  { id: 3, label: "sin x + cos y", f: (x, y) => Math.sin(x) + Math.cos(y), min: -1.5, max: 1.5, step: 0.05, def: 0.5 },
  { id: 4, label: "exp(−(x² + y²))", f: (x, y) => Math.exp(-(x * x + y * y)), min: 0.05, max: 0.95, step: 0.01, def: 0.5 },
  {
    id: 5,
    label: "2 gaussiennes (x = ±1,5)",
    f: (x, y) => Math.exp(-((x - 1.5) ** 2 + y * y)) + Math.exp(-((x + 1.5) ** 2 + y * y)),
    min: 0.05,
    max: 0.95,
    step: 0.01,
    def: 0.5,
  },
  { id: 6, label: "r − 2 − 0,3 cos 3θ", f: (x, y) => Math.hypot(x, y) - 2 - 0.3 * Math.cos(3 * Math.atan2(y, x)), min: -1.5, max: 1.5, step: 0.05, def: 0 },
];

const PX0 = 30;
const PY0 = 20;
const PW = 360;
const pm = (p: Pt): Pt => [PX0 + ((p[0] + 3) / 6) * PW, PY0 + PW - ((p[1] + 3) / 6) * PW];

function TpResolution() {
  const [fid, setFid] = useState(1);
  const [level, setLevel] = useState(4);
  const [n, setN] = useState(16);
  const field = FIELDS.find((x) => x.id === fid) ?? FIELDS[0];
  const ref = useMemo(() => segPath(march(161, -3, 3, field.f, level), pm), [field, level]);
  const ms = useMemo(() => march(n, -3, 3, field.f, level, "isolate"), [field, level, n]);
  const nodes = useMemo(() => {
    const xs = Array.from({ length: n }, (_, k) => -3 + (6 * k) / (n - 1));
    return xs.flatMap((y) => xs.map((x) => ({ p: pm([x, y]), plus: field.f(x, y) > level })));
  }, [field, level, n]);
  const lines = useMemo(() => {
    const xs = Array.from({ length: n }, (_, k) => PX0 + (PW * k) / (n - 1));
    return xs.map((x) => `M${f1(x)} ${PY0}V${PY0 + PW}M${PX0} ${f1(PY0 + PW - (x - PX0))}H${PX0 + PW}`).join("");
  }, [n]);
  return (
    <Figure caption="Comme dans le main du squelette : f1 = x² + y², c = 4, grille 16 × 16 sur [−3, 3]². Rouge : marching squares (avec la règle du code du TP). Gris épais : la même courbe calculée sur une grille très fine. Baisser la résolution : la courbe devient un polygone grossier.">
      <div className="space-y-3">
        <Choice
          label="Champ"
          options={FIELDS.map((x) => ({ value: x.id, label: `f${x.id}` }))}
          value={fid}
          onChange={(id) => {
            const next = FIELDS.find((x) => x.id === id) ?? FIELDS[0];
            setFid(id);
            setLevel(next.def);
          }}
        />
        <Slider label="Niveau c" value={level} min={field.min} max={field.max} step={field.step} onChange={setLevel} format={(v) => fr(v, 2)} />
        <Slider label="Résolution nx = ny" value={n} min={3} max={40} onChange={setN} />
        <svg viewBox="0 0 860 400" className="w-full max-w-[860px]" role="img" aria-label="Marching squares du TP comparé à une courbe de référence, selon la résolution">
          <path d={lines} stroke={C.line} strokeWidth={0.6} fill="none" />
          <rect x={PX0} y={PY0} width={PW} height={PW} fill="none" stroke={C.lineStrong} />
          <path d={ref} stroke={C.ink} strokeOpacity={0.3} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d={segPath(ms, pm)} stroke={C.red} strokeWidth={1.8} strokeLinecap="round" fill="none" />
          {nodes.map((q, k) => (
            <circle key={k} cx={q.p[0]} cy={q.p[1]} r={n > 24 ? 1.4 : 2.2} fill={q.plus ? C.orange : C.faint} />
          ))}
          <text x={PX0} y={PY0 + PW + 16} fontSize={12} fill={C.weak}>
            −3
          </text>
          <text x={PX0 + PW} y={PY0 + PW + 16} textAnchor="end" fontSize={12} fill={C.weak}>
            3
          </text>

          <text x={430} y={50} fontSize={15} fill={C.ink}>
            f{field.id}(x, y) = {field.label}
          </text>
          <text x={430} y={80} fontSize={13.5} fill={C.text}>
            niveau c = {fr(level, 2)}
          </text>
          <text x={430} y={106} fontSize={13.5} fill={C.text}>
            grille {n} × {n} nœuds → {(n - 1) * (n - 1)} cellules
          </text>
          <text x={430} y={132} fontSize={13.5} fill={C.text}>
            segments trouvés : {ms.length}
          </text>
          <line x1={430} y1={176} x2={470} y2={176} stroke={C.red} strokeWidth={2} />
          <text x={482} y={180} fontSize={13} fill={C.text}>
            marching_squares(X, Y, f, level)
          </text>
          <line x1={430} y1={204} x2={470} y2={204} stroke={C.ink} strokeOpacity={0.3} strokeWidth={5} />
          <text x={482} y={208} fontSize={13} fill={C.text}>
            référence (grille 161 × 161)
          </text>
          <circle cx={440} cy={232} r={3} fill={C.orange} />
          <text x={482} y={236} fontSize={13} fill={C.text}>
            {T("nœud ⊕ (f > c)")}
          </text>
          <text x={430} y={290} fontSize={13} fill={C.weak}>
            Les points sont exacts seulement si f est
          </text>
          <text x={430} y={310} fontSize={13} fill={C.weak}>
            linéaire sur l'arête : plus la grille est fine,
          </text>
          <text x={430} y={330} fontSize={13} fill={C.weak}>
            plus l'erreur est petite.
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// La fiche
// ---------------------------------------------------------------------------

const TP_CODE = `
# Question 1 : index de la cellule (bit i si v_i > level)
def cell_index(cell_values, level):
    index = 0
    for i, cell in enumerate(cell_values):
        if cell > level:
            index += 1 << i
    return index

# Question 2 : arête i = de P_i à P_(i+1)
def crossed_edges(cell_values, level):
    above = [cell > level for cell in cell_values]
    return [above[i] != above[(i + 1) % 4] for i in range(4)]

# Question 3 : f linéaire sur l'arête
def edge_intersection(p0, p1, f, level):
    v0 = f(p0[0], p0[1])
    v1 = f(p1[0], p1[1])
    t = (level - v0) / (v1 - v0)
    return ((1 - t) * p0[0] + t * p1[0], (1 - t) * p0[1] + t * p1[1])

# Question 5 (extrait) : cas à 4 intersections
    if len(points) == 4:
        # on isole toujours les sommets au-dessus de level
        if f(cell_points[0][0], cell_points[0][1]) > level:  # P0 et P2 au-dessus
            return [(points[0], points[3]), (points[1], points[2])]
        return [(points[0], points[1]), (points[2], points[3])]  # P1 et P3 au-dessus

# Question 6 (extrait) : toutes les cellules, sans fusionner les segments
    for j in range(ny - 1):
        for i in range(nx - 1):
            # P0 bas-gauche, P1 bas-droite, P2 haut-droite, P3 haut-gauche
            cell_points = [(X[j, i], Y[j, i]), (X[j, i + 1], Y[j, i + 1]),
                           (X[j + 1, i + 1], Y[j + 1, i + 1]), (X[j + 1, i], Y[j + 1, i])]
            segments += cell_segments(cell_points, f, level)
`;

export default function MarchingCubes() {
  return (
    <>
      <Section title="L'idée">
        <Idea>f n'est connue qu'aux nœuds d'une grille : pour tracer la courbe f = c, on traite chaque cellule seule.</Idea>
        <p>Chaque valeur est une hauteur : la grille devient un relief.</p>
        <p>La courbe f = c est la coupe de ce relief par le plan horizontal z = c.</p>
        <p>
          En 2D, on obtient des segments : c'est le <strong>marching squares</strong>. En 3D, des triangles : c'est le{" "}
          <strong>marching cubes</strong>.
        </p>
        <Relief />
      </Section>

      <Section title="Une cellule : signes, index, interpolation">
        <p>Les sommets P0, P1, P2, P3 tournent dans le sens trigonométrique, depuis le coin bas gauche.</p>
        <p>L'arête k va de Pk à Pk+1 ; l'arête 3 va de P3 à P0.</p>
        <p>
          Un sommet est <strong>⊕</strong> si sa valeur est &gt; c, <strong>⊖</strong> sinon : 2⁴ = 16 configurations.
        </p>
        <p>
          Une arête est <strong>traversée</strong> si ses deux extrémités ont des signes différents.
        </p>
        <CellSigns />
        <p>Sur une arête traversée, on suppose f linéaire : le point f = c est à la fraction t, depuis l'extrémité v0.</p>
        <EdgeT />
        <Formula>
          <div>t = (c − v0) / (v1 − v0)</div>
          <div className="mt-2">point = A + t·(B − A) = (1 − t)·A + t·B</div>
          <div className="mt-2 text-[13px] text-fg-weak">A porte la valeur v0, B porte la valeur v1</div>
          <div className="mt-3">index = Σ 2^k pour chaque Pk ⊕ (bits P3 P2 P1 P0)</div>
        </Formula>
      </Section>

      <Section title="L'exercice : tracer f = 5 sur la grille 3 × 3">
        <p>Grille du cours, lignes de haut en bas : 1, 3, 2 / 4, 8, 6 / 2, 7, 3. Niveau c = 5.</p>
        <Stepper
          steps={EX_STEPS}
          interval={2800}
          caption="Lecture ⏵ : la méthode complète, cellule par cellule. Points rouges : intersections sur les arêtes ; segments jaunes : la courbe."
        >
          {(i) => <ExerciseFig step={i} />}
        </Stepper>
        <p>On fait maintenant varier c : la même méthode recalcule tout.</p>
        <GridLive />
      </Section>

      <Section title="Le cas ambigu">
        <p>Deux ⊕ en diagonale (index 5 ou 10) : les 4 arêtes sont traversées.</p>
        <p>On peut relier les 4 points de deux façons : il faut choisir.</p>
        <p>
          Règle du cours : la <strong>moyenne m</strong> des 4 valeurs donne le signe du centre de la cellule.
        </p>
        <p>Quelle que soit la règle, on garde la même partout.</p>
        <Ambiguous />
        <Note title="La règle du code du TP">
          <p>Le code du TP isole toujours les sommets ⊕ : il traite le centre comme ⊖.</p>
          <p>C'est aussi une règle fixe : le tracé reste cohérent d'une cellule à l'autre.</p>
        </Note>
      </Section>

      <Section title="Marching cubes : passage en 3D">
        <p>Même méthode, mais la cellule est un cube entre deux coupes voisines.</p>
        <Stepper steps={CUBE_STEPS} interval={3000} caption="Exemple du cours : v0 = 8, v1 = 4, v2 = 3, v3 = 2, v4 = 3, v5 = 2, v6 = 1, v7 = 2, c = 5.">
          {(i) => <CubeFig step={i} />}
        </Stepper>
        <table className="ftable">
          <thead>
            <tr>
              <th />
              <th>Marching squares (2D)</th>
              <th>Marching cubes (3D)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cellule</td>
              <td>carré, 4 sommets, 4 arêtes</td>
              <td>cube, 8 sommets, 12 arêtes</td>
            </tr>
            <tr>
              <td>Index</td>
              <td>4 bits → 16 cas</td>
              <td>8 bits → 256 cas (15 motifs : 14 + le vide)</td>
            </tr>
            <tr>
              <td>Position</td>
              <td>t = (c − v0)/(v1 − v0) sur l'arête</td>
              <td>pareil, sur chaque arête traversée</td>
            </tr>
            <tr>
              <td>Résultat</td>
              <td>segments</td>
              <td>triangles, lus dans une table précalculée</td>
            </tr>
            <tr>
              <td>En plus</td>
              <td>—</td>
              <td>normales = gradient (différences centrales)</td>
            </tr>
          </tbody>
        </table>
        <Formula>
          <div>gx = (f(i+1, j, k) − f(i−1, j, k)) / 2 &nbsp; (de même pour gy et gz)</div>
          <div className="mt-2">n = ∇f / ‖∇f‖ (au signe près)</div>
        </Formula>
      </Section>

      <Section title="Côté TP : le code à connaître">
        <p>Le TP donne un squelette Python (numpy, matplotlib) : grille et affichage sont fournis.</p>
        <p>Il faut écrire l'algorithme, puis l'utiliser pour étudier sa précision et ses limites.</p>
        <table className="ftable">
          <thead>
            <tr>
              <th>Q</th>
              <th>Fonction</th>
              <th>À faire</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <code>cell_index(cell_values, level)</code>
              </td>
              <td>index 0 à 15 : bit i à 1 si v_i &gt; c</td>
            </tr>
            <tr>
              <td>2</td>
              <td>
                <code>crossed_edges(cell_values, level)</code>
              </td>
              <td>4 booléens : arête i traversée si P_i et P_(i+1) ont des signes différents</td>
            </tr>
            <tr>
              <td>3</td>
              <td>
                <code>edge_intersection(p0, p1, f, level)</code>
              </td>
              <td>trouver t tel que f((1 − t)P0 + tP1) = c, renvoyer le point</td>
            </tr>
            <tr>
              <td>4</td>
              <td>
                <code>cell_intersections(cell_points, f, level)</code>
              </td>
              <td>4 entrées : le point de chaque arête, ou None</td>
            </tr>
            <tr>
              <td>5</td>
              <td>
                <code>cell_segments(cell_points, f, level)</code>
              </td>
              <td>relier les points pour les 16 cas ; documenter la règle des 2 cas à 4 points</td>
            </tr>
            <tr>
              <td>6</td>
              <td>
                <code>marching_squares(X, Y, f, level)</code>
              </td>
              <td>toutes les cellules ; ne pas fusionner les segments</td>
            </tr>
            <tr>
              <td>7</td>
              <td>validation</td>
              <td>f1 = x² + y², plusieurs résolutions et niveaux, comparer à ax.contour</td>
            </tr>
            <tr>
              <td>8</td>
              <td>autres champs</td>
              <td>f2 à f6 ; effet de la résolution</td>
            </tr>
          </tbody>
        </table>
        <Formula>
          <div>f linéaire sur l'arête : f((1 − t)P0 + tP1) = (1 − t)·v0 + t·v1</div>
          <div className="mt-2">(1 − t)·v0 + t·v1 = c ⇒ t = (c − v0) / (v1 − v0)</div>
        </Formula>
        <Code lang="python" code={TP_CODE} mark={[5, 12, 18, 25]} />
        <TpResolution />
        <Note title="Référence du squelette">
          <p>
            Dans <code>plot_scalar_field</code>, <code>ax.contour</code> est calculé sur la même grille nx × ny.
          </p>
          <p>Il sert à vérifier le code, pas à mesurer l'écart avec la vraie courbe.</p>
        </Note>
        <p>
          <strong>Extensions</strong> (moins guidées, indépendantes) :
        </p>
        <ul className="flist">
          <li>Ambiguïté : pourquoi, toutes les solutions, signe des points intérieurs, une méthode pour choisir.</li>
          <li>Relier les contours : passer d'une liste de segments à des courbes ; l'orientation compte-t-elle ?</li>
          <li>Marching cubes : ce qui change en 3D, quelques configurations, les cas ambigus.</li>
          <li>Autres échantillonnages : points aléatoires, grille triangulaire, hexagonale, hiérarchique.</li>
        </ul>
        <table className="ftable">
          <thead>
            <tr>
              <th>Question probable sur le TP</th>
              <th>Réponse courte</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pourquoi deux cellules voisines se raccordent ?</td>
              <td>L'arête commune a les mêmes valeurs des deux côtés : même point.</td>
            </tr>
            <tr>
              <td>Et si une valeur vaut exactement c ?</td>
              <td>Elle est ⊖ (test v &gt; c) ; le point tombe sur le nœud (t = 0 ou 1).</td>
            </tr>
            <tr>
              <td>Effet de la résolution ?</td>
              <td>Grille fine : courbe proche de la vraie. Grille grossière : polygone, détails perdus.</td>
            </tr>
            <tr>
              <td>Relier les segments en courbes ?</td>
              <td>Chaîner les segments qui partagent une extrémité : polylignes, fermées si la courbe se referme.</td>
            </tr>
            <tr>
              <td>Que changer pour la 3D ?</td>
              <td>Cube à 8 sommets, 12 arêtes, index sur 8 bits, table de triangles, normales par le gradient.</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Une cellule à la fois : signes des coins → index → points sur les arêtes traversées → segments.</li>
          <li>Pk est ⊕ si vk &gt; c ; index = Σ 2^k pour Pk ⊕, de 0 à 15.</li>
          <li>Arête traversée ⇔ extrémités de signes différents.</li>
          <li>t = (c − v0)/(v1 − v0), mesuré depuis l'extrémité v0.</li>
          <li>Cas 5 et 10 (⊕ en diagonale) : ambigus ; une règle fixe partout (cours : moyenne m comparée à c).</li>
          <li>3D : cube, 8 bits, 256 cas, 15 motifs (14 + le vide), table de triangles, normales = gradient.</li>
        </Points>
        <Trap>
          <p>Reporter t depuis la mauvaise extrémité.</p>
          <p>
            Cellule haut droite : l'arête 3 va de P3 (3, en haut) à P0 (8, en bas). t = 0,4 se mesure depuis le 3 : le point est en (1 ; 1,6), pas
            en (1 ; 1,4).
          </p>
          <p>Le bon point est le même que celui de la cellule voisine : la courbe ne se casse pas.</p>
        </Trap>
        <Trap title="Piège : le cas ambigu">
          <p>Changer de règle d'une cellule à l'autre fait des trous ou des croisements.</p>
          <p>Choisir une règle (moyenne, ou toujours isoler les ⊕) et la garder partout.</p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal
          question={
            <p>
              Grille 3 × 3 (lignes de haut en bas) : 1, 3, 2 / 4, 8, 6 / 2, 7, 3. Niveau c = 5. Donner l'index de chaque cellule et la courbe f = 5.
            </p>
          }
        >
          <p>⊕ : 7, 8 et 6 (valeurs &gt; 5).</p>
          <p>Index (bits P3 P2 P1 P0) : bas gauche 0110 = 6, bas droite 1101 = 13, haut gauche 0010 = 2, haut droite 0011 = 3.</p>
          <p>
            Points : de 2 à 7, t = 0,6 → (0,6 ; 0) ; de 4 à 8, t = 0,25 → (0,25 ; 1) ; de 8 à 3, t = 0,6 → (1 ; 1,6) ; de 6 à 2, t = 0,25 → (2 ;
            1,25) ; de 7 à 3, t = 0,5 → (1,5 ; 0) ; de 3 à 6, t ≈ 0,67 → (2 ; 0,67).
          </p>
          <p>Courbe : ligne brisée (0,6 ; 0) → (0,25 ; 1) → (1 ; 1,6) → (2 ; 1,25), plus le segment (1,5 ; 0) → (2 ; ≈ 0,67) qui isole le coin du 3.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              TP : que renvoie <code>cell_index([5, 1, 7, 0], 3)</code> ? Que fait ensuite <code>cell_segments</code> sur cette cellule ?
            </p>
          }
        >
          <p>5 &gt; 3 donne le bit 0 ; 7 &gt; 3 donne le bit 2. Index = 1 + 4 = 5.</p>
          <p>Index 5 : P0 et P2 ⊕ en diagonale. Cas ambigu : les 4 arêtes sont traversées.</p>
          <p>Le code du TP isole toujours les ⊕ : segments (arête 0, arête 3) et (arête 1, arête 2).</p>
          <p>
            Avec la règle du cours : m = (5 + 1 + 7 + 0)/4 = 3,25 &gt; 3, centre ⊕, donc (arête 0, arête 1) et (arête 2, arête 3). Les deux règles
            sont valables si on garde la même partout.
          </p>
        </Reveal>
        <Reveal
          question={
            <p>
              Marching cubes : v0 = 8, v1 = 4, v2 = 3, v3 = 2, v4 = 3, v5 = 2, v6 = 1, v7 = 2, c = 5. Index, arêtes coupées, positions ? Pourquoi
              une table suffit-elle ?
            </p>
          }
        >
          <p>Seul v0 est ⊕ : index 00000001 = 1.</p>
          <p>Arêtes coupées : celles qui touchent v0, soit 0, 3 et 8. Un seul triangle.</p>
          <p>Depuis v0 : t = (5 − 8)/(4 − 8) = 0,75 ; (5 − 8)/(2 − 8) = 0,5 ; (5 − 8)/(3 − 8) = 0,6.</p>
          <p>8 sommets à 2 états : 2⁸ = 256 cas, tous précalculés dans une table. Par rotations et symétries, ils se ramènent à 15 motifs (14 + le vide).</p>
        </Reveal>
      </Section>
    </>
  );
}
