"use client";
// Fiche CM5 : représentations de la géométrie (droite, explicite / implicite)
// et visual hull (silhouettes, cônes de vue, voxel carving), plus le TP 3.
// Exemples et nombres : plan de la vidéo iiv-cm-06-visual-hull et sujet du TP.
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
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

/** Nombre affiché à la française : virgule décimale, vrai signe moins. */
const fr = (x: number, d = 2) => {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d).replace(".", ",").replace("-", "−");
};
/** Entier avec espaces de milliers (déterministe, sans toLocaleString). */
const nb = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

type V2 = readonly [number, number];
const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + k * b[0], a[1] + k * b[1]];

// ===========================================================================
// 1. Une droite, trois écritures (P0 = (1, 1), P1 = (1.8, 1.6))
// ===========================================================================

const LX = (x: number) => 430 + x * 100;
const LY = (y: number) => 290 - y * 100;
const M_SLOPE = 0.6 / 0.8; // 0.75
const B_INTER = 1 - M_SLOPE * 1; // 0.25
const NX = -0.6;
const NY = 0.8;
const D_IMP = 1 * NX + 1 * NY; // 0.2
const fImp = (x: number, y: number) => x * NX + y * NY - D_IMP;

type Form = "ps" | "par" | "imp";

function LineForms() {
  const [form, setForm] = useState<Form>("ps");
  const [x, setX] = useState(2.3);
  const [t, setT] = useState(0.5);
  const [k, setK] = useState(0.3);

  const yx = M_SLOPE * x + B_INTER;
  const L: V2 = [1 + 0.8 * t, 1 + 0.6 * t];
  const Q: V2 = [2.2 - 0.2 * k, 0.5 + 1.5 * k];
  const fQ = fImp(Q[0], Q[1]);
  const H: V2 = [Q[0] - fQ * NX, Q[1] - fQ * NY];
  const fColor = Math.abs(fQ) < 0.005 ? C.ink : fQ > 0 ? C.red : C.blue;

  const textLines: { s: string; c?: string; strong?: boolean }[] =
    form === "ps"
      ? [
          { s: "y − y0 = m (x − x0)", strong: true },
          { s: "m = (y1 − y0) / (x1 − x0)" },
          { s: "  = 0,6 / 0,8 = 0,75" },
          { s: "y = m·x + b,  b = y0 − m·x0 = 0,25" },
          { s: `x = ${fr(x)}  →  y = ${fr(yx)}`, c: C.orange },
          { s: "→ donne y à partir de x", c: C.weak },
        ]
      : form === "par"
        ? [
            { s: "L(t) = P0 + t·u", strong: true },
            { s: "u = (P1 − P0) / ‖P1 − P0‖" },
            { s: "  = (0,8 ; 0,6)   (‖P1 − P0‖ = 1)" },
            { s: "t = 0 → P0,  t = 1 → P1" },
            { s: `t = ${fr(t)}  →  L = (${fr(L[0])} ; ${fr(L[1])})`, c: C.red },
            { s: "→ t régulier : points espacés", c: C.weak },
          ]
        : [
            { s: "f(P) = ⟨P, n⟩ − d = 0", strong: true },
            { s: "n = (−0,6 ; 0,8), ‖n‖ = 1" },
            { s: "d = ⟨P0, n⟩ = −0,6 + 0,8 = 0,2" },
            { s: "f > 0 côté de n,  f < 0 de l'autre" },
            { s: `Q = (${fr(Q[0])} ; ${fr(Q[1])})  →  f(Q) = ${fr(fQ)}`, c: fColor },
            { s: "→ teste un point : côté, distance |f|", c: C.weak },
          ];

  return (
    <Figure caption="Même droite, trois écritures. Choisir la forme, puis bouger le curseur : point-slope calcule y, parametric avance le long de la droite, implicit teste un point.">
      <div className="space-y-4">
        <Choice<Form>
          options={[
            { value: "ps", label: "point-slope" },
            { value: "par", label: "parametric" },
            { value: "imp", label: "implicit" },
          ]}
          value={form}
          onChange={setForm}
        />
        <svg viewBox="0 0 770 320" className="w-full max-w-[860px]" role="img" aria-label="Droite passant par P0 et P1 sous trois formes">
          <ArrowMarkers />
          {/* demi-plans de la forme implicite */}
          <AnimatePresence>
            {form === "imp" && (
              <motion.g key="half" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <polygon points={`${LX(0)},${LY(0.25)} ${LX(3)},${LY(2.5)} ${LX(0)},${LY(2.5)}`} fill={C.red} fillOpacity={0.1} />
                <polygon points={`${LX(0)},${LY(0)} ${LX(3)},${LY(0)} ${LX(3)},${LY(2.5)} ${LX(0)},${LY(0.25)}`} fill={C.blue} fillOpacity={0.1} />
                <text x={LX(0.25)} y={LY(2.2)} fill={C.red} fontSize={14}>
                  f &gt; 0
                </text>
                <text x={LX(2.4)} y={LY(0.35)} fill={C.blue} fontSize={14}>
                  f &lt; 0
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* axes */}
          <line x1={LX(0)} y1={LY(0)} x2={LX(3.2)} y2={LY(0)} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />
          <line x1={LX(0)} y1={LY(0)} x2={LX(0)} y2={LY(2.68)} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />
          {[1, 2, 3].map((v) => (
            <g key={`tx${v}`}>
              <line x1={LX(v)} y1={LY(0)} x2={LX(v)} y2={LY(0) + 5} stroke={C.lineStrong} />
              <text x={LX(v)} y={LY(0) + 20} textAnchor="middle" fill={C.weak} fontSize={12}>
                {v}
              </text>
            </g>
          ))}
          {[1, 2].map((v) => (
            <g key={`ty${v}`}>
              <line x1={LX(0) - 5} y1={LY(v)} x2={LX(0)} y2={LY(v)} stroke={C.lineStrong} />
              <text x={LX(0) - 10} y={LY(v) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
                {v}
              </text>
            </g>
          ))}
          <text x={LX(3.2) + 6} y={LY(0) + 4} fill={C.weak} fontSize={13}>
            x
          </text>
          <text x={LX(0) + 8} y={LY(2.68) + 4} fill={C.weak} fontSize={13}>
            y
          </text>

          {/* la droite */}
          <line x1={LX(0)} y1={LY(0.25)} x2={LX(3)} y2={LY(2.5)} stroke={C.ink} strokeWidth={2} />

          <AnimatePresence mode="wait">
            {form === "ps" && (
              <motion.g key="ps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <path d={`M${LX(1)},${LY(1)} L${LX(1.8)},${LY(1)} L${LX(1.8)},${LY(1.6)}`} fill="none" stroke={C.weak} strokeDasharray="4 3" />
                <text x={LX(1.4)} y={LY(1) + 17} textAnchor="middle" fill={C.weak} fontSize={12}>
                  0,8
                </text>
                <text x={LX(1.8) + 7} y={LY(1.3) + 4} fill={C.weak} fontSize={12}>
                  0,6
                </text>
                <circle cx={LX(0)} cy={LY(B_INTER)} r={5} fill={C.purple} />
                <text x={LX(0) - 10} y={LY(B_INTER) + 4} textAnchor="end" fill={C.purple} fontSize={12}>
                  b = 0,25
                </text>
                <line x1={LX(x)} y1={LY(yx)} x2={LX(x)} y2={LY(0)} stroke={C.orange} strokeDasharray="3 3" />
                <line x1={LX(x)} y1={LY(yx)} x2={LX(0)} y2={LY(yx)} stroke={C.orange} strokeDasharray="3 3" />
                <circle cx={LX(x)} cy={LY(yx)} r={6.5} fill={C.orange} />
              </motion.g>
            )}
            {form === "par" && (
              <motion.g key="par" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <line x1={LX(1)} y1={LY(1)} x2={LX(1.8)} y2={LY(1.6)} stroke={C.blue} strokeWidth={3} markerEnd="url(#arr-blue)" />
                <text x={LX(1.45) + 10} y={LY(1.3) + 18} fill={C.blue} fontSize={14}>
                  u
                </text>
                {[0.25, 0.5, 0.75].map((tt) => (
                  <circle key={tt} cx={LX(1 + 0.8 * tt)} cy={LY(1 + 0.6 * tt)} r={3.5} fill={C.red} fillOpacity={0.55} />
                ))}
                <circle cx={LX(L[0])} cy={LY(L[1])} r={6.5} fill={C.red} />
                <text x={LX(L[0]) - 12} y={LY(L[1]) - 10} textAnchor="end" fill={C.red} fontSize={13}>
                  L(t)
                </text>
              </motion.g>
            )}
            {form === "imp" && (
              <motion.g key="imp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <line x1={LX(1.4)} y1={LY(1.3)} x2={LX(1.4 + 0.5 * NX)} y2={LY(1.3 + 0.5 * NY)} stroke={C.purple} strokeWidth={2.5} markerEnd="url(#arr-purple)" />
                <text x={LX(1.4 + 0.5 * NX) - 6} y={LY(1.3 + 0.5 * NY) - 6} textAnchor="end" fill={C.purple} fontSize={14}>
                  n
                </text>
                <line x1={LX(Q[0])} y1={LY(Q[1])} x2={LX(H[0])} y2={LY(H[1])} stroke={C.ink} strokeDasharray="3 3" />
                <circle cx={LX(Q[0])} cy={LY(Q[1])} r={6.5} fill={fColor} />
                <text x={LX(Q[0]) + 12} y={LY(Q[1]) + 5} fill={C.ink} fontSize={13}>
                  Q · |f(Q)| = {fr(Math.abs(fQ))}
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* P0 et P1 */}
          <circle cx={LX(1)} cy={LY(1)} r={5} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          <circle cx={LX(1.8)} cy={LY(1.6)} r={5} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          <text x={LX(1) - 9} y={LY(1) - 8} textAnchor="end" fill={C.ink} fontSize={13}>
            P0
          </text>
          <text x={LX(1.8) - 9} y={LY(1.6) - 8} textAnchor="end" fill={C.ink} fontSize={13}>
            P1
          </text>

          {/* formules à gauche */}
          <text x={20} y={26} fill={C.weak} fontSize={12}>
            P0 = (1 ; 1)   P1 = (1,8 ; 1,6)
          </text>
          <AnimatePresence mode="wait">
            <motion.g key={form} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {textLines.map((l, i) => (
                <text key={i} x={20} y={70 + i * 36} fill={l.c ?? (l.strong ? C.ink : C.text)} fontSize={l.strong ? 15 : 14} fontWeight={l.strong ? 600 : 400}>
                  {l.s}
                </text>
              ))}
            </motion.g>
          </AnimatePresence>
        </svg>
        {form === "ps" && <Slider label="x" value={x} min={0} max={3} step={0.05} onChange={setX} format={(v) => fr(v)} />}
        {form === "par" && <Slider label="t" value={t} min={0} max={1} step={0.01} onChange={setT} format={(v) => fr(v)} />}
        {form === "imp" && <Slider label="Q monte" value={k} min={0} max={1} step={0.01} onChange={setK} format={(v) => `${Math.round(v * 100)} %`} />}
      </div>
    </Figure>
  );
}

// ===========================================================================
// 2. Explicite : maillage, triangle paramétré, nuage de points
// ===========================================================================

function MeshAndTriangle() {
  const [n, setN] = useState(8);
  const [a, setA] = useState(0.3);
  const [b, setB] = useState(0.3);
  const R = 110;
  const cx = 140;
  const cy = 140;
  const verts = Array.from({ length: n }, (_, i) => {
    const th = (2 * Math.PI * i) / n;
    return [cx + R * Math.cos(th), cy - R * Math.sin(th)] as const;
  });
  const gap = 2 * (1 - Math.cos(Math.PI / n));

  // triangle A, B, C du maillage V = [(0,0), (3,0), (1.5,2), (-1.5,1.5)], F = [[0,1,2],[0,2,3]]
  const tx = (x: number) => 125 + x * 70;
  const ty = (y: number) => 200 - y * 70;
  const V: V2[] = [
    [0, 0],
    [3, 0],
    [1.5, 2],
    [-1.5, 1.5],
  ];
  const p: V2 = [3 * a + 1.5 * b, 2 * b];

  return (
    <Figure caption="À gauche : plus de triangles, meilleure approximation du cercle (rayon 2), jamais exacte. À droite : deux paramètres a, b suffisent pour atteindre chaque point du triangle : c'est explicite.">
      <div className="space-y-4">
        <div className="grid items-center gap-4 md:grid-cols-2">
          <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Disque maillé en éventail">
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.weak} strokeDasharray="5 4" />
            {verts.map((v, i) => {
              const w = verts[(i + 1) % n];
              return (
                <polygon
                  key={`${n}-${i}`}
                  points={`${cx},${cy} ${v[0].toFixed(1)},${v[1].toFixed(1)} ${w[0].toFixed(1)},${w[1].toFixed(1)}`}
                  fill={C.blue}
                  fillOpacity={i % 2 ? 0.14 : 0.28}
                  stroke={C.blue}
                  strokeWidth={1}
                />
              );
            })}
            {verts.map((v, i) => (
              <circle key={`v${i}`} cx={v[0]} cy={v[1]} r={2.8} fill={C.ink} />
            ))}
            <text x={8} y={20} fill={C.ink} fontSize={13}>
              n = {n} triangles
            </text>
            <text x={8} y={272} fill={C.weak} fontSize={12}>
              écart max au cercle : {fr(gap)}
            </text>
          </svg>
          <svg viewBox="0 0 360 250" className="mx-auto w-full max-w-[380px]" role="img" aria-label="Triangle paramétré par a et b">
            <ArrowMarkers />
            <polygon points={[V[0], V[2], V[3]].map((q) => `${tx(q[0])},${ty(q[1])}`).join(" ")} fill={C.fill2} stroke={C.lineStrong} />
            <polygon points={[V[0], V[1], V[2]].map((q) => `${tx(q[0])},${ty(q[1])}`).join(" ")} fill={C.green} fillOpacity={0.14} stroke={C.green} strokeWidth={2} />
            <line x1={tx(0)} y1={ty(0)} x2={tx(3 * a)} y2={ty(0)} stroke={C.orange} strokeWidth={2} markerEnd="url(#arr-orange)" />
            <line x1={tx(3 * a)} y1={ty(0)} x2={tx(p[0])} y2={ty(p[1])} stroke={C.purple} strokeWidth={2} markerEnd="url(#arr-purple)" />
            <motion.circle animate={{ cx: tx(p[0]), cy: ty(p[1]) }} transition={{ type: "spring", stiffness: 260, damping: 26 }} r={6.5} fill={C.red} />
            <text x={tx(p[0]) + 10} y={ty(p[1]) - 8} fill={C.red} fontSize={13}>
              p
            </text>
            {V.map((q, i) => (
              <circle key={i} cx={tx(q[0])} cy={ty(q[1])} r={4} fill={C.ink} />
            ))}
            <text x={tx(0) - 6} y={ty(0) + 18} textAnchor="middle" fill={C.ink} fontSize={13}>
              0 (A)
            </text>
            <text x={tx(3) - 4} y={ty(0) + 18} textAnchor="middle" fill={C.ink} fontSize={13}>
              1 (B)
            </text>
            <text x={tx(1.5)} y={ty(2) - 10} textAnchor="middle" fill={C.ink} fontSize={13}>
              2 (C)
            </text>
            <text x={tx(-1.5)} y={ty(1.5) - 10} textAnchor="middle" fill={C.ink} fontSize={13}>
              3
            </text>
            <text x={10} y={245} fill={C.text} fontSize={13}>
              p = A + a(B − A) + b(C − A)
            </text>
          </svg>
        </div>
        <p className="font-mono text-[13px] text-fg-weak">
          V = [(0 ; 0), (3 ; 0), (1,5 ; 2), (−1,5 ; 1,5)] · F = [[0, 1, 2], [0, 2, 3]]
        </p>
        <Slider label="n (triangles)" value={n} min={6} max={40} onChange={setN} />
        <Slider
          label="a (vers B)"
          value={a}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => {
            setA(v);
            if (v + b > 1) setB(1 - v);
          }}
          format={(v) => fr(v)}
        />
        <Slider
          label="b (vers C)"
          value={b}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => {
            setB(v);
            if (a + v > 1) setA(1 - v);
          }}
          format={(v) => fr(v)}
        />
      </div>
    </Figure>
  );
}

const CLOUD_R = [1.5, 1.6, 1.45, 1.55, 1.5, 1.4, 1.6, 1.5, 1.45, 1.55, 1.5, 1.6];
const CLOUD: V2[] = CLOUD_R.map((r, k) => [r * Math.cos((k * Math.PI) / 6), r * Math.sin((k * Math.PI) / 6)]);
const ORDER_A = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const ORDER_B = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
type CloudMode = "pts" | "a" | "b";

function PointCloud() {
  const [mode, setMode] = useState<CloudMode>("pts");
  const px = (x: number) => 150 + x * 62;
  const py = (y: number) => 140 - y * 62;
  const order = mode === "a" ? ORDER_A : ORDER_B;
  const d = order.map((i, j) => `${j ? "L" : "M"}${px(CLOUD[i][0]).toFixed(1)},${py(CLOUD[i][1]).toFixed(1)}`).join(" ") + " Z";
  return (
    <Figure caption="Nuage de points : 12 points avec leur normale. Rien ne dit qui est voisin de qui : deux façons de relier les mêmes points donnent deux formes différentes.">
      <div className="space-y-3">
        <Choice<CloudMode>
          options={[
            { value: "pts", label: "points seuls" },
            { value: "a", label: "relier 0, 1, 2…" },
            { value: "b", label: "relier 0, 2, 4…" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <svg viewBox="0 0 300 290" className="mx-auto w-full max-w-[320px]" role="img" aria-label="Nuage de 12 points sans topologie">
          <ArrowMarkers />
          {mode !== "pts" && (
            <motion.path key={mode} d={d} fill="none" stroke={mode === "a" ? C.green : C.orange} strokeWidth={1.8} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
          )}
          {CLOUD.map((q, k) => {
            const r = Math.hypot(q[0], q[1]);
            const nx = q[0] / r;
            const ny = q[1] / r;
            return (
              <g key={k}>
                <line x1={px(q[0])} y1={py(q[1])} x2={px(q[0]) + nx * 20} y2={py(q[1]) - ny * 20} stroke={C.cyan} strokeWidth={1.5} markerEnd="url(#arr-cyan)" />
                <circle cx={px(q[0])} cy={py(q[1])} r={4} fill={C.ink} />
                <text x={px(q[0]) - nx * 17} y={py(q[1]) + ny * 17 + 4} textAnchor="middle" fill={C.weak} fontSize={12}>
                  {k}
                </text>
              </g>
            );
          })}
          {mode === "b" && (
            <motion.text x={150} y={150} textAnchor="middle" fill={C.orange} fontSize={34} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}>
              ?
            </motion.text>
          )}
          <text x={150} y={282} textAnchor="middle" fill={C.weak} fontSize={12}>
            capture facile : lidar, photogrammétrie
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ===========================================================================
// 3. Implicite : SDF d'un cercle (canvas) et grille de densité (voxels)
// ===========================================================================

const SDF_N = 400;

function drawSdf(cv: HTMLCanvasElement, px: number, py: number) {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const N = SDF_N;
  const img = ctx.createImageData(N, N);
  const lerp = (u: number, v: number, s: number) => u + (v - u) * s;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -2 + (4 * (i + 0.5)) / N;
      const y = 2 - (4 * (j + 0.5)) / N;
      const f = Math.hypot(x, y) - 1;
      let r: number;
      let g: number;
      let b: number;
      if (f < 0) {
        const s = Math.min(1, -f);
        r = lerp(170, 30, s);
        g = lerp(190, 55, s);
        b = lerp(255, 165, s);
      } else {
        const s = Math.min(1, f / 1.83);
        r = lerp(255, 135, s);
        g = lerp(180, 30, s);
        b = lerp(165, 35, s);
      }
      // lignes de niveau tous les 0,25 : la distance se lit comme sur une carte
      const q = f / 0.25;
      if (Math.abs(q - Math.round(q)) < 0.05) {
        r *= 0.72;
        g *= 0.72;
        b *= 0.72;
      }
      const o = 4 * (j * N + i);
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const X = (x: number) => ((x + 2) / 4) * N;
  const Y = (y: number) => ((2 - y) / 4) * N;
  // contour f = 0
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), N / 4, 0, 2 * Math.PI);
  ctx.stroke();
  // étiquettes
  ctx.font = "600 22px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  const label = (t: string, x: number, y: number, color: string) => {
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#15171e";
    ctx.strokeText(t, X(x), Y(y));
    ctx.fillStyle = color;
    ctx.fillText(t, X(x), Y(y));
  };
  label("f < 0", 0, 0.35, "#e8e8ec");
  label("f > 0", 1.45, 1.7, "#e8e8ec");
  label("f = 0", 1.15, -1.15, "#facc15");
  // point testé et segment vers le point le plus proche du cercle
  const r0 = Math.hypot(px, py);
  if (r0 > 1e-6) {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(px), Y(py));
    ctx.lineTo(X(px / r0), Y(py / r0));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = "#15171e";
  ctx.beginPath();
  ctx.arc(X(px), Y(py), 11, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(X(px), Y(py), 7, 0, 2 * Math.PI);
  ctx.fill();
}

function SdfCanvas({ px, py }: { px: number; py: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawSdf(ref.current, px, py);
  }, [px, py]);
  return (
    <canvas
      ref={ref}
      width={SDF_N}
      height={SDF_N}
      className="mx-auto block w-full max-w-[300px]"
      style={{ background: "#15171e" }}
      role="img"
      aria-label="Carte de la distance signée au cercle de rayon 1"
    />
  );
}

const GRID12 = Array.from({ length: 144 }, (_, k) => {
  const i = k % 12;
  const j = Math.floor(k / 12);
  const x = -2 + (i + 0.5) / 3;
  const y = 2 - (j + 0.5) / 3;
  return { i, j, rho: 1 - Math.hypot(x, y) };
});

function ImplicitFig() {
  const [px, setPx] = useState(1.4);
  const [py, setPy] = useState(0.8);
  const [s, setS] = useState(0.2);
  const f = Math.hypot(px, py) - 1;
  const where = Math.abs(f) < 0.01 ? "sur la surface" : f < 0 ? "intérieur" : "extérieur";
  const lit = GRID12.filter((c) => c.rho >= s - 1e-9).length;
  return (
    <Figure caption="À gauche : SDF du cercle de rayon 1, f(x, y) = √(x² + y²) − 1, bleu dedans, rouge dehors, lignes tous les 0,25. À droite : la même idée échantillonnée sur une grille 12 × 12 (densité ρ = 1 − √(x² + y²) = −f) ; une case s'allume si ρ ≥ s.">
      <div className="space-y-4">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-center font-mono text-[13px] text-fg-weak">SDF continue : on teste un point P</p>
            <SdfCanvas px={px} py={py} />
            <p className="text-center font-mono text-[13px] text-fg-strong">
              f(P) = {fr(f)} → {where}
              {f > 0.01 ? ` (distance ${fr(f)})` : ""}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-center font-mono text-[13px] text-fg-weak">Grille de voxels : seuil s</p>
            <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Grille 12 par 12 seuillée">
              {GRID12.map((c) => {
                const on = c.rho >= s - 1e-9;
                return (
                  <motion.rect
                    key={`${c.i}-${c.j}`}
                    x={c.i * 25 + 0.5}
                    y={c.j * 25 + 0.5}
                    width={24}
                    height={24}
                    initial={false}
                    animate={{ fillOpacity: on ? 0.9 : 0.05 + 0.22 * ((c.rho + 1.83) / 2.83) }}
                    transition={{ duration: 0.25 }}
                    fill={on ? C.cyan : C.blue}
                    stroke={on ? C.ink : C.line}
                    strokeWidth={on ? 1.2 : 0.6}
                  />
                );
              })}
            </svg>
            <p className="text-center font-mono text-[13px] text-fg-strong">
              ρ ≥ {fr(s)} : {lit} voxels pleins
            </p>
          </div>
        </div>
        <Slider label="P : x" value={px} min={-2} max={2} step={0.05} onChange={setPx} format={(v) => fr(v)} />
        <Slider label="P : y" value={py} min={-2} max={2} step={0.05} onChange={setPy} format={(v) => fr(v)} />
        <Slider label="seuil s" value={s} min={-0.4} max={0.6} step={0.05} onChange={setS} format={(v) => fr(v)} />
      </div>
    </Figure>
  );
}

// ===========================================================================
// 4. Silhouettes : chroma keying sur l'image 8 × 8 du cours
// ===========================================================================

const MASK8 = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const OLIVE = { row: 3, col: 4 };
// Couleurs de l'image elle-même (données) : fond vert (0, 0.6, 0) du cours, objet beige, pixel olive.
const PIX_GREEN = "rgb(0, 153, 0)";
const PIX_BEIGE = "rgb(226, 200, 156)";
const PIX_OLIVE = "rgb(62, 140, 28)";
const MASK_BLACK = "#0b0b0b";
const MASK_WHITE = "#f4f4f4";

function ChromaKey() {
  const cell = 30;
  const ix = 30;
  const mx = 380;
  const y0 = 44;
  const isObj = (r: number, c: number) => MASK8[r][c] === 1;
  const isOlive = (r: number, c: number) => r === OLIVE.row && c === OLIVE.col;
  const classified = (r: number, c: number) => isObj(r, c) && !isOlive(r, c);
  return (
    <Stepper
      interval={2400}
      steps={[
        "L'image : un objet beige devant un fond vert",
        "Chroma keying : proche du vert → noir (fond), sinon blanc (objet)",
        "Piège : le pixel olive, trop vert, est classé fond → trou",
        "Autre méthode : background subtraction",
      ]}
      caption="Image 8 × 8 du cours. La silhouette est un masque binaire : blanc = objet, noir = fond. Une couleur ambiguë fait un trou."
    >
      {(i) => (
        <svg viewBox="0 0 650 340" className="w-full max-w-[650px]" role="img" aria-label="Chroma keying d'une image 8 par 8">
          <ArrowMarkers />
          <text x={ix + 120} y={30} textAnchor="middle" fill={C.ink} fontSize={13}>
            image
          </text>
          <text x={mx + 120} y={30} textAnchor="middle" fill={C.ink} fontSize={13}>
            silhouette (masque)
          </text>
          {MASK8.map((row, r) =>
            row.map((_, c) => (
              <rect
                key={`i${r}-${c}`}
                x={ix + c * cell}
                y={y0 + r * cell}
                width={cell}
                height={cell}
                fill={isOlive(r, c) ? PIX_OLIVE : isObj(r, c) ? PIX_BEIGE : PIX_GREEN}
                stroke={C.paper}
                strokeWidth={1}
              />
            )),
          )}
          {/* grille vide du masque */}
          <rect x={mx} y={y0} width={8 * cell} height={8 * cell} fill="none" stroke={C.lineStrong} />
          {i >= 1 &&
            MASK8.map((row, r) =>
              row.map((_, c) => {
                const k = r * 8 + c;
                const fill = classified(r, c) ? MASK_WHITE : MASK_BLACK;
                return i === 1 ? (
                  <motion.rect
                    key={`m1-${r}-${c}`}
                    x={mx + c * cell}
                    y={y0 + r * cell}
                    width={cell}
                    height={cell}
                    fill={fill}
                    stroke={C.lineStrong}
                    strokeWidth={0.6}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + k * 0.022, duration: 0.15 }}
                  />
                ) : (
                  <rect key={`m-${r}-${c}`} x={mx + c * cell} y={y0 + r * cell} width={cell} height={cell} fill={fill} stroke={C.lineStrong} strokeWidth={0.6} />
                );
              }),
            )}
          {i === 1 && (
            <motion.rect
              x={ix - 3}
              width={8 * cell + 6}
              height={cell}
              fill="none"
              stroke={C.orange}
              strokeWidth={2.5}
              initial={{ y: y0 }}
              animate={{ y: [y0, y0 + 7 * cell] }}
              transition={{ delay: 0.2, duration: 64 * 0.022, ease: "linear" }}
            />
          )}
          <line x1={ix + 8 * cell + 14} y1={y0 + 4 * cell} x2={mx - 14} y2={y0 + 4 * cell} stroke={C.weak} strokeWidth={2} markerEnd="url(#arr-weak)" />
          <text x={(ix + 8 * cell + mx) / 2} y={y0 + 4 * cell - 10} textAnchor="middle" fill={C.weak} fontSize={12}>
            chroma keying
          </text>
          {i >= 2 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <circle cx={ix + (OLIVE.col + 0.5) * cell} cy={y0 + (OLIVE.row + 0.5) * cell} r={20} fill="none" stroke={C.red} strokeWidth={3} />
              <circle cx={mx + (OLIVE.col + 0.5) * cell} cy={y0 + (OLIVE.row + 0.5) * cell} r={20} fill="none" stroke={C.red} strokeWidth={3} />
              <path
                d={`M${ix + (OLIVE.col + 0.5) * cell + 18},${y0 + (OLIVE.row + 0.5) * cell - 18} Q${(ix + mx) / 2 + 140},${y0 - 30} ${mx + (OLIVE.col + 0.5) * cell - 18},${y0 + (OLIVE.row + 0.5) * cell - 18}`}
                fill="none"
                stroke={C.red}
                strokeWidth={2}
                markerEnd="url(#arr-red)"
              />
            </motion.g>
          )}
          {i === 2 && (
            <motion.text x={325} y={y0 + 8 * cell + 32} textAnchor="middle" fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              pixel de l'objet trop proche du vert → classé fond : trou dans la silhouette
            </motion.text>
          )}
          {i === 3 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <text x={325} y={y0 + 8 * cell + 28} textAnchor="middle" fill={C.ink} fontSize={13}>
                background subtraction : modèle statistique du fond
              </text>
              <text x={325} y={y0 + 8 * cell + 48} textAnchor="middle" fill={C.weak} fontSize={12}>
                (gaussienne, mélange de gaussiennes, histogrammes) · pièges : bruit, luminosité, couleurs ambiguës
              </text>
            </motion.g>
          )}
        </svg>
      )}
    </Stepper>
  );
}

