"use client";
// Fiche CM2 : le vertex shader, de l'espace local à l'espace projeté.
// Exemple suivi du cours : v_local = [0,5 ; −0,5 ; 0 ; 1], model = T R S,
// view = identité, fov = 90°, a = 1, n = 1, f = 10.
import { useEffect, useRef, useState, type ReactNode } from "react";
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

/** Nombre à la française, d décimales fixes. */
const fr = (x: number, d = 2) => {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d).replace(".", ",").replace("-", "−");
};
/** Nombre court : au plus d décimales, sans zéros inutiles. */
const nf = (x: number, d = 2) => {
  let s = (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",").replace("-", "−");
};

type V4 = [number, number, number, number];
type M4 = number[][];
type P2 = [number, number];
const mul = (M: M4, v: V4): V4 => [0, 1, 2, 3].map((r) => M[r][0] * v[0] + M[r][1] * v[1] + M[r][2] * v[2] + M[r][3] * v[3]) as V4;

type Cell = string | number;

/** Matrice ou vecteur colonne en HTML, avec crochets. */
function Mat({ m, hl, label }: { m: Cell[][]; hl?: (r: number, c: number) => Color | undefined; label?: ReactNode }) {
  const cols = m[0]?.length ?? 1;
  return (
    <span className="inline-flex flex-col items-center align-middle">
      <span
        className="relative inline-grid gap-x-3 px-2.5 py-1 font-mono text-[13.5px] leading-[1.75]"
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-2 border-y-[1.5px] border-l-[1.5px]" style={{ borderColor: C.weak }} />
        <span aria-hidden className="absolute inset-y-0 right-0 w-2 border-y-[1.5px] border-r-[1.5px]" style={{ borderColor: C.weak }} />
        {m.flatMap((row, r) =>
          row.map((v, c) => {
            const col = hl?.(r, c);
            return (
              <span
                key={`${r}-${c}`}
                className="px-0.5 text-right"
                style={
                  col
                    ? { color: C[col], fontWeight: 600, background: `color-mix(in srgb, ${C[col]} 14%, transparent)` }
                    : { color: C.ink }
                }
              >
                {typeof v === "number" ? nf(v) : v}
              </span>
            );
          }),
        )}
      </span>
      {label && (
        <span className="mt-1 font-mono text-[12px]" style={{ color: C.weak }}>
          {label}
        </span>
      )}
    </span>
  );
}
const Op = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[16px]" style={{ color: C.weak }}>
    {children}
  </span>
);
const Eq = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-x-3 gap-y-3">{children}</div>;
const col = (v: Cell[]): Cell[][] => v.map((x) => [x]);

/** Animation 0 → 1 lancée par un clic (requestAnimationFrame). */
function useTween(duration: number) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );
  const start = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      setT(k);
      raf.current = k < 1 ? requestAnimationFrame(tick) : null;
    };
    raf.current = requestAnimationFrame(tick);
  };
  return [t, start] as const;
}

const btn = "row border border-line px-3 py-1.5 font-mono text-[13px] text-fg-weak hover:text-fg-strong";

// ---------------------------------------------------------------------------
// 1. Le pipeline (exemple de la vidéo : grille 8 × 8, triangles A et B)

const TRI_A: P2[] = [
  [1, 1],
  [7, 2],
  [3, 7],
];
const TRI_B: P2[] = [
  [2, 4],
  [7, 6],
  [5, 1],
];
function inTri(px: number, py: number, t: P2[]) {
  const e = (a: P2, b: P2) => (px - a[0]) * (b[1] - a[1]) - (py - a[1]) * (b[0] - a[0]);
  const e0 = e(t[0], t[1]);
  const e1 = e(t[1], t[2]);
  const e2 = e(t[2], t[0]);
  return (e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0);
}
const CELLS8 = Array.from({ length: 64 }, (_, k) => {
  const i = k % 8;
  const j = Math.floor(k / 8);
  return { i, j, a: inTri(i + 0.5, j + 0.5, TRI_A), b: inTri(i + 0.5, j + 0.5, TRI_B) };
});
const N_A = CELLS8.filter((c) => c.a).length;
const N_B = CELLS8.filter((c) => c.b).length;
const N_AB = CELLS8.filter((c) => c.a && c.b).length;

const PIPE = ["Vertex shader", "Rasterizer", "Fragment shader", "Depth buffer"];
const PIPE_STEPS = [
  "Vertex shader : chaque sommet est projeté dans le carré [−1, 1]",
  "Rasterizer : un fragment par pixel dont le centre est dans A",
  "Fragment shader : chaque fragment de A reçoit sa couleur",
  "Le triangle B (profondeur 0,7) passe à son tour",
  "Depth buffer : 0,3 < 0,7, les pixels communs restent rouges",
];
const ACTIVE = [0, 1, 2, 2, 3];