// ===========================================================================
// 5. Visual hull 2D : objet en U et 4 caméras (scènes s12, s13 du plan)
// ===========================================================================

const U_POLY: V2[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [0.4, 1],
  [0.4, -0.3],
  [-0.4, -0.3],
  [-0.4, 1],
  [-1, 1],
];
const HOLLOW = { x0: -0.4, x1: 0.4, y0: -0.3, y1: 1 };

interface Cam {
  name: string;
  c: V2;
  f: V2;
  r: V2;
  smin: number;
  smax: number;
  pmin: V2;
  pmax: V2;
}

/** s(p) = ⟨p − C, r⟩ / ⟨p − C, f⟩ : position de la projection sur le plan image (à distance 1 de C). */
const sOf = (p: V2, k: { c: V2; f: V2; r: V2 }) => {
  const d = sub(p, k.c);
  return dot(d, k.r) / dot(d, k.f);
};

function makeCam(name: string, c: V2): Cam {
  const n = Math.hypot(c[0], c[1]);
  const f: V2 = [-c[0] / n, -c[1] / n];
  const r: V2 = [-f[1], f[0]];
  let smin = Infinity;
  let smax = -Infinity;
  let pmin = U_POLY[0];
  let pmax = U_POLY[0];
  for (const p of U_POLY) {
    const s = sOf(p, { c, f, r });
    if (s < smin) {
      smin = s;
      pmin = p;
    }
    if (s > smax) {
      smax = s;
      pmax = p;
    }
  }
  return { name, c, f, r, smin, smax, pmin, pmax };
}