function PipelineFig() {
  const gx = 270;
  const gy = 88;
  const cs = 30;
  const X = (x: number) => gx + x * cs;
  const Y = (y: number) => gy + (8 - y) * cs;
  const poly = (t: P2[]) => t.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");
  // Étape 0 : trois sommets « dans la scène » qui glissent dans le carré [−1, 1].
  const from: P2[] = [
    [70, 300],
    [235, 285],
    [140, 140],
  ];
  const to: P2[] = [
    [560, 280],
    [670, 262],
    [600, 160],
  ];
  return (
    <Stepper
      steps={PIPE_STEPS}
      interval={2400}
      caption="Le pipeline minimal du cours, sur l'exemple de la vidéo : grille 8 × 8, triangle A rouge (profondeur 0,3) et triangle B bleu (profondeur 0,7)."
    >
      {(step) => (
        <svg viewBox="0 0 780 356" className="w-full max-w-[780px]" role="img" aria-label="Pipeline : vertex shader, rasterizer, fragment shader, depth buffer">
          <ArrowMarkers />
          {PIPE.map((name, k) => {
            const x = 12 + k * 192;
            const on = ACTIVE[step] === k;
            return (
              <g key={name}>
                <rect x={x} y={12} width={166} height={40} rx={4} fill={C.fill} stroke={on ? C.blue : C.line} strokeWidth={on ? 2.5 : 1.2} />
                {on && (
                  <motion.rect
                    key={`on-${step}`}
                    x={x}
                    y={12}
                    width={166}
                    height={40}
                    rx={4}
                    fill={C.blue}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.18 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                <text x={x + 83} y={37} textAnchor="middle" fontSize={14} fill={on ? C.ink : C.text} fontWeight={on ? 600 : 400}>
                  {name}
                </text>
                {k < 3 && <line x1={x + 168} y1={32} x2={x + 190} y2={32} stroke={C.weak} strokeWidth={1.5} markerEnd="url(#arr-weak)" />}
              </g>
            );
          })}

          {step === 0 && (
            <g>
              <text x={150} y={100} textAnchor="middle" fontSize={13} fill={C.weak}>
                sommets dans la scène
              </text>
              <polygon points={from.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.lineStrong} strokeDasharray="4 4" />
              <rect x={510} y={120} width={190} height={190} fill={C.fill} stroke={C.lineStrong} />
              <text x={605} y={110} textAnchor="middle" fontSize={13} fill={C.weak}>
                espace projeté [−1, 1]
              </text>
              <line x1={290} y1={215} x2={490} y2={215} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
              <text x={390} y={205} textAnchor="middle" fontSize={13} fill={C.blue}>
                model · view · proj, ÷ w
              </text>
              <motion.polygon
                points={to.map((p) => p.join(",")).join(" ")}
                fill={C.blue}
                fillOpacity={0.12}
                stroke={C.blue}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              />
              {from.map((p, k) => (
                <motion.circle
                  key={k}
                  r={6}
                  fill={C.yellow}
                  initial={{ cx: p[0], cy: p[1] }}
                  animate={{ cx: to[k][0], cy: to[k][1] }}
                  transition={{ delay: 0.3 + k * 0.15, duration: 1, ease: "easeInOut" }}
                />
              ))}
            </g>
          )}

          {step > 0 && (
            <g>
              {CELLS8.map((c) => {
                const showA = c.a;
                const showB = step >= 3 && c.b;
                let fill: string = C.paper;
                let op = 1;
                if (showA && step === 1) {
                  fill = C.weak;
                  op = 0.45;
                }
                if (showA && step >= 2) {
                  fill = C.red;
                  op = 0.75;
                }
                if (showB && (step === 3 || !c.a)) {
                  fill = C.blue;
                  op = 0.75;
                }
                const filled = showA || showB;
                return (
                  <g key={`${c.i}-${c.j}`}>
                    <rect x={X(c.i)} y={Y(c.j + 1)} width={cs} height={cs} fill={C.paper} stroke={C.line} />
                    {filled && (
                      <motion.rect
                        key={`${step >= 2 ? "c" : "f"}-${showB && (step === 3 || !c.a) ? "b" : "a"}`}
                        x={X(c.i) + 1}
                        y={Y(c.j + 1) + 1}
                        width={cs - 2}
                        height={cs - 2}
                        fill={fill}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: op }}
                        transition={{ delay: step === 1 || (step === 3 && c.b) ? (7 - c.j) * 0.18 : 0, duration: 0.3 }}
                      />
                    )}
                    {step === 4 && c.a && c.b && (
                      <motion.rect
                        x={X(c.i) + 2.5}
                        y={Y(c.j + 1) + 2.5}
                        width={cs - 5}
                        height={cs - 5}
                        fill="none"
                        stroke={C.yellow}
                        strokeWidth={2}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0.7] }}
                        transition={{ duration: 1.4 }}
                      />
                    )}
                  </g>
                );
              })}
              {step === 1 && (
                <motion.line
                  x1={X(0)}
                  x2={X(8)}
                  stroke={C.yellow}
                  strokeWidth={2}
                  initial={{ y1: Y(8), y2: Y(8) }}
                  animate={{ y1: Y(0), y2: Y(0) }}
                  transition={{ duration: 1.6, ease: "linear" }}
                />
              )}
              <polygon points={poly(TRI_A)} fill="none" stroke={C.red} strokeWidth={2} />
              {step >= 3 && <polygon points={poly(TRI_B)} fill="none" stroke={C.blue} strokeWidth={2} />}
              <text x={X(0)} y={Y(0) + 17} fontSize={12} fill={C.weak}>
                (0, 0)
              </text>
              <text x={X(8)} y={Y(0) + 17} textAnchor="end" fontSize={12} fill={C.weak}>
                grille 8 × 8
              </text>

              <text x={540} y={110} fontSize={13} fill={C.red}>
                A : profondeur 0,3
              </text>
              <text x={540} y={130} fontSize={12} fill={C.weak}>
                {N_A} fragments
              </text>
              {step >= 3 && (
                <>
                  <text x={540} y={165} fontSize={13} fill={C.blue}>
                    B : profondeur 0,7
                  </text>
                  <text x={540} y={185} fontSize={12} fill={C.weak}>
                    {N_B} fragments, {N_AB} en commun
                  </text>
                </>
              )}
              {step === 4 && (
                <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <text x={540} y={225} fontSize={13} fill={C.ink}>
                    pixel commun :
                  </text>
                  <text x={540} y={245} fontSize={13} fill={C.ink}>
                    0,3 &lt; 0,7 → rouge gardé
                  </text>
                </motion.g>
              )}
              <text x={20} y={120} fontSize={12} fill={C.weak}>
                pixel couvert si
              </text>
              <text x={20} y={138} fontSize={12} fill={C.weak}>
                son centre
              </text>
              <text x={20} y={156} fontSize={12} fill={C.weak}>
                (i + 0,5 ; j + 0,5)
              </text>
              <text x={20} y={174} fontSize={12} fill={C.weak}>
                est dans le triangle
              </text>
            </g>
          )}
        </svg>
      )}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 2. La chaîne des espaces, avec les vecteurs de l'exemple suivi

const SPACES = ["Espace local", "Scène", "Espace caméra", "Espace projeté"];
const ARROWS = ["model", "view", "proj, ÷ w"];
const VECS = ["[0,5 ; −0,5 ; 0 ; 1]", "[1 ; 1 ; 5 ; 1]", "[1 ; 1 ; 5 ; 1]", "(0,2 ; 0,2 ; 0,89)"];
const VNAMES = ["v_local", "v_scene", "v_cam", "v'"];

function ChainFig() {
  const [run, setRun] = useState(0);
  const bx = (k: number) => 10 + k * 213;
  const W = 140;
  return (
    <Figure caption="Quatre espaces, trois transformations. Sous chaque boîte : le sommet suivi dans la vidéo.">
      <div className="space-y-3">
        <button type="button" className={btn} onClick={() => setRun((r) => r + 1)}>
          ▶ rejouer
        </button>
        <svg key={run} viewBox="0 0 800 150" className="w-full max-w-[800px]" role="img" aria-label="Chaîne des espaces : local, scène, caméra, projeté">
          <ArrowMarkers />
          {SPACES.map((s, k) => (
            <motion.g key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.9, duration: 0.4 }}>
              <rect x={bx(k)} y={22} width={W} height={44} rx={4} fill={C.fill} stroke={k === 3 ? C.green : C.lineStrong} strokeWidth={k === 3 ? 2 : 1.2} />
              <text x={bx(k) + W / 2} y={49} textAnchor="middle" fontSize={14} fill={C.ink}>
                {s}
              </text>
              <text x={bx(k) + W / 2} y={92} textAnchor="middle" fontSize={12} fill={C.weak}>
                {VNAMES[k]}
              </text>
              <text x={bx(k) + W / 2} y={112} textAnchor="middle" fontSize={13} fill={k === 3 ? C.green : C.ink}>
                {VECS[k]}
              </text>
            </motion.g>
          ))}
          {ARROWS.map((a, k) => (
            <motion.g key={a} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.9 + 0.5, duration: 0.4 }}>
              <line x1={bx(k) + W + 3} y1={44} x2={bx(k + 1) - 4} y2={44} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
              <text x={(bx(k) + W + bx(k + 1)) / 2} y={14} textAnchor="middle" fontSize={13} fill={C.blue}>
                {a}
              </text>
            </motion.g>
          ))}
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            x={bx(3) + W}
            y={138}
            textAnchor="end"
            fontSize={12}
            fill={C.weak}
          >
            v_tmp = [1 ; 1 ; 4,44 ; 5], puis ÷ 5
          </motion.text>
          <motion.circle
            r={6}
            fill={C.yellow}
            cy={22}
            initial={{ cx: bx(0) + W / 2, opacity: 0 }}
            animate={{ cx: [bx(0) + W / 2, bx(1) + W / 2, bx(2) + W / 2, bx(3) + W / 2], opacity: 1 }}
            transition={{ delay: 0.4, duration: 2.8, times: [0, 0.33, 0.66, 1], ease: "easeInOut" }}
          />
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Coordonnées homogènes : la translation T(tz)