const CAMS: Cam[] = [makeCam("C1", [-3.5, 0]), makeCam("C2", [3.5, 0]), makeCam("C3", [0, -3.2]), makeCam("C4", [0, 3.2])];

/** Garde la partie du polygone où ⟨a, p − c⟩ ≥ 0 (Sutherland-Hodgman). */
function clipHalf(poly: V2[], a: V2, c: V2): V2[] {
  const out: V2[] = [];
  const val = (p: V2) => dot(a, sub(p, c));
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const vp = val(p);
    const vq = val(q);
    if (vp >= 0) out.push(p);
    if (vp >= 0 !== vq >= 0) {
      const t = vp / (vp - vq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

/** Intersection des cônes de vue : smin ≤ s(p) ≤ smax pour chaque caméra. */
function hullOf(cams: Cam[]): V2[] {
  let poly: V2[] = [
    [-4.8, -4.5],
    [4.8, -4.5],
    [4.8, 4.5],
    [-4.8, 4.5],
  ];
  for (const k of cams) {
    poly = clipHalf(poly, sub(k.r, [k.smin * k.f[0], k.smin * k.f[1]]), k.c);
    poly = clipHalf(poly, sub([k.smax * k.f[0], k.smax * k.f[1]], k.r), k.c);
  }
  return poly;
}
const HULLS = [1, 2, 3, 4].map((n) => hullOf(CAMS.slice(0, n)));

const SK = 56;
const sx = (x: number) => 270 + x * SK;
const sy = (y: number) => 250 - y * SK;
const ptsOf = (ps: readonly V2[]) => ps.map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ");
const dirOf = (k: Cam, s: number): V2 => {
  const d = add(k.f, k.r, s);
  const n = Math.hypot(d[0], d[1]);
  return [d[0] / n, d[1] / n];
};
const conePoly = (k: Cam): V2[] => [k.c, add(k.c, dirOf(k, k.smin), 9), add(k.c, dirOf(k, k.smax), 9)];
const onImage = (k: Cam, s: number): V2 => add(add(k.c, k.f), k.r, s);

function pointInPoly(p: V2, poly: readonly V2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Caméras, plans image et silhouettes (intervalles noirs). */
function SceneCams({ segments, labels = true }: { segments: boolean; labels?: boolean }) {
  return (
    <g>
      {CAMS.map((k) => {
        // boîtier derrière le centre optique C, frustum ouvert vers la scène
        const back = add(k.c, k.f, -0.22);
        const body: V2[] = [
          add(add(back, k.f, 0.16), k.r, 0.16),
          add(add(back, k.f, 0.16), k.r, -0.16),
          add(add(back, k.f, -0.16), k.r, -0.16),
          add(add(back, k.f, -0.16), k.r, 0.16),
        ];
        const a = add(add(k.c, k.f, 0.38), k.r, 0.24);
        const b = add(add(k.c, k.f, 0.38), k.r, -0.24);
        const lab = add(k.c, k.f, -0.62);
        const s0 = onImage(k, -0.6);
        const s1 = onImage(k, 0.6);
        const q0 = onImage(k, k.smin);
        const q1 = onImage(k, k.smax);
        const sl = onImage(k, -0.85);
        return (
          <g key={k.name}>
            <polygon points={ptsOf(body)} fill={C.blue} fillOpacity={0.55} stroke={C.blue} strokeWidth={1.5} />
            <polygon points={ptsOf([k.c, a, b])} fill={C.blue} fillOpacity={0.2} stroke={C.blue} strokeWidth={1.5} />
            <circle cx={sx(k.c[0])} cy={sy(k.c[1])} r={2.5} fill={C.ink} />
            {labels && (
              <text x={sx(lab[0])} y={sy(lab[1]) + 5} textAnchor="middle" fill={C.blue} fontSize={13}>
                {k.name}
              </text>
            )}
            {segments && (
              <>
                <line x1={sx(s0[0])} y1={sy(s0[1])} x2={sx(s1[0])} y2={sy(s1[1])} stroke={C.weak} strokeWidth={2} />
                <line x1={sx(q0[0])} y1={sy(q0[1])} x2={sx(q1[0])} y2={sy(q1[1])} stroke={C.ink} strokeWidth={5} />
                {labels && (
                  <text x={sx(sl[0])} y={sy(sl[1]) + 4} textAnchor="middle" fill={C.ink} fontSize={12}>
                    S{k.name.slice(1)}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function HullCones() {
  return (
    <Stepper
      interval={2400}
      steps={[
        "Un objet en U, quatre caméras tournées vers lui",
        "Chaque caméra voit un segment : la silhouette Si est un intervalle",
        "Cône de C1 : il contient forcément l'objet",
        "+ cône de C2 : la région commune (cyan) se resserre",
        "+ cône de C3",
        "+ cône de C4 : l'intersection est le visual hull",
        "Le creux du U, qu'aucune silhouette ne montre, reste plein",
      ]}
      caption="Analogue 2D du cours : C1 = (−3,5 ; 0), C2 = (3,5 ; 0), C3 = (0 ; −3,2), C4 = (0 ; 3,2). Visual hull = intersection des cônes de vue = volume maximal compatible avec les silhouettes."
    >
      {(i) => {
        const nCones = i >= 2 ? Math.min(4, i - 1) : 0;
        return (
          <svg viewBox="0 0 540 500" className="mx-auto w-full max-w-[540px]" role="img" aria-label="Visual hull comme intersection de cônes de vue">
            <ArrowMarkers />
            {/* cônes */}
            {CAMS.slice(0, nCones).map((k) => (
              <motion.polygon
                key={`cone-${k.name}`}
                points={ptsOf(conePoly(k))}
                fill={C.weak}
                stroke={C.faint}
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: i >= 5 ? 0.06 : 0.14 }}
                transition={{ duration: 0.6 }}
              />
            ))}
            {/* région commune */}
            <AnimatePresence>
              {nCones > 0 && (
                <motion.polygon
                  key={`hull-${nCones}`}
                  points={ptsOf(HULLS[nCones - 1])}
                  fill={C.cyan}
                  stroke={C.cyan}
                  strokeWidth={2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, fillOpacity: nCones === 4 ? 0.35 : 0.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
            {/* rayons vers les bords de l'objet */}
            {i === 1 &&
              CAMS.map((k) => (
                <g key={`ray-${k.name}`}>
                  <line x1={sx(k.c[0])} y1={sy(k.c[1])} x2={sx(k.pmin[0])} y2={sy(k.pmin[1])} stroke={C.faint} strokeWidth={1} />
                  <line x1={sx(k.c[0])} y1={sy(k.c[1])} x2={sx(k.pmax[0])} y2={sy(k.pmax[1])} stroke={C.faint} strokeWidth={1} />
                </g>
              ))}
            {/* objet */}
            <polygon points={ptsOf(U_POLY)} fill={C.orange} fillOpacity={0.35} stroke={C.orange} strokeWidth={2} />
            {i >= 6 && (
              <motion.rect
                x={sx(HOLLOW.x0)}
                y={sy(HOLLOW.y1)}
                width={(HOLLOW.x1 - HOLLOW.x0) * SK}
                height={(HOLLOW.y1 - HOLLOW.y0) * SK}
                fill={C.yellow}
                stroke={C.yellow}
                strokeWidth={2}
                initial={{ fillOpacity: 0 }}
                animate={{ fillOpacity: 0.6 }}
                transition={{ duration: 0.6 }}
              />
            )}
            <SceneCams segments={i >= 1} />
            {i >= 5 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <line x1={sx(-1.55)} y1={sy(-1.82)} x2={sx(-0.72)} y2={sy(-1.14)} stroke={C.cyan} strokeWidth={1.5} />
                <text x={sx(-2.25)} y={sy(-2.05)} fill={C.cyan} fontSize={15} fontWeight={600}>
                  visual hull
                </text>
              </motion.g>
            )}
            {i >= 6 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <text x={sx(1.25)} y={sy(2.05)} fill={C.ink} fontSize={13}>
                  creux du U : reste plein
                </text>
                <line x1={sx(1.2)} y1={sy(1.95)} x2={sx(0.25)} y2={sy(0.85)} stroke={C.yellow} strokeWidth={2} markerEnd="url(#arr-yellow)" />
              </motion.g>
            )}
            <text x={sx(0)} y={sy(-0.65) + 4} textAnchor="middle" fill={C.ink} fontSize={12}>
              objet
            </text>
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// Algorithme VisualHull(S, P, G) sur une grille 8 × 8 de côté 0,5
// ---------------------------------------------------------------------------

const VC = [-1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75];
interface Vox {
  x: number;
  y: number;
  idx: number;
  full: boolean;
  inU: boolean;
  hollow: boolean;
}
const VOXELS: Vox[] = [...VC].reverse().flatMap((y, row) =>
  VC.map((x, col) => {
    const p: V2 = [x, y];
    const full = CAMS.every((k) => {
      const s = sOf(p, k);
      return s >= k.smin && s <= k.smax;
    });
    return {
      x,
      y,
      idx: row * 8 + col,
      full,
      inU: pointInPoly(p, U_POLY),
      hollow: x > HOLLOW.x0 && x < HOLLOW.x1 && y > HOLLOW.y0 && y < HOLLOW.y1,
    };
  }),
);
const N_FULL = VOXELS.filter((v) => v.full).length;
const N_HOLLOW = VOXELS.filter((v) => v.full && v.hollow).length;
const N_OUT = VOXELS.filter((v) => v.full && !v.inU).length;
const CORNER: V2 = [-1.75, 1.75];
const CENTER: V2 = [0.25, 0.25];
const SCAN_DT = 0.035;

const PSEUDO = `
VisualHull(S, P, G):
  // Initialization
  for voxel in G: voxel = FULL

  // Main Loop
  for voxel in G:
    for i in [1..N]:
      if projection(voxel, P[i])
          not in S[i]:
        voxel = EMPTY
`;
const PSEUDO_MARKS = [[1], [2, 3], [6, 7, 8, 9, 10], [6, 7, 8, 9], [6, 7, 8, 9, 10], []];

function VoxelCarving() {
  return (
    <Stepper
      interval={2800}
      steps={[
        "Entrées : S (N silhouettes), P (N matrices de projection), G (grille)",
        "Initialisation : tous les voxels à FULL",
        "Voxel (−1,75 ; 1,75) : projeté par C1, hors de S1 → EMPTY",
        "Voxel (0,25 ; 0,25) : dans les 4 silhouettes → reste FULL",
        "Balayage de toute la grille, ligne par ligne",
        `Résultat : ${N_FULL} voxels FULL, dont ${N_HOLLOW} dans le creux du U`,
      ]}
      caption="Grille 8 × 8 de côté 0,5 sur [−2, 2]². Un voxel est testé par son centre. Il suffit d'une caméra qui le voit hors de sa silhouette pour le vider."
    >
      {(i) => {
        const cellOpacity = (v: Vox) => (i === 0 ? 0 : i === 1 ? 0.5 : i <= 3 ? (v.idx === 0 ? 0 : 0.5) : v.full ? 0.5 : 0);
        const k1 = CAMS[0];
        const sCorner = sOf(CORNER, k1);
        const pCorner = onImage(k1, sCorner);
        return (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <svg viewBox="0 0 540 500" className="mx-auto w-full max-w-[540px]" role="img" aria-label="Voxel carving sur une grille 8 par 8">
              <ArrowMarkers />
              {/* cellules */}
              {VOXELS.map((v) => {
                const x = sx(v.x - 0.25);
                const y = sy(v.y + 0.25);
                return (
                  <g key={`cell-${v.idx}`}>
                    <rect x={x} y={y} width={0.5 * SK} height={0.5 * SK} fill="none" stroke={C.line} strokeWidth={0.8} />
                    {i === 4 ? (
                      <motion.rect
                        key={`scan-${v.idx}`}
                        x={x + 1}
                        y={y + 1}
                        width={0.5 * SK - 2}
                        height={0.5 * SK - 2}
                        fill={C.weak}
                        initial={{ opacity: v.idx === 0 ? 0 : 0.5 }}
                        animate={{ opacity: v.full ? 0.5 : 0 }}
                        transition={{ delay: 0.3 + v.idx * SCAN_DT, duration: 0.15 }}
                      />
                    ) : (
                      <motion.rect
                        key={`stat-${v.idx}`}
                        x={x + 1}
                        y={y + 1}
                        width={0.5 * SK - 2}
                        height={0.5 * SK - 2}
                        fill={C.weak}
                        initial={false}
                        animate={{ opacity: cellOpacity(v) }}
                        transition={{ duration: 0.35, delay: i === 1 ? v.idx * 0.008 : 0 }}
                      />
                    )}
                    {i === 5 && v.full && v.hollow && (
                      <motion.rect
                        x={x + 2}
                        y={y + 2}
                        width={0.5 * SK - 4}
                        height={0.5 * SK - 4}
                        fill={C.yellow}
                        fillOpacity={0.35}
                        stroke={C.yellow}
                        strokeWidth={2.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      />
                    )}
                  </g>
                );
              })}
              <polygon points={ptsOf(U_POLY)} fill="none" stroke={C.orange} strokeWidth={2.5} />
              <SceneCams segments />

              {/* test du voxel du coin avec C1 */}
              {i === 2 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <rect x={sx(CORNER[0] - 0.25)} y={sy(CORNER[1] + 0.25)} width={0.5 * SK} height={0.5 * SK} fill="none" stroke={C.red} strokeWidth={3} />
                  <motion.line
                    x1={sx(CORNER[0])}
                    y1={sy(CORNER[1])}
                    x2={sx(k1.c[0])}
                    y2={sy(k1.c[1])}
                    stroke={C.red}
                    strokeWidth={1.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                  <circle cx={sx(pCorner[0])} cy={sy(pCorner[1])} r={6} fill={C.red} />
                  <text x={sx(pCorner[0]) - 10} y={sy(pCorner[1]) - 10} textAnchor="end" fill={C.red} fontSize={12}>
                    s = {fr(sCorner)} ∉ S1
                  </text>
                </motion.g>
              )}
              {/* test du voxel central avec les 4 caméras */}
              {i === 3 && (
                <g>
                  <rect x={sx(CENTER[0] - 0.25)} y={sy(CENTER[1] + 0.25)} width={0.5 * SK} height={0.5 * SK} fill="none" stroke={C.green} strokeWidth={3} />
                  {CAMS.map((k, j) => {
                    const q = onImage(k, sOf(CENTER, k));
                    return (
                      <motion.g key={k.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.35 }}>
                        <line x1={sx(CENTER[0])} y1={sy(CENTER[1])} x2={sx(k.c[0])} y2={sy(k.c[1])} stroke={C.green} strokeWidth={1.3} />
                        <circle cx={sx(q[0])} cy={sy(q[1])} r={5.5} fill={C.green} />
                      </motion.g>
                    );
                  })}
                  <text x={sx(CENTER[0]) + 26} y={sy(CENTER[1]) - 18} fill={C.green} fontSize={13}>
                    4 / 4 ✓
                  </text>
                </g>
              )}
              {/* curseur du balayage */}
              {i === 4 && (
                <motion.rect
                  x={0}
                  y={0}
                  width={0.5 * SK}
                  height={0.5 * SK}
                  fill="none"
                  stroke={C.orange}
                  strokeWidth={3}
                  initial={{ x: sx(VOXELS[0].x - 0.25), y: sy(VOXELS[0].y + 0.25) }}
                  animate={{ x: VOXELS.map((v) => sx(v.x - 0.25)), y: VOXELS.map((v) => sy(v.y + 0.25)) }}
                  transition={{ delay: 0.3, duration: VOXELS.length * SCAN_DT, ease: "linear" }}
                />
              )}
            </svg>
            <div className="space-y-3">
              <Code lang="text" code={PSEUDO} mark={PSEUDO_MARKS[i]} />
              <div className="font-mono text-[12.5px] leading-relaxed text-fg-weak">
                {i === 5 ? (
                  <p>
                    Invariant : v = FULL ⇔ ∀i, projection(v, P[i]) ∈ S[i]. Ici {N_OUT} voxels FULL ont leur centre hors du U : le hull est plus gros que l'objet.
                  </p>
                ) : (
                  <p>S[1..N] : silhouettes · P[1..N] : matrices de projection · G : grille de voxels</p>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// Tester une projection : P 3 × 4 et masque 5 × 5 (scène s14)
// ---------------------------------------------------------------------------

const PMAT = [
  [2, 0, 1, 0],
  [0, 2, 1, 0],
  [0, 0, 1, 0],
];
const MASK5 = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
];
type Preset = "v1" | "v2" | "autre";

function Bracket({ x, y1, y2, open }: { x: number; y1: number; y2: number; open: boolean }) {
  const w = open ? 7 : -7;
  return <path d={`M${x + w},${y1} L${x},${y1} L${x},${y2} L${x + w},${y2}`} fill="none" stroke={C.ink} strokeWidth={1.5} />;
}

function ProjectionTest() {
  const [v, setV] = useState<readonly [number, number, number]>([1, 1, 2]);
  const [x, y, z] = v;
  const vec = [x, y, z, 1];
  const res = PMAT.map((row) => row.reduce((acc, m, j) => acc + m * vec[j], 0));
  const [a, b, c] = res;
  const col = Math.round(a / c);
  const row = Math.round(b / c);
  const inImg = col >= 0 && col <= 4 && row >= 0 && row <= 4;
  const inSil = inImg && MASK5[row][col] === 1;
  const ok = inSil;
  const preset: Preset = x === 1 && y === 1 && z === 2 ? "v1" : x === 3 && y === 0 && z === 1 ? "v2" : "autre";
  const mx0 = 560;
  const my0 = 20;
  const cell = 30;
  const cx = (k: number) => mx0 + (k + 1) * cell + cell / 2;
  const cy = (k: number) => my0 + (k + 1) * cell + cell / 2;
  const div = (p: number, q: number) => (p % q === 0 ? String(p / q) : `${fr(p / q)}`);
  return (
    <Figure caption="Matrice P et masque 5 × 5 du cours. On projette le centre du voxel, on divise par la 3e coordonnée, on arrondit : colonne, ligne. Pixel blanc → le voxel reste FULL pour cette caméra ; pixel noir ou hors image → EMPTY.">
      <div className="space-y-4">
        <Choice<Preset>
          label="Voxel du cours"
          options={[
            { value: "v1", label: "v1 = (1, 1, 2)" },
            { value: "v2", label: "v2 = (3, 0, 1)" },
          ]}
          value={preset}
          onChange={(p) => setV(p === "v2" ? [3, 0, 1] : [1, 1, 2])}
        />
        <svg viewBox="0 0 840 300" className="w-full max-w-[860px]" role="img" aria-label="Projection d'un voxel par une matrice 3 par 4 et test dans la silhouette">
          <text x={20} y={34} fill={C.weak} fontSize={13}>
            (a ; b ; c) = P · (x ; y ; z ; 1)
          </text>
          {/* P */}
          <Bracket x={32} y1={78} y2={188} open />
          <Bracket x={156} y1={78} y2={188} open={false} />
          {PMAT.map((r, ri) =>
            r.map((m, ci) => (
              <text key={`p${ri}${ci}`} x={52 + ci * 31} y={105 + ri * 35} textAnchor="middle" fill={C.ink} fontSize={15}>
                {m}
              </text>
            )),
          )}
          <text x={168} y={138} fill={C.weak} fontSize={15}>
            ·
          </text>
          {/* vecteur */}
          <Bracket x={180} y1={62} y2={202} open />
          <Bracket x={214} y1={62} y2={202} open={false} />
          {vec.map((e, k) => (
            <motion.text key={`v${k}-${e}`} x={197} y={86 + k * 32} textAnchor="middle" fill={k < 3 ? C.orange : C.ink} fontSize={15} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              {e}
            </motion.text>
          ))}
          <text x={232} y={138} fill={C.ink} fontSize={16}>
            =
          </text>
          {/* résultat */}
          <Bracket x={256} y1={78} y2={188} open />
          <Bracket x={296} y1={78} y2={188} open={false} />
          {res.map((e, k) => (
            <motion.text key={`r${k}-${e}`} x={276} y={105 + k * 35} textAnchor="middle" fill={C.blue} fontSize={15} fontWeight={600} initial={{ opacity: 0.25 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + k * 0.12 }}>
              {e}
            </motion.text>
          ))}
          <text x={320} y={118} fill={C.text} fontSize={14}>
            colonne = round({a}/{c}) = {col}
          </text>
          <text x={320} y={150} fill={C.text} fontSize={14}>
            ligne = round({b}/{c}) = {row}
          </text>
          <text x={320} y={176} fill={C.weak} fontSize={12}>
            ({div(a, c)} ; {div(b, c)}) arrondi
          </text>
          <motion.text key={`verdict-${ok}-${inImg}`} x={20} y={262} fill={ok ? C.green : C.red} fontSize={15} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            pixel ({col}, {row}) : {!inImg ? "hors de l'image → hors silhouette → EMPTY" : inSil ? "blanc, dans S → reste FULL" : "noir, hors de S → EMPTY"}
          </motion.text>

          {/* masque */}
          <rect x={mx0} y={my0} width={9 * cell} height={9 * cell} fill="none" stroke={C.line} strokeDasharray="4 4" />
          <text x={mx0 + 9 * cell - 4} y={my0 + 9 * cell - 6} textAnchor="end" fill={C.weak} fontSize={11}>
            hors image
          </text>
          {MASK5.map((r, ri) =>
            r.map((m, ci) => (
              <rect key={`m${ri}${ci}`} x={mx0 + (ci + 1) * cell} y={my0 + (ri + 1) * cell} width={cell} height={cell} fill={m ? MASK_WHITE : MASK_BLACK} stroke={C.lineStrong} strokeWidth={0.8} />
            )),
          )}
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={`idx${k}`}>
              <text x={cx(k)} y={my0 + cell - 8} textAnchor="middle" fill={C.weak} fontSize={11}>
                {k}
              </text>
              <text x={mx0 + cell - 8} y={cy(k) + 4} textAnchor="end" fill={C.weak} fontSize={11}>
                {k}
              </text>
            </g>
          ))}
          <motion.circle
            initial={false}
            animate={{ cx: cx(col), cy: cy(row) }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            r={9}
            fill={ok ? C.green : C.red}
            stroke={C.paper}
            strokeWidth={2.5}
          />
        </svg>
        <Slider label="x" value={x} min={-1} max={3} onChange={(n) => setV([n, y, z])} />
        <Slider label="y" value={y} min={-1} max={3} onChange={(n) => setV([x, n, z])} />
        <Slider label="z (profondeur)" value={z} min={1} max={3} onChange={(n) => setV([x, y, n])} />
      </div>
    </Figure>
  );
}

// ===========================================================================
// 6. Côté TP : architecture du MLP et mémoire
// ===========================================================================

const LAYERS = [3, 60, 120, 60, 30, 1];
const ACTS = ["entrée x, y, z", "Linear + Tanh", "Linear + ReLU", "Linear + ReLU", "Linear + ReLU", "Linear (logit)"];
const PARAMS = LAYERS.slice(1).map((n, i) => LAYERS[i] * n + n); // poids + biais
const N_PARAMS = PARAMS.reduce((s, p) => s + p, 0); // 16 681

function MlpDiagram() {
  const lx = (i: number) => 70 + i * 140;
  const nodesY = (n: number): (number | null)[] => (n === 1 ? [130] : n === 3 ? [90, 130, 170] : [55, 90, null, 170, 205]);
  const path = [130, 90, 170, 55, 205, 130];
  return (
    <Figure caption={`MLP de part2_mlp-implicit.py : 3 → 60 → 120 → 60 → 30 → 1, soit ${nb(N_PARAMS)} paramètres (poids + biais). Pas de Sigmoid dans le réseau : la sortie est un logit, la sigmoïde est dans BCEWithLogitsLoss.`}>
      <svg viewBox="0 0 840 290" className="w-full max-w-[860px]" role="img" aria-label="Architecture du MLP du TP">
        {LAYERS.slice(1).map((_, li) => {
          const a = nodesY(LAYERS[li]);
          const b = nodesY(LAYERS[li + 1]);
          return a.flatMap((ya, ia) =>
            b.map((yb, ib) =>
              ya !== null && yb !== null ? <line key={`e${li}-${ia}-${ib}`} x1={lx(li)} y1={ya} x2={lx(li + 1)} y2={yb} stroke={C.line} strokeWidth={0.8} /> : null,
            ),
          );
        })}
        {LAYERS.map((n, li) => (
          <g key={`L${li}`}>
            {nodesY(n).map((yy, k) =>
              yy === null ? (
                <text key={k} x={lx(li)} y={136} textAnchor="middle" fill={C.weak} fontSize={15}>
                  ⋮
                </text>
              ) : (
                <circle key={k} cx={lx(li)} cy={yy} r={9} fill={li === 0 ? C.orange : li === LAYERS.length - 1 ? C.green : C.blue} fillOpacity={0.85} stroke={C.paper} strokeWidth={1.5} />
              ),
            )}
            <text x={lx(li)} y={24} textAnchor="middle" fill={C.ink} fontSize={12}>
              {ACTS[li]}
            </text>
            <text x={lx(li)} y={238} textAnchor="middle" fill={C.ink} fontSize={14} fontWeight={600}>
              {n}
            </text>
          </g>
        ))}
        {PARAMS.map((p, i) => (
          <text key={`pp${i}`} x={(lx(i) + lx(i + 1)) / 2} y={270} textAnchor="middle" fill={C.weak} fontSize={12}>
            {nb(p)} param.
          </text>
        ))}
        {[0, 1.5].map((d) => (
          <motion.circle
            key={d}
            r={6}
            fill={C.yellow}
            initial={{ cx: lx(0), cy: path[0], opacity: 0 }}
            animate={{ cx: LAYERS.map((_, i) => lx(i)), cy: path, opacity: [0, 1, 1, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: d, repeatDelay: 0 }}
          />
        ))}
      </svg>
    </Figure>
  );
}

function fmtBytes(b: number) {
  if (b >= 1e9) return `${fr(b / 1e9, 2)} Go`;
  if (b >= 1e6) return `${fr(b / 1e6, b >= 1e8 ? 0 : b >= 1e7 ? 1 : 2)} Mo`;
  if (b >= 1e3) return `${fr(b / 1e3, b >= 1e5 ? 0 : 1)} Ko`;
  return `${Math.round(b)} o`;
}

function MemoryChart() {
  const [r, setR] = useState(300);
  const vox = r * r * (r / 2);
  const rows = [
    { label: `MLP : ${nb(N_PARAMS)} param. float32`, bytes: N_PARAMS * 4, color: C.green },
    { label: "12 images 300 × 300 + 12 P", bytes: 12 * 300 * 300 + 12 * 12 * 8, color: C.purple },
    { label: "grille : 1 bit / voxel", bytes: vox / 8, color: C.blue },
    { label: "grille : 1 octet / voxel", bytes: vox, color: C.blue },
    { label: "grille en int64 (le code)", bytes: vox * 8, color: C.blue },
  ];
  const x0 = 290;
  const x1 = 760;
  const lo = 3;
  const hi = 9;
  const bx = (bytes: number) => x0 + ((Math.log10(bytes) - lo) / (hi - lo)) * (x1 - x0);
  const ticks = [
    { e: 3, l: "1 Ko" },
    { e: 4, l: "10 Ko" },
    { e: 5, l: "100 Ko" },
    { e: 6, l: "1 Mo" },
    { e: 7, l: "10 Mo" },
    { e: 8, l: "100 Mo" },
    { e: 9, l: "1 Go" },
  ];
  return (
    <Figure caption="Question 2.2.3 du TP. Échelle logarithmique (1 Ko = 1000 octets). La taille du MLP ne dépend pas de la résolution : on peut l'évaluer en n'importe quel point. Contrôle : à résolution 100, ton occupancy.npy pèse 4 000 128 octets = 100 × 100 × 50 × 8 + 128 d'en-tête.">
      <div className="space-y-4">
        <Slider label="résolution r" value={r} min={50} max={300} step={50} onChange={setR} format={(v) => `${v}`} />
        <p className="font-mono text-[13px] text-fg-weak">
          grille r × r × r/2 = {r} × {r} × {r / 2} = {nb(vox)} voxels
        </p>
        <svg viewBox="0 0 840 250" className="w-full max-w-[860px]" role="img" aria-label="Mémoire du MLP comparée à la grille et aux images">
          {ticks.map((t) => (
            <g key={t.e}>
              <line x1={x0 + ((t.e - lo) / (hi - lo)) * (x1 - x0)} y1={8} x2={x0 + ((t.e - lo) / (hi - lo)) * (x1 - x0)} y2={210} stroke={C.line} strokeWidth={0.8} />
              <text x={x0 + ((t.e - lo) / (hi - lo)) * (x1 - x0)} y={230} textAnchor="middle" fill={C.weak} fontSize={12}>
                {t.l}
              </text>
            </g>
          ))}
          {rows.map((row, k) => {
            const y = 22 + k * 40;
            const w = Math.max(2, bx(row.bytes) - x0);
            return (
              <g key={row.label}>
                <text x={x0 - 12} y={y + 12} textAnchor="end" fill={C.text} fontSize={13}>
                  {row.label}
                </text>
                <motion.rect x={x0} y={y} height={16} rx={4} fill={row.color} initial={false} animate={{ width: w }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
                <motion.text initial={false} animate={{ x: x0 + w + 8 }} y={y + 13} fill={C.ink} fontSize={13} fontWeight={600} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
                  {fmtBytes(row.bytes)}
                </motion.text>
              </g>
            );
          })}
        </svg>
      </div>
    </Figure>
  );
}

const TP_CODE = `
points = np.stack((X, Y, Z, np.ones(X.shape)), axis=-1).reshape(-1, 4)
visible = np.ones(points.shape[0], dtype=bool)
for i in range(len(calib)):                    # les 12 caméras
    img = mpimg.imread("input/image{0}.pgm".format(i))
    camera = calib[i].reshape(3, 4)            # P_i, 3 x 4
    proj = points @ camera.T                   # (a, b, c) de tous les voxels
    u = np.rint(proj[:, 0] / proj[:, 2]).astype(int)   # colonne
    v = np.rint(proj[:, 1] / proj[:, 2]).astype(int)   # ligne
    height, width = img.shape[:2]
    in_image = (proj[:, 2] > 0) & (u >= 0) & (u < width) & (v >= 0) & (v < height)
    inside = np.zeros(points.shape[0], dtype=bool)
    inside[in_image] = img[v[in_image], u[in_image]] > 0   # img[ligne, colonne]
    visible &= inside                          # intersection des cônes
occupancy = visible.reshape(occupancy.shape).astype(int)
verts, faces, _, _ = measure.marching_cubes(occupancy, 0.25)
`;

// ===========================================================================
// La fiche
// ===========================================================================

export default function VisualHull() {
  return (
    <>
      <Section title="L'idée">
        <Idea>Une forme se décrit de plusieurs façons : la bonne dépend de la tâche. Le visual hull reconstruit une forme en gardant seulement ce que toutes les silhouettes autorisent.</Idea>
        <p>
          <strong>Explicite</strong> : on accède directement aux points (maillage, nuage de points).
        </p>
        <p>
          <strong>Implicite</strong> : une relation f(p) = 0 ; on teste un point avec le signe de f (SDF, voxels, réseau).
        </p>
        <p>
          <strong>Visual hull</strong> : intersection des cônes de vue des silhouettes. Sur une grille, on vide chaque voxel qui sort d'une silhouette.
        </p>
      </Section>

      <Section title="Une droite, trois écritures">
        <p>Activité du cours : représenter la droite qui passe par P0 = (1 ; 1) et P1 = (1,8 ; 1,6).</p>
        <LineForms />
        <table className="ftable">
          <thead>
            <tr>
              <th>Tâche (diapositive du cours)</th>
              <th>Forme</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Donner y à partir de x</td>
              <td>point-slope</td>
              <td>y = m·x + b</td>
            </tr>
            <tr>
              <td>Savoir si P est sur la droite</td>
              <td>implicit</td>
              <td>f(P) = 0</td>
            </tr>
            <tr>
              <td>Lister des points régulièrement espacés</td>
              <td>parametric</td>
              <td>t régulier</td>
            </tr>
            <tr>
              <td>Distance de P à la droite</td>
              <td>implicit</td>
              <td>|f(P)| si ‖n‖ = 1</td>
            </tr>
            <tr>
              <td>De quel côté est P</td>
              <td>implicit</td>
              <td>signe de f(P)</td>
            </tr>
            <tr>
              <td>Dessiner la droite dans une image</td>
              <td colSpan={2}>dépend de la méthode de rendu</td>
            </tr>
          </tbody>
        </table>
        <Note>
          <p>Le cours pose les six tâches et répond « ça dépend de la tâche ». La colonne « Forme » est la correction de la vidéo, pas celle des diapositives.</p>
        </Note>
      </Section>

      <Section title="Explicite ou implicite">
        <p>Deux axes pour classer une représentation : surface ou volume, explicite ou implicite. Polygon mesh = explicite, surface. Volume mesh = explicite, volume.</p>
        <table className="ftable">
          <thead>
            <tr>
              <th>Explicite : accès direct aux points</th>
              <th>Implicite : f(x, y, z) = 0</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>point cloud, f : ℕ → ℝ³ (lidar, photogrammétrie ; pas de topologie)</td>
              <td>surfaces algébriques : sphère x² + y² + z² = 1, tore (R − √(x² + y²))² + z² = r² (« impractical »)</td>
            </tr>
            <tr>
              <td>polygon mesh, f : ℝ² → ℝ³ (triangle soup, indexed, halfedges)</td>
              <td>SDF : distance signée au bord</td>
            </tr>
            <tr>
              <td>volume, f : ℝ³ → ℝ³ (volume mesh : tétraèdres, hexaèdres)</td>
              <td>f échantillonnée sur une grille : sampled SDF, densité, voxels</td>
            </tr>
            <tr>
              <td>subdivision surface</td>
              <td>neural implicits : réseau f_θ appris (images, nuages de points, silhouettes)</td>
            </tr>
          </tbody>
        </table>
        <MeshAndTriangle />
        <PointCloud />
        <ImplicitFig />
        <Formula>SDF : f(p) = 0 sur la surface · f(p) ≤ 0 intérieur · f(p) ≥ 0 extérieur</Formula>
      </Section>

      <Section title="Des silhouettes au visual hull">
        <p>Pipeline de reconstruction : acquisition des images, extraction des primitives, calibration, construction de la forme, suivi, apparence, modèle 3D-4D.</p>
        <p>
          Kinovis 2 : 68 caméras couleur, 20 caméras de motion capture. La primitive clé est la <strong>silhouette</strong> : la région de l'image où se trouve l'objet.
        </p>
        <ChromaKey />
        <p>
          Une silhouette prolongée depuis le centre de la caméra donne un <strong>cône de vue</strong>. L'objet est forcément dedans.
        </p>
        <HullCones />
      </Section>

      <Section title="L'algorithme et la formule à connaître">
        <p>Le cours en tire VisualHull(S, P, G) : tout à FULL, puis EMPTY dès qu'une projection sort d'une silhouette.</p>
        <VoxelCarving />
        <p>Pour savoir si projection(v, P[i]) ∈ S[i], on utilise la matrice de projection 3 × 4 de la caméra (CM calibration).</p>
        <ProjectionTest />
        <Formula>
          <p>(a ; b ; c) = P · (x ; y ; z ; 1) → pixel = (round(a / c) ; round(b / c)) = (colonne ; ligne)</p>
          <p className="mt-2">v = FULL ⇔ ∀i, projection(v, P[i]) ∈ S[i]</p>
          <p className="mt-2">visual hull = ∩ cônes de vue = volume maximal compatible avec les silhouettes</p>
        </Formula>
      </Section>

      <Section title="Côté TP : le visual hull de Al">
        <p>
          Données : 12 silhouettes <code>image0..11.pgm</code> (300 × 300) de « Al » (<code>al.off</code>) et 12 matrices de calibration 3 × 4 (<code>calib[i]</code>, 12 nombres à remettre en 3 × 4).
        </p>
        <p>
          <strong>Partie 1, voxel carving.</strong> Grille resolution × resolution × resolution/2 sur [−1, 1] × [−1, 1] × [−0,5 ; 0,5] (resolution = 100 dans ton code). D'abord la silhouette 0, puis les 12. Sorties : <code>alvoxels.off</code> (marching cubes) et <code>occupancy.npy</code>, à comparer avec <code>al.off</code>.
        </p>
        <Code lang="python" code={TP_CODE} mark={[6, 7, 8, 12, 13]} />
        <Points title="Étapes clés de la partie 1">
          <li>Tous les voxels en coordonnées homogènes : un tableau N × 4.</li>
          <li>Pour chaque caméra : proj = points @ Pᵀ, puis u = a/c (colonne), v = b/c (ligne), arrondis.</li>
          <li>Hors image ou derrière la caméra (c ≤ 0) : hors silhouette.</li>
          <li>Lecture du pixel : img[v, u] (ligne d'abord). Pixel &gt; 0 : dans la silhouette.</li>
          <li>visible &amp;= inside : un ET sur les 12 caméras, c'est l'intersection des cônes.</li>
          <li>Marching cubes sur la grille (niveau 0,25) pour obtenir un maillage .off.</li>
        </Points>
        <p>
          Comparaison attendue : le hull contient Al mais garde ses creux, et sa surface suit les voxels. Fichiers : <code>al.off</code> 3 618 sommets, 7 124 faces ; <code>alvoxels.off</code> 8 922 sommets, 17 762 faces.
        </p>
        <p>
          <strong>Partie 2, représentation implicite neuronale.</strong> Un MLP apprend l'occupation f(x, y, z) ∈ {"{0, 1}"} à partir des voxels de la partie 1.
        </p>
        <MlpDiagram />
        <table className="ftable">
          <thead>
            <tr>
              <th className="w-44">Question 2.1</th>
              <th>Réponse (d'après part2_mlp-implicit.py)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Architecture</td>
              <td>Entrée 3 (x, y, z), couches 60 (Tanh), 120, 60, 30 (ReLU), sortie 1 : un logit.</td>
            </tr>
            <tr>
              <td>2. Données</td>
              <td>data_in : N × 3, les centres (X, Y, Z) de la grille. data_out : N × 1, occupation 0 ou 1. N = 300 × 300 × 150 = 13,5 millions.</td>
            </tr>
            <tr>
              <td>3. Loss</td>
              <td>BCEWithLogitsLoss : entropie croisée binaire, sigmoïde incluse. Optimiseur SGD, lr = 10⁻².</td>
            </tr>
            <tr>
              <td>4. Normalisation</td>
              <td>pos_weight = (nb de points dehors) / (nb de points dedans). La loss des points dedans est multipliée par ce facteur : dedans et dehors pèsent autant.</td>
            </tr>
            <tr>
              <td>5. Batches</td>
              <td>À chaque époque, permutation aléatoire (torch.randperm), puis paquets de 100 points. 10 époques.</td>
            </tr>
            <tr>
              <td>6. binary_acc</td>
              <td>Arrondit sigmoid(sortie) à 0 ou 1, donne le % de points bien classés. Affiché seulement : pas utilisé pour apprendre.</td>
            </tr>
            <tr>
              <td>7. Visualiser</td>
              <td>Évaluer le MLP sur tous les points de la grille, remettre en 300 × 300 × 150, seuiller, marching cubes, export .off.</td>
            </tr>
          </tbody>
        </table>
        <MemoryChart />
        <Note title="Pistes pour 2.2 (pas une correction officielle)">
          <p>Points aléatoires : tirer (x, y, z) uniformes dans la boîte, et calculer leur occupation par le même test de projection.</p>
          <p>Moins de points dehors : tirer les points dans la boîte englobante du hull de la partie 1, ou près de sa surface.</p>
        </Note>
        <Note title="Ta partie 2 : à vérifier">
          <p>
            <code>occupancy</code> reste rempli de 1 (jamais creusé) : il faut charger ou recalculer la grille de la partie 1, à la même résolution (100 dans la partie 1, 300 dans la partie 2).
          </p>
          <p>
            La sortie est un logit : appliquer <code>torch.sigmoid</code> avant <code>np.around</code>. Le fichier est écrit dans <code>alimplicit.off</code>, pas dans <code>output/</code>.
          </p>
        </Note>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Droite : point-slope pour donner y, parametric pour énumérer des points, implicit pour tester un point (côté, distance).</li>
          <li>Explicite : accès direct aux points (mesh, point cloud). Implicite : f(p) = 0, on lit l'intérieur au signe de f.</li>
          <li>SDF : f = 0 sur la surface, ≤ 0 dedans, ≥ 0 dehors ; |f| = distance au bord.</li>
          <li>Silhouette : chroma keying ou background subtraction ; pièges : bruit, luminosité, couleurs ambiguës.</li>
          <li>Visual hull = intersection des cônes de vue = volume maximal compatible avec les silhouettes. Il contient l'objet.</li>
          <li>Algorithme : tout FULL, puis EMPTY si une projection sort d'une silhouette. Invariant : FULL ⇔ ∀i, projection ∈ S[i].</li>
          <li>Projection : P · (x, y, z, 1), division par la 3e coordonnée, arrondi. Hors image = hors silhouette.</li>
        </Points>
        <Trap>
          <p>Le visual hull n'est pas l'objet. Un creux qu'aucune silhouette ne montre (le creux du U) reste plein, quel que soit le nombre de caméras.</p>
        </Trap>
        <Trap title="Piège de raisonnement">
          <p>Une erreur de silhouette ne se rattrape pas : un pixel de l'objet classé fond vide tous les voxels qui s'y projettent. Une seule caméra suffit pour vider un voxel.</p>
        </Trap>
        <Trap title="Piège de TP">
          <p>Un pixel se lit img[ligne, colonne] = img[v, u], pas img[u, v]. Et il faut diviser par la 3e coordonnée avant d'arrondir.</p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal question={<p>Droite par P0 = (1 ; 1) et P1 = (1,8 ; 1,6). Quelle forme choisir pour savoir de quel côté est Q = (2 ; 2), et à quelle distance ? Calculer.</p>}>
          <p>La forme implicite : f(P) = ⟨P, n⟩ − d.</p>
          <p>n = (−0,6 ; 0,8) : perpendiculaire à P1 − P0 = (0,8 ; 0,6), et de longueur 1.</p>
          <p>d = ⟨P0, n⟩ = −0,6 + 0,8 = 0,2.</p>
          <p>f(Q) = −1,2 + 1,6 − 0,2 = 0,2 &gt; 0 : Q est du côté de n.</p>
          <p>Comme ‖n‖ = 1, la distance de Q à la droite est |f(Q)| = 0,2.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              P = [2 0 1 0 ; 0 2 1 0 ; 0 0 1 0], silhouette 5 × 5 avec un carré blanc 3 × 3 au centre. Les voxels (1, 1, 2) et (3, 0, 1) restent-ils FULL pour cette caméra ?
            </p>
          }
        >
          <p>(1, 1, 2) → P · (1, 1, 2, 1) = (4, 4, 2) → pixel (4/2, 4/2) = (2, 2). Blanc : reste FULL.</p>
          <p>(3, 0, 1) → P · (3, 0, 1, 1) = (7, 1, 1) → pixel (7, 1). Hors de l'image 5 × 5 : hors silhouette, donc EMPTY.</p>
          <p>Un seul « hors silhouette » suffit : le voxel est vide dans le visual hull.</p>
        </Reveal>
        <Reveal question={<p>TP, partie 2 : sans précaution, le MLP prédit « dehors » presque partout. Pourquoi ? Quel paramètre de nif_train l'évite ? binary_acc sert-il à l'apprentissage ?</p>}>
          <p>La grille contient beaucoup plus de points dehors que dedans. Tout prédire « dehors » donne déjà une loss faible et une bonne précision.</p>
          <p>
            <code>pos_weight</code> = (nb dehors) / (nb dedans) dans <code>BCEWithLogitsLoss</code> : chaque point dedans compte plus, les deux classes pèsent autant.
          </p>
          <p>binary_acc arrondit la sortie (après sigmoïde) et donne le % de points bien classés. Il est seulement affiché : il n'entre pas dans la loss.</p>
        </Reveal>
      </Section>
    </>
  );
}