function TranslationFig() {
  const [tz, setTz] = useState(0);
  const X = (z: number) => 40 + z * 46;
  const Y = (y: number) => 100 - y * 36;
  const tz1 = Number(tz.toFixed(1));
  return (
    <Figure caption="La translation est dans la dernière colonne ; c'est la composante w = 1 du sommet qui l'ajoute à z.">
      <div className="space-y-4">
        <Slider label="tz (translation)" value={tz} min={0} max={5} step={0.1} onChange={setTz} format={(v) => fr(v, 1)} />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <Eq>
            <Mat
              m={[
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, tz1],
                [0, 0, 0, 1],
              ]}
              hl={(r, c) => (r === 2 && c === 3 ? "yellow" : undefined)}
              label="T(tz)"
            />
            <Op>×</Op>
            <Mat m={col([1, 1, 0, 1])} hl={(r) => (r === 3 ? "cyan" : undefined)} label="v (w = 1)" />
            <Op>=</Op>
            <Mat m={col([1, 1, tz1, 1])} hl={(r) => (r === 2 ? "yellow" : undefined)} label="T(tz) v" />
          </Eq>
          <svg viewBox="0 0 340 190" className="w-full max-w-[340px]" role="img" aria-label="Vue de côté : le point glisse le long de z">
            <ArrowMarkers />
            <line x1={X(0)} y1={Y(0)} x2={X(6.3)} y2={Y(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <line x1={X(0)} y1={Y(-2)} x2={X(0)} y2={Y(2.2)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <text x={X(6.3)} y={Y(0) + 18} textAnchor="end" fontSize={13} fill={C.text}>
              z
            </text>
            <text x={X(0) - 14} y={Y(2)} fontSize={13} fill={C.text}>
              y
            </text>
            {[0, 1, 2, 3, 4, 5].map((z) => (
              <g key={z}>
                <line x1={X(z)} y1={Y(0) - 4} x2={X(z)} y2={Y(0) + 4} stroke={C.weak} />
                <text x={X(z)} y={Y(0) + 20} textAnchor="middle" fontSize={12} fill={C.weak}>
                  {z}
                </text>
              </g>
            ))}
            <circle cx={X(0)} cy={Y(1)} r={5} fill="none" stroke={C.weak} strokeDasharray="2 2" />
            {tz > 0.25 && <line x1={X(0) + 7} y1={Y(1)} x2={X(tz) - 8} y2={Y(1)} stroke={C.yellow} strokeWidth={1.5} markerEnd="url(#arr-yellow)" />}
            <circle cx={X(tz)} cy={Y(1)} r={6} fill={C.yellow} />
            <text x={X(tz) + 11} y={Y(1) - 10} fontSize={13} fill={C.ink}>
              z = {fr(tz, 1)}
            </text>
          </svg>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 4. model = T R S, sur le sommet (0,5 ; −0,5)

function ModelFig() {
  const [k, setK] = useState(1);
  const [ang, setAng] = useState(0);
  const [tz, setTz] = useState(0);
  const [order, setOrder] = useState<"TRS" | "SRT">("TRS");
  const rad = (ang * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const S: M4 = [
    [k, 0, 0, 0],
    [0, k, 0, 0],
    [0, 0, k, 0],
    [0, 0, 0, 1],
  ];
  const R: M4 = [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const T: M4 = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, tz],
    [0, 0, 0, 1],
  ];
  const seq: [string, M4][] =
    order === "TRS"
      ? [
          ["S", S],
          ["R", R],
          ["T", T],
        ]
      : [
          ["T", T],
          ["R", R],
          ["S", S],
        ];
  const v0: V4 = [0.5, -0.5, 0, 1];
  const v1 = mul(seq[0][1], v0);
  const v2 = mul(seq[1][1], v1);
  const v3 = mul(seq[2][1], v2);
  const vecs = [v0, v1, v2, v3];
  const names = order === "TRS" ? ["v_local", "v1 = S v_local", "v2 = R v1", "v3 = T v2"] : ["v_local", "w1 = T v_local", "w2 = R w1", "w3 = S w2"];

  // Plan (x, y) de −2 à 2.
  const O = 150;
  const U = 60;
  const X = (x: number) => O + x * U;
  const Y = (y: number) => O - y * U;
  const xy = (p: P2): P2 => [k * (c * p[0] - s * p[1]), k * (s * p[0] + c * p[1])];
  const corners: P2[] = [
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5],
    [0.5, -0.5],
  ];
  const sq = corners.map(xy);
  // Trajet du sommet : échelle (segment) puis rotation (arc), ou l'inverse pour S R T.
  const r0 = Math.SQRT1_2;
  const a0 = -Math.PI / 4;
  const arc = (r: number) =>
    Array.from({ length: 25 }, (_, q) => {
      const a = a0 + (rad * q) / 24;
      return `${X(r * Math.cos(a))},${Y(r * Math.sin(a))}`;
    }).join(" L");
  const path =
    order === "TRS"
      ? `M${X(0.5)},${Y(-0.5)} L${X(0.5 * k)},${Y(-0.5 * k)} L${arc(k * r0)}`
      : `M${arc(r0)} L${X(k * r0 * Math.cos(a0 + rad))},${Y(k * r0 * Math.sin(a0 + rad))}`;
  const fin: P2 = [v3[0], v3[1]];
  const zBad = v3[2] > 5.05;
  const ZY = (z: number) => 270 - z * 24;

  return (
    <Figure caption="Bouger k, l'angle puis tz : le coin jaune suit S, puis R, puis T. En ordre S R T, l'échelle s'applique aussi au déplacement.">
      <div className="space-y-4">
        <Slider label="S : échelle k" value={k} min={1} max={2} step={0.05} onChange={setK} format={(v) => fr(v, 2)} />
        <Slider label="R : angle (axe z)" value={ang} min={0} max={90} step={1} onChange={setAng} format={(v) => `${v}°`} />
        <Slider label="T : tz" value={tz} min={0} max={5} step={0.1} onChange={setTz} format={(v) => fr(v, 1)} />
        <Choice
          label="ordre"
          value={order}
          onChange={setOrder}
          options={[
            { value: "TRS", label: "model = T R S (cours)" },
            { value: "SRT", label: "model = S R T (faux)" },
          ]}
        />
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <svg viewBox="0 0 420 300" className="w-full max-w-[420px]" role="img" aria-label="Le carré dans le plan x y, et la jauge de z">
            <ArrowMarkers />
            {[-2, -1, 1, 2].map((g) => (
              <g key={g}>
                <line x1={X(g)} y1={Y(-2.3)} x2={X(g)} y2={Y(2.3)} stroke={C.line} strokeWidth={0.6} />
                <line x1={X(-2.3)} y1={Y(g)} x2={X(2.3)} y2={Y(g)} stroke={C.line} strokeWidth={0.6} />
                <text x={X(g)} y={Y(0) + 15} textAnchor="middle" fontSize={12} fill={C.weak}>
                  {g < 0 ? `−${-g}` : g}
                </text>
              </g>
            ))}
            <line x1={X(-2.4)} y1={Y(0)} x2={X(2.4)} y2={Y(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <line x1={X(0)} y1={Y(-2.4)} x2={X(0)} y2={Y(2.4)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <text x={X(2.4)} y={Y(0) - 8} textAnchor="end" fontSize={13} fill={C.text}>
              x
            </text>
            <text x={X(0) + 8} y={Y(2.3)} fontSize={13} fill={C.text}>
              y
            </text>
            <polygon points={corners.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} fill="none" stroke={C.lineStrong} strokeDasharray="4 4" />
            <polygon points={sq.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")} fill={C.blue} fillOpacity={0.12} stroke={C.blue} strokeWidth={2} />
            <path d={path} fill="none" stroke={C.yellow} strokeWidth={1.4} strokeDasharray="3 3" />
            <path d={`M${X(-0.08)},${Y(0)} L${X(0.08)},${Y(0)} M${X(0)},${Y(-0.08)} L${X(0)},${Y(0.08)}`} stroke={C.ink} strokeWidth={1.5} />
            <circle cx={X(0.5)} cy={Y(-0.5)} r={4} fill="none" stroke={C.yellow} />
            <circle cx={X(fin[0])} cy={Y(fin[1])} r={6.5} fill={C.yellow} />
            <text x={X(fin[0]) + 10} y={Y(fin[1]) + (fin[1] >= 0 ? -10 : 20)} fontSize={13} fill={C.ink}>
              ({nf(fin[0])} ; {nf(fin[1])})
            </text>
            {/* jauge de z */}
            <line x1={360} y1={ZY(0)} x2={360} y2={ZY(10.3)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <text x={360} y={ZY(10.3) - 6} textAnchor="middle" fontSize={13} fill={C.text}>
              z
            </text>
            {[0, 5, 10].map((z) => (
              <g key={z}>
                <line x1={355} y1={ZY(z)} x2={365} y2={ZY(z)} stroke={C.weak} />
                <text x={348} y={ZY(z) + 4} textAnchor="end" fontSize={12} fill={C.weak}>
                  {z}
                </text>
              </g>
            ))}
            <circle cx={360} cy={ZY(v3[2])} r={6.5} fill={zBad ? C.red : C.yellow} />
            <text x={372} y={ZY(v3[2]) + 4} fontSize={13} fill={zBad ? C.red : C.ink}>
              {nf(v3[2], 1)}
            </text>
          </svg>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            {vecs.map((v, q) => (
              <Mat
                key={q}
                m={col(v.map((x) => Number(x.toFixed(2))))}
                hl={(r) =>
                  q === 3 && r === 2 ? (zBad ? "red" : "green") : q > 0 && seq[q - 1][0] === "T" && r === 2 ? "yellow" : undefined
                }
                label={names[q]}
              />
            ))}
          </div>
        </div>
        {order === "SRT" && Math.abs(k - 2) < 0.01 && tz > 4.95 && (
          <p className="font-mono text-[13px]" style={{ color: C.red }}>
            S R T : on translate d'abord, puis l'échelle double aussi le déplacement : z = 10 au lieu de 5.
          </p>
        )}
        {order === "TRS" && Math.abs(k - 2) < 0.01 && ang === 90 && tz > 4.95 && (
          <p className="font-mono text-[13px]" style={{ color: C.green }}>
            Résultat du cours : v_scene = T R S v_local = [1 ; 1 ; 5 ; 1].
          </p>
        )}
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 5. View : la caméra C = (2, 0, −3), tournée de θ = −15° autour de y

const TH = (-15 * Math.PI) / 180;
const CAM = { x: 2, y: 0, z: -3 };
const PT = { x: 1, y: 1, z: 5 };
const RV = [Math.cos(TH), 0, -Math.sin(TH)];
const UV = [0, 1, 0];
const LV = [Math.sin(TH), 0, Math.cos(TH)];
const DPC = [PT.x - CAM.x, PT.y - CAM.y, PT.z - CAM.z];
const RDOT = RV[0] * DPC[0] + RV[1] * DPC[1] + RV[2] * DPC[2];
const LDOT = LV[0] * DPC[0] + LV[1] * DPC[1] + LV[2] * DPC[2];

function ViewFig() {
  const [p, setP] = useState(0);
  const t = Math.min(p, 1);
  const s = Math.max(p - 1, 0);
  const a = s * TH;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const tf = (x: number, z: number): P2 => {
    const qx = x - t * CAM.x;
    const qz = z - t * CAM.z;
    return [ca * qx - sa * qz, sa * qx + ca * qz];
  };
  const rv = (x: number, z: number): P2 => [ca * x - sa * z, sa * x + ca * z];
  const cam = tf(CAM.x, CAM.z);
  const pt = tf(PT.x, PT.z);
  const R2 = rv(RV[0], RV[2]);
  const L2 = rv(LV[0], LV[2]);
  const X = (x: number) => 160 + 30 * x;
  const Y = (z: number) => 300 - 30 * z;
  const at = (o: P2, d: P2, l: number): P2 => [o[0] + d[0] * l, o[1] + d[1] * l];
  const fR = at(cam, R2, RDOT);
  const fL = at(cam, L2, LDOT);
  const g1 = at(at(cam, L2, 0.9), R2, 0.45);
  const g2 = at(at(cam, L2, 0.9), R2, -0.45);
  const phase = p < 1 ? 1 : 2;
  const done = p > 1.97;
  const L9 = at(cam, L2, 9);
  const R26 = at(cam, R2, 2.6);
  const R16 = at(cam, R2, 1.2);
  const L16 = at(cam, L2, 1.2);
  const R19 = at(cam, R2, 1.5);
  const L19 = at(cam, L2, 1.5);
  return (
    <Figure caption="Vue de dessus (x horizontal, z vers le haut). Bouger le curseur : d'abord la translation de −C, puis la rotation qui aligne L sur +z. Les projections pointillées ne changent pas : ce sont les coordonnées du point vues par la caméra.">
      <div className="space-y-4">
        <Slider
          label={phase === 1 ? "1. translation −C" : "2. rotation R U L"}
          value={p}
          min={0}
          max={2}
          step={0.01}
          onChange={setP}
          format={(v) => (v <= 1 ? `1 · ${Math.round(v * 100)}%` : `2 · ${Math.round((v - 1) * 100)}%`)}
        />
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <svg viewBox="0 0 320 436" className="w-full max-w-[320px]" role="img" aria-label="Vue de dessus de la caméra et du point P">
            <ArrowMarkers />
            <line x1={X(-4)} y1={Y(0)} x2={X(4)} y2={Y(0)} stroke={C.line} markerEnd="url(#arr-line)" />
            <line x1={X(0)} y1={Y(-4)} x2={X(0)} y2={Y(9)} stroke={C.line} markerEnd="url(#arr-line)" />
            <text x={X(4)} y={Y(0) + 16} textAnchor="end" fontSize={12} fill={C.weak}>
              x
            </text>
            <text x={X(0) - 14} y={Y(8.8)} fontSize={12} fill={C.weak}>
              z
            </text>
            <text x={X(0) - 6} y={Y(0) + 16} textAnchor="end" fontSize={12} fill={C.weak}>
              O
            </text>
            {/* axes de la caméra prolongés et projections */}
            <line x1={X(cam[0])} y1={Y(cam[1])} x2={X(L9[0])} y2={Y(L9[1])} stroke={C.blue} strokeOpacity={0.4} strokeDasharray="2 4" />
            <line x1={X(cam[0])} y1={Y(cam[1])} x2={X(R26[0])} y2={Y(R26[1])} stroke={C.orange} strokeOpacity={0.5} strokeDasharray="2 4" />
            <line x1={X(pt[0])} y1={Y(pt[1])} x2={X(fR[0])} y2={Y(fR[1])} stroke={C.orange} strokeDasharray="4 3" />
            <line x1={X(pt[0])} y1={Y(pt[1])} x2={X(fL[0])} y2={Y(fL[1])} stroke={C.blue} strokeDasharray="4 3" />
            <circle cx={X(fR[0])} cy={Y(fR[1])} r={3} fill={C.orange} />
            <circle cx={X(fL[0])} cy={Y(fL[1])} r={3} fill={C.blue} />
            <line x1={X(cam[0])} y1={Y(cam[1])} x2={X(pt[0])} y2={Y(pt[1])} stroke={C.weak} strokeWidth={1} />
            {/* caméra */}
            <polygon points={[cam, g1, g2].map((q) => `${X(q[0])},${Y(q[1])}`).join(" ")} fill={C.fill2} stroke={C.ink} strokeWidth={1.2} />
            <line x1={X(cam[0])} y1={Y(cam[1])} x2={X(R16[0])} y2={Y(R16[1])} stroke={C.orange} strokeWidth={2} markerEnd="url(#arr-orange)" />
            <line x1={X(cam[0])} y1={Y(cam[1])} x2={X(L16[0])} y2={Y(L16[1])} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
            <text x={X(R19[0])} y={Y(R19[1]) + 5} fontSize={13} fill={C.orange}>
              R
            </text>
            <text x={X(L19[0]) - 6} y={Y(L19[1]) + 4} textAnchor="end" fontSize={13} fill={C.blue}>
              L
            </text>
            <circle cx={X(cam[0])} cy={Y(cam[1])} r={3.5} fill={C.ink} />
            <text x={X(cam[0]) - 9} y={Y(cam[1]) + 5} textAnchor="end" fontSize={13} fill={C.ink}>
              C
            </text>
            <circle cx={X(pt[0])} cy={Y(pt[1])} r={6} fill={C.yellow} />
            <text x={X(pt[0]) + 9} y={Y(pt[1]) - 8} fontSize={13} fill={C.ink}>
              P
            </text>
            <text x={X(fR[0]) + 5} y={Y(fR[1]) + 17} fontSize={12} fill={C.orange}>
              {fr(RDOT)}
            </text>
            <text x={X(fL[0]) - 8} y={Y(fL[1]) - 6} textAnchor="end" fontSize={12} fill={C.blue}>
              {fr(LDOT)}
            </text>
            {done && (
              <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} x={X(-4.4)} y={Y(-3.4)} fontSize={13} fill={C.green}>
                caméra en O, vers +z
              </motion.text>
            )}
          </svg>
          <div className="min-w-0 flex-1 space-y-4">
            <div style={{ opacity: phase === 1 ? 1 : 0.45 }}>
              <p className="mb-2 font-mono text-[12.5px]" style={{ color: C.weak }}>
                1. amener la caméra à l'origine, C = (2 ; 0 ; −3)
              </p>
              <Mat
                m={[
                  [1, 0, 0, "−Xc = −2"],
                  [0, 1, 0, "−Yc = 0"],
                  [0, 0, 1, "−Zc = 3"],
                  [0, 0, 0, 1],
                ]}
                hl={(r, c) => (c === 3 && r < 3 ? "yellow" : undefined)}
              />
            </div>
            <div style={{ opacity: phase === 2 ? 1 : 0.45 }}>
              <p className="mb-2 font-mono text-[12.5px]" style={{ color: C.weak }}>
                2. lignes = axes de la caméra (θ = −15° autour de y)
              </p>
              <div className="flex items-center gap-2">
                <span className="flex flex-col py-1 font-mono text-[13.5px] leading-[1.75]">
                  <span style={{ color: C.orange }}>R</span>
                  <span style={{ color: C.green }}>U</span>
                  <span style={{ color: C.blue }}>L</span>
                  <span>&nbsp;</span>
                </span>
                <Mat
                  m={[
                    [nf(RV[0]), nf(RV[1]), nf(RV[2]), 0],
                    [nf(UV[0]), nf(UV[1]), nf(UV[2]), 0],
                    [nf(LV[0]), nf(LV[1]), nf(LV[2]), 0],
                    [0, 0, 0, 1],
                  ]}
                  hl={(r, c) => (c < 3 ? (r === 0 ? "orange" : r === 1 ? "green" : r === 2 ? "blue" : undefined) : undefined)}
                />
              </div>
            </div>
            <p className="font-mono text-[13px] leading-relaxed">
              <span style={{ color: C.orange }}>R·(P − C) ≈ {fr(RDOT)}</span>
              <br />
              <span style={{ color: C.green }}>U·(P − C) = 1</span>
              <br />
              <span style={{ color: C.blue }}>L·(P − C) ≈ {fr(LDOT)}</span>
            </p>
            <p className="font-mono text-[13px]" style={{ color: done ? C.green : C.weak }}>
              view · P = [{fr(RDOT)} ; 1 ; {fr(LDOT)} ; 1]
            </p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. Projection : fov, s et le frustum

function FovFig() {
  const [fov, setFov] = useState(90);
  const s = 1 / Math.tan((fov * Math.PI) / 360);
  const X = (z: number) => 35 + 30 * z;
  const Y = (y: number) => 150 - 30 * y;
  const half = (fov * Math.PI) / 360;
  const ar = 46;
  return (
    <Figure caption="Avec a = 1, n = 1, f = 10. Le champ de vision s'élargit : s diminue, le frustum s'ouvre, et le même sommet [1 ; 1 ; 5 ; 1] donne des x et y plus petits.">
      <div className="space-y-4">
        <Slider label="fov" value={fov} min={60} max={120} step={1} onChange={setFov} format={(v) => `${v}°`} />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <svg viewBox="0 0 370 312" className="w-full max-w-[370px]" role="img" aria-label="Frustum vu de côté">
            <ArrowMarkers />
            <defs>
              <clipPath id="vs-fov-clip">
                <rect x={X(0)} y={Y(4.6)} width={X(10.4) - X(0)} height={Y(-4.6) - Y(4.6)} />
              </clipPath>
            </defs>
            <line x1={X(0)} y1={Y(0)} x2={X(10.8)} y2={Y(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
            <text x={X(10.8)} y={Y(0) + 18} textAnchor="end" fontSize={13} fill={C.text}>
              z
            </text>
            <g clipPath="url(#vs-fov-clip)">
              <line x1={X(0)} y1={Y(0)} x2={X(12)} y2={Y(12 / s)} stroke={C.blue} strokeOpacity={0.4} strokeDasharray="3 4" />
              <line x1={X(0)} y1={Y(0)} x2={X(12)} y2={Y(-12 / s)} stroke={C.blue} strokeOpacity={0.4} strokeDasharray="3 4" />
              <polygon
                points={`${X(1)},${Y(1 / s)} ${X(10)},${Y(10 / s)} ${X(10)},${Y(-10 / s)} ${X(1)},${Y(-1 / s)}`}
                fill={C.blue}
                fillOpacity={0.13}
                stroke={C.blue}
                strokeWidth={2}
              />
            </g>
            <path
              d={`M${X(0) + ar * Math.cos(half)},${Y(0) - ar * Math.sin(half)} A${ar},${ar} 0 0 1 ${X(0) + ar * Math.cos(half)},${Y(0) + ar * Math.sin(half)}`}
              fill="none"
              stroke={C.orange}
              strokeWidth={1.5}
            />
            <text x={X(0) + ar + 6} y={Y(0) - 6} fontSize={13} fill={C.orange}>
              {fov}°
            </text>
            <circle cx={X(0)} cy={Y(0)} r={4} fill={C.ink} />
            <text x={X(1)} y={Y(-4.6) + 14} textAnchor="middle" fontSize={12} fill={C.weak}>
              n = 1
            </text>
            <text x={X(10)} y={Y(-4.6) + 14} textAnchor="middle" fontSize={12} fill={C.weak}>
              f = 10
            </text>
            <line x1={X(5)} y1={Y(0) - 4} x2={X(5)} y2={Y(0) + 4} stroke={C.weak} />
            <text x={X(5)} y={Y(0) + 18} textAnchor="middle" fontSize={12} fill={C.weak}>
              5
            </text>
            <circle cx={X(5)} cy={Y(1)} r={5} fill={C.yellow} />
          </svg>
          <div className="space-y-3">
            <p className="font-mono text-[14px]" style={{ color: C.ink }}>
              s = 1 / tan(fov/2) = <span style={{ color: C.orange }}>{fr(s)}</span>
            </p>
            <Eq>
              <Mat
                m={[
                  [fr(s), 0, 0, 0],
                  [0, fr(s), 0, 0],
                  [0, 0, "10/9", "−10/9"],
                  [0, 0, 1, 0],
                ]}
                hl={(r, c) => ((r === 0 && c === 0) || (r === 1 && c === 1) ? "orange" : r === 3 && c === 2 ? "green" : undefined)}
                label="proj (a = 1)"
              />
              <Op>×</Op>
              <Mat m={col([1, 1, 5, 1])} label="v_cam" />
              <Op>=</Op>
              <Mat m={[[fr(s)], [fr(s)], ["4,44"], [5]]} hl={(r) => (r === 3 ? "green" : r < 2 ? "orange" : undefined)} label="v_tmp" />
            </Eq>
            <p className="font-mono text-[12.5px]" style={{ color: C.weak }}>
              ligne 3 : 10/9 × 5 − 10/9 = 40/9 ≈ 4,44
              <br />
              ligne 4 (0 0 1 0) : w = z = 5
            </p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 7. La division par w, animée

const VTMP5 = [1, 1, 40 / 9, 5];

function DivisionFig() {
  const [t, start] = useTween(1600);
  const d = 1 + 4 * t;
  const done = t >= 1;
  return (
    <Figure caption="Le diviseur d passe de 1 à w = 5 : les trois composantes décroissent jusqu'à v' = v_tmp[:3] / 5.">
      <div className="space-y-4">
        <button type="button" className={btn} onClick={start}>
          ▶ diviser par w
        </button>
        <Eq>
          <Mat m={[[1], [1], ["4,44"], [5]]} hl={(r) => (r === 3 ? "green" : undefined)} label="v_tmp (z = 5)" />
          <Op>÷</Op>
          <span className="font-mono text-[18px]" style={{ color: C.green }}>
            {fr(d, 2)}
          </span>
          <Op>=</Op>
          <Mat
            m={[[fr(VTMP5[0] / d)], [fr(VTMP5[1] / d)], [fr(VTMP5[2] / d)]]}
            hl={() => (done ? "green" : undefined)}
            label={done ? "v' = (x', y', z')" : "v_tmp[:3] / d"}
          />
        </Eq>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 8. Du frustum au cube : le sommet [1, 1, z, 1], z de 1 à 10

const zp = (z: number) => (10 / 9) * (1 - 1 / z);

function FrustumFig() {
  const [z, setZ] = useState(1);
  const [mode, setMode] = useState<"point" | "segment">("point");
  // gauche : z ∈ [0, 10] → x ∈ [40, 370] ; y ∈ [−10, 10] → [300, 40]
  const LX = (v: number) => 40 + 33 * v;
  const LY = (v: number) => 170 - 13 * v;
  // droite : z' ∈ [0, 1] → [540, 780] ; y' ∈ [−1, 1] → [290, 50]
  const RX = (v: number) => 540 + 240 * v;
  const RY = (v: number) => 170 - 120 * v;
  const yp = 1 / z;
  const zz = zp(z);
  const trace = Array.from({ length: 91 }, (_, q) => {
    const zq = 1 + q * 0.1;
    return `${RX(zp(zq))},${RY(1 / zq)}`;
  }).join(" ");
  return (
    <Figure caption="À gauche le frustum vu de côté (fov = 90°, n = 1, f = 10), à droite l'espace projeté. Le point s'éloigne : son image descend vers le centre (y' = 1/z) et z' monte de 0 à 1, très vite près du near plane.">
      <div className="space-y-4">
        <Slider label="profondeur z" value={z} min={1} max={10} step={0.1} onChange={setZ} format={(v) => fr(v, 1)} />
        <div className="flex flex-wrap items-center gap-4">
          <Choice
            value={mode}
            onChange={setMode}
            options={[
              { value: "point", label: "point (1, 1, z)" },
              { value: "segment", label: "segment de y = −1 à 1" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 5, 10].map((v) => (
              <button key={v} type="button" className={btn} onClick={() => setZ(v)}>
                z = {v}
              </button>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 820 330" className="w-full max-w-[820px]" role="img" aria-label="Frustum et espace projeté">
          <ArrowMarkers />
          {/* gauche */}
          <text x={200} y={22} textAnchor="middle" fontSize={13} fill={C.weak}>
            espace caméra (vue de côté)
          </text>
          <line x1={LX(0)} y1={LY(0)} x2={LX(10.5)} y2={LY(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
          <text x={LX(10.5)} y={LY(0) + 18} textAnchor="end" fontSize={13} fill={C.text}>
            z
          </text>
          <polygon
            points={`${LX(1)},${LY(1)} ${LX(10)},${LY(10)} ${LX(10)},${LY(-10)} ${LX(1)},${LY(-1)}`}
            fill={C.blue}
            fillOpacity={0.1}
            stroke={C.blue}
            strokeWidth={1.8}
          />
          <line x1={LX(0)} y1={LY(0)} x2={LX(1)} y2={LY(1)} stroke={C.blue} strokeOpacity={0.5} strokeDasharray="3 3" />
          <line x1={LX(0)} y1={LY(0)} x2={LX(1)} y2={LY(-1)} stroke={C.blue} strokeOpacity={0.5} strokeDasharray="3 3" />
          <circle cx={LX(0)} cy={LY(0)} r={4} fill={C.ink} />
          <text x={LX(1)} y={LY(-1) + 30} textAnchor="middle" fontSize={12} fill={C.weak}>
            near
          </text>
          <text x={LX(10)} y={LY(-10) + 18} textAnchor="middle" fontSize={12} fill={C.weak}>
            far (z = 10)
          </text>
          {mode === "point" ? (
            <circle cx={LX(z)} cy={LY(1)} r={6} fill={C.yellow} />
          ) : (
            <line x1={LX(z)} y1={LY(-1)} x2={LX(z)} y2={LY(1)} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" />
          )}
          <text x={LX(z)} y={LY(1) - 12} textAnchor="middle" fontSize={12} fill={C.ink}>
            z = {fr(z, 1)}
          </text>

          {/* flèche */}
          <line x1={420} y1={170} x2={500} y2={170} stroke={C.green} strokeWidth={2} markerEnd="url(#arr-green)" />
          <text x={460} y={160} textAnchor="middle" fontSize={13} fill={C.green}>
            proj, ÷ w
          </text>

          {/* droite */}
          <text x={660} y={22} textAnchor="middle" fontSize={13} fill={C.weak}>
            espace projeté
          </text>
          <rect x={RX(0)} y={RY(1)} width={RX(1) - RX(0)} height={RY(-1) - RY(1)} fill={C.green} fillOpacity={0.07} stroke={C.green} strokeWidth={1.8} />
          <line x1={RX(0)} y1={RY(0)} x2={RX(1.07)} y2={RY(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
          <text x={RX(1.07)} y={RY(0) + 18} textAnchor="end" fontSize={13} fill={C.text}>
            z'
          </text>
          <text x={RX(0) + 8} y={RY(1) - 8} fontSize={13} fill={C.text}>
            y'
          </text>
          <text x={RX(0)} y={RY(-1) + 18} textAnchor="middle" fontSize={12} fill={C.weak}>
            0
          </text>
          <text x={RX(0.5)} y={RY(-1) + 18} textAnchor="middle" fontSize={12} fill={C.weak}>
            0,5
          </text>
          <line x1={RX(0.5)} y1={RY(-1)} x2={RX(0.5)} y2={RY(-1) + 5} stroke={C.weak} />
          <text x={RX(1)} y={RY(-1) + 18} textAnchor="middle" fontSize={12} fill={C.weak}>
            1
          </text>
          <text x={RX(0) - 8} y={RY(1) + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            1
          </text>
          <text x={RX(0) - 8} y={RY(-1) + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            −1
          </text>
          <polyline points={trace} fill="none" stroke={C.yellow} strokeOpacity={0.55} strokeDasharray="3 4" />
          {mode === "point" ? (
            <circle cx={RX(zz)} cy={RY(yp)} r={6} fill={C.yellow} />
          ) : (
            <line x1={RX(zz)} y1={RY(-yp)} x2={RX(zz)} y2={RY(yp)} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" />
          )}
        </svg>
        <p className="font-mono text-[13.5px]" style={{ color: C.ink }}>
          y' = 1/z = <span style={{ color: C.yellow }}>{fr(yp)}</span> · z' = 10/9 · (1 − 1/z) = <span style={{ color: C.green }}>{fr(zz)}</span>
          {Math.abs(z - 2) < 0.05 && <span style={{ color: C.weak }}> : déjà plus de 0,5 à z = 2</span>}
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------

export default function VertexShader() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Le vertex shader emmène chaque sommet de son espace local jusqu'à l'espace projeté : v_tmp = [proj][view][model] v, puis on divise
          par w.
        </Idea>
        <p>
          Un sommet a <strong>quatre coordonnées</strong> : x, y, z et w = 1. <strong>model</strong> pose l'objet dans la scène.{" "}
          <strong>view</strong> passe dans le repère de la caméra. La <strong>projection</strong> puis la <strong>division par w</strong>{" "}
          donnent un point de [−1, 1] × [−1, 1] × [0, 1].
        </p>
      </Section>

      <Section title="Le pipeline et les quatre espaces">
        <p>Le pipeline du cours a quatre étapes. Le vertex shader est la première.</p>
        <PipelineFig />
        <ChainFig />
      </Section>

      <Section title="model = T R S, en coordonnées homogènes">
        <p>
          Une translation v' = v + t ne s'écrit pas avec une matrice 3 × 3. En 4D, si : le déplacement va dans la{" "}
          <strong>dernière colonne</strong>, et w = 1 l'ajoute.
        </p>
        <TranslationFig />
        <p>
          model = T R S s'applique <strong>de droite à gauche</strong> : d'abord S (échelle), puis R (rotation), puis T (translation). Ainsi
          l'échelle et la rotation se font autour du centre de l'objet, avant de le déplacer.
        </p>
        <ModelFig />
        <Note title="L'exemple du cours">
          <p>
            S = échelle 2, R = 90° autour de z, T = +5 sur z. Le coin (0,5 ; −0,5 ; 0) va en (1 ; −1 ; 0), puis (1 ; 1 ; 0), puis (1 ; 1 ;
            5).
          </p>
        </Note>
      </Section>

      <Section title="view : se placer à la caméra">
        <p>
          On translate tout de <strong>−C</strong> pour amener la caméra à l'origine. Puis on applique la matrice dont les lignes sont{" "}
          <strong>R</strong> (droite), <strong>U</strong> (haut) et <strong>L</strong> (visée). Chaque ligne fait un produit scalaire : on lit
          le point sur les axes de la caméra.
        </p>
        <ViewFig />
        <p>
          Après view, la caméra est à l'origine et regarde vers les <strong>z positifs</strong>. Dans l'exemple suivi, elle y est déjà : R =
          (1, 0, 0), U = (0, 1, 0), L = (0, 0, 1), donc view = identité et v_cam = [1 ; 1 ; 5 ; 1].
        </p>
      </Section>

      <Section title="Projection perspective et division par w">
        <p>
          s = 1 / tan(fov/2) et a = largeur / hauteur. La dernière ligne (0 0 1 0) <strong>recopie la profondeur z dans w</strong>.
        </p>
        <FovFig />
        <p>Dernière étape du vertex shader : on divise tout le vecteur par w.</p>
        <DivisionFig />
        <table className="ftable">
          <thead>
            <tr>
              <th>sommet [1 ; 1 ; z ; 1]</th>
              <th>v_tmp = proj · v</th>
              <th>v' = v_tmp / w</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>z = 1</td>
              <td>[1 ; 1 ; 0 ; 1]</td>
              <td>(1 ; 1 ; 0)</td>
              <td>sur le near plane</td>
            </tr>
            <tr>
              <td>z = 5</td>
              <td>[1 ; 1 ; 4,44 ; 5]</td>
              <td>(0,2 ; 0,2 ; 0,89)</td>
              <td>le point suivi</td>
            </tr>
            <tr>
              <td>z = 10</td>
              <td>[1 ; 1 ; 10 ; 10]</td>
              <td>(0,1 ; 0,1 ; 1)</td>
              <td>sur le far plane</td>
            </tr>
          </tbody>
        </table>
        <FrustumFig />
      </Section>

      <Section title="Les formules à connaître">
        <Formula>v_tmp = [proj] [view] [model] v &nbsp;(w = 1) &nbsp;&nbsp;→&nbsp;&nbsp; v' = v_tmp / v_tmp.w</Formula>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Mat
            m={[
              ["s/a", 0, 0, 0],
              [0, "s", 0, 0],
              [0, 0, "f/(f−n)", "−f·n/(f−n)"],
              [0, 0, 1, 0],
            ]}
            hl={(r) => (r === 3 ? "green" : undefined)}
            label="proj du cours"
          />
          <div className="space-y-1 font-mono text-[13.5px]" style={{ color: C.ink }}>
            <p>s = 1 / tan(fov/2)</p>
            <p>a = largeur / hauteur</p>
            <p>n = near plane, f = far plane</p>
          </div>
        </div>
        <Formula>x' = s·x / (a·z) &nbsp;&nbsp; y' = s·y / z &nbsp;&nbsp; z' = 0 au near, 1 au far</Formula>
        <Code
          lang="python"
          mark={[10, 11]}
          code={`
import numpy as np

def perspective(fov, a, n, f):          # fov en radians
    s = 1 / np.tan(fov / 2)
    return np.array([[s / a, 0, 0, 0],
                     [0, s, 0, 0],
                     [0, 0, f / (f - n), -f * n / (f - n)],
                     [0, 0, 1, 0]])

v_tmp = proj @ view @ model @ v           # v = [x, y, z, 1], model = T @ R @ S
v_prime = v_tmp[:3] / v_tmp[3]            # division par w
`}
        />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Pipeline : vertex shader → rasterizer → fragment shader → depth buffer.</li>
          <li>Coordonnées homogènes : w = 1 pour un sommet ; la translation est dans la dernière colonne.</li>
          <li>model = T R S : S d'abord, puis R, puis T (de droite à gauche).</li>
          <li>view : translation de −C, puis matrice de lignes R, U, L ; ensuite la caméra est en O et regarde vers +z.</li>
          <li>proj : s = 1/tan(fov/2) ; la ligne 0 0 1 0 met z dans w.</li>
          <li>÷ w : x' = s·x/(a·z), y' = s·y/z ; le volume visible devient [−1, 1] × [−1, 1] × [0, 1].</li>
          <li>On divise par z : les objets lointains paraissent plus petits.</li>
        </Points>
        <Trap>
          <p>
            <strong>L'ordre des matrices compte.</strong> model = T R S : S est appliquée en premier. Avec S R T, la translation est faite
            d'abord et l'échelle 2 la double : z = 10 au lieu de 5.
          </p>
        </Trap>
        <Trap title="Piège : les conventions">
          <p>
            Dans ce cours, la caméra regarde vers <strong>+z</strong> et z' va de <strong>0</strong> (near) à <strong>1</strong> (far). Ce ne
            sont pas les conventions d'OpenGL. Et z' n'est pas linéaire : il dépasse déjà 0,5 à z = 2.
          </p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal
          question={
            <p>
              v_local = [0,5 ; −0,5 ; 0 ; 1]. S = échelle 2, R = 90° autour de z, T = +5 sur z, view = identité, fov = 90°, a = 1, n = 1, f =
              10. Donner v_scene, v_tmp et v'.
            </p>
          }
        >
          <p>S v = [1 ; −1 ; 0 ; 1], R → [1 ; 1 ; 0 ; 1], T → v_scene = [1 ; 1 ; 5 ; 1] = v_cam.</p>
          <p>s = 1, proj = lignes (1 0 0 0), (0 1 0 0), (0 0 10/9 −10/9), (0 0 1 0).</p>
          <p>v_tmp = [1 ; 1 ; 10/9 × 5 − 10/9 = 40/9 ≈ 4,44 ; 5].</p>
          <p>v' = v_tmp / 5 = (0,2 ; 0,2 ; ≈ 0,89).</p>
        </Reveal>
        <Reveal question={<p>Pourquoi le vertex shader travaille-t-il avec quatre coordonnées (x, y, z, w) ?</p>}>
          <p>Une translation v + t n'est pas un produit par une matrice 3 × 3.</p>
          <p>En 4D avec w = 1, elle devient un produit : le déplacement est dans la dernière colonne.</p>
          <p>Toutes les transformations s'enchaînent alors en produits de matrices 4 × 4.</p>
          <p>La projection range z dans w, et la division par w fait la perspective.</p>
        </Reveal>
        <Reveal question={<p>Le sommet (1, 1, z) est placé à z = 1, puis z = 10 (mêmes paramètres). Que deviennent x', y', z' ? Qu'en conclure ?</p>}>
          <p>z = 1 : v' = (1 ; 1 ; 0), le point est sur le near plane.</p>
          <p>z = 10 : v' = (0,1 ; 0,1 ; 1), le point est sur le far plane.</p>
          <p>x' et y' sont divisés par z : un objet 10 fois plus loin paraît 10 fois plus petit.</p>
          <p>z' passe de 0 à 1 et sert à départager les fragments dans le depth buffer.</p>
        </Reveal>
      </Section>
    </>
  );
}
